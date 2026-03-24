from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import base64
import random
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'treventa_db')]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="TREVENTA VENTURES API")
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserRole:
    SUPER_ADMIN = "super_admin"
    FINANCE_ADMIN = "finance_admin"
    PROJECT_MANAGER = "project_manager"
    INVESTOR = "investor"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: str = UserRole.INVESTOR

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    invite_code: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    is_approved: bool
    kyc_status: str
    nda_accepted: bool
    risk_acknowledged: bool
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    requires_2fa: bool = False

class InviteCreate(BaseModel):
    email: EmailStr
    role: str = UserRole.INVESTOR

class KYCDocument(BaseModel):
    document_type: str  # pan, id_proof, address_proof
    document_data: str  # base64 encoded
    file_name: str

class BankDetails(BaseModel):
    bank_name: str
    account_number: str
    ifsc_code: str
    account_holder_name: str

class ProjectCreate(BaseModel):
    name: str
    sector: str
    description: str
    business_model: str
    capital_required: float
    minimum_participation: float
    timeline: str
    risk_level: str  # low, medium, high
    status: str = "open"  # open, closed, allocated
    overview: Optional[str] = None
    capital_structure: Optional[str] = None
    risk_disclosure: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    business_model: Optional[str] = None
    capital_required: Optional[float] = None
    minimum_participation: Optional[float] = None
    timeline: Optional[str] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None
    overview: Optional[str] = None
    capital_structure: Optional[str] = None
    risk_disclosure: Optional[str] = None

class CapTableEntry(BaseModel):
    project_id: str
    investor_id: str
    invested_amount: float
    equity_percentage: float

class FinancialLedgerEntry(BaseModel):
    project_id: str
    revenue: float = 0
    operating_expenses: float = 0
    net_profit: float = 0
    ebitda: float = 0
    cash_reserves: float = 0
    liabilities: float = 0
    asset_value: float = 0
    valuation: float = 0
    period: str  # e.g., "2025-01", "Q1-2025"

class ParticipationRequest(BaseModel):
    project_id: str
    amount: float
    notes: Optional[str] = None

class DistributionCreate(BaseModel):
    project_id: str
    total_amount: float
    distribution_type: str  # profit, exit, dividend
    notes: Optional[str] = None

class VoteCreate(BaseModel):
    project_id: str
    resolution_title: str
    resolution_description: str
    voting_deadline: datetime
    approval_threshold: float = 51.0  # percentage

class CastVote(BaseModel):
    vote_id: str
    choice: str  # yes, no, abstain

class DataRoomDocument(BaseModel):
    project_id: str
    document_name: str
    document_type: str
    document_data: str  # base64
    version: int = 1

class RequestInvite(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    message: Optional[str] = None

# ==================== UTILITY FUNCTIONS ====================

def generate_otp():
    """Generate 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def generate_invite_code():
    """Generate unique invite code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_super_admin(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user

async def log_audit(action: str, user_id: str, resource_type: str, resource_id: str, details: dict = None):
    """Create immutable audit log entry"""
    audit_entry = {
        "id": str(uuid.uuid4()),
        "action": action,
        "user_id": user_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details or {},
        "timestamp": datetime.utcnow(),
        "ip_address": "system"
    }
    await db.audit_logs.insert_one(audit_entry)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/request-invite")
async def request_invite(request: RequestInvite):
    """Public endpoint to request an invite"""
    existing = await db.invite_requests.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Invite request already submitted")
    
    invite_request = {
        "id": str(uuid.uuid4()),
        "email": request.email,
        "full_name": request.full_name,
        "phone": request.phone,
        "message": request.message,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    await db.invite_requests.insert_one(invite_request)
    return {"message": "Invite request submitted successfully"}

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    """Register with invite code"""
    # Validate invite code
    invite = await db.invites.find_one({"code": user_data.invite_code, "used": False})
    if not invite:
        raise HTTPException(status_code=400, detail="Invalid or expired invite code")
    
    # Check email matches invite
    if invite.get("email") and invite["email"].lower() != user_data.email.lower():
        raise HTTPException(status_code=400, detail="Email does not match invitation")
    
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": invite.get("role", UserRole.INVESTOR),
        "is_approved": False,
        "is_active": True,
        "kyc_status": "pending",
        "nda_accepted": False,
        "risk_acknowledged": False,
        "bank_details": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user)
    
    # Mark invite as used
    await db.invites.update_one({"code": user_data.invite_code}, {"$set": {"used": True, "used_by": user_id}})
    
    await log_audit("user_registered", user_id, "user", user_id, {"email": user_data.email})
    
    return {"message": "Registration successful. Please wait for admin approval."}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login and get OTP sent (mocked)"""
    user = await db.users.find_one({"email": credentials.email.lower()})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # Generate and store OTP (MOCKED - in production send via email)
    otp = generate_otp()
    await db.otp_codes.delete_many({"user_id": user["id"]})
    await db.otp_codes.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "otp": otp,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    })
    
    # MOCKED: Return OTP in response (remove in production)
    return {
        "message": "OTP sent to your email",
        "requires_2fa": True,
        "email": user["email"],
        "mocked_otp": otp  # REMOVE IN PRODUCTION
    }

@api_router.post("/auth/verify-otp", response_model=TokenResponse)
async def verify_otp(data: OTPVerify):
    """Verify OTP and get access token"""
    user = await db.users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email")
    
    otp_record = await db.otp_codes.find_one({
        "user_id": user["id"],
        "otp": data.otp,
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if not otp_record:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    
    # Delete used OTP
    await db.otp_codes.delete_one({"id": otp_record["id"]})
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"], "role": user["role"]})
    
    await log_audit("user_login", user["id"], "user", user["id"], {"method": "2fa"})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            phone=user.get("phone"),
            role=user["role"],
            is_approved=user.get("is_approved", False),
            kyc_status=user.get("kyc_status", "pending"),
            nda_accepted=user.get("nda_accepted", False),
            risk_acknowledged=user.get("risk_acknowledged", False),
            created_at=user["created_at"]
        ),
        requires_2fa=False
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        phone=user.get("phone"),
        role=user["role"],
        is_approved=user.get("is_approved", False),
        kyc_status=user.get("kyc_status", "pending"),
        nda_accepted=user.get("nda_accepted", False),
        risk_acknowledged=user.get("risk_acknowledged", False),
        created_at=user["created_at"]
    )

# ==================== ADMIN: USER MANAGEMENT ====================

@api_router.post("/admin/invites", response_model=dict)
async def create_invite(invite: InviteCreate, admin: dict = Depends(require_admin)):
    """Create invitation for new user"""
    code = generate_invite_code()
    invite_doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "email": invite.email.lower(),
        "role": invite.role,
        "created_by": admin["id"],
        "used": False,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=7)
    }
    await db.invites.insert_one(invite_doc)
    await log_audit("invite_created", admin["id"], "invite", invite_doc["id"], {"email": invite.email})
    return {"code": code, "email": invite.email}

@api_router.get("/admin/users")
async def list_users(admin: dict = Depends(require_admin)):
    """List all users"""
    users = await db.users.find().to_list(1000)
    return [{
        "id": u["id"],
        "email": u["email"],
        "full_name": u["full_name"],
        "role": u["role"],
        "is_approved": u.get("is_approved", False),
        "kyc_status": u.get("kyc_status", "pending"),
        "created_at": u["created_at"]
    } for u in users]

@api_router.post("/admin/users/{user_id}/approve")
async def approve_user(user_id: str, admin: dict = Depends(require_admin)):
    """Approve user registration"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_approved": True, "updated_at": datetime.utcnow()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_audit("user_approved", admin["id"], "user", user_id, {})
    return {"message": "User approved successfully"}

@api_router.get("/admin/invite-requests")
async def list_invite_requests(admin: dict = Depends(require_admin)):
    """List pending invite requests"""
    requests = await db.invite_requests.find({"status": "pending"}).to_list(100)
    return requests

# ==================== KYC ROUTES ====================

@api_router.post("/kyc/upload-document")
async def upload_kyc_document(document: KYCDocument, user: dict = Depends(get_current_user)):
    """Upload KYC document"""
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "document_type": document.document_type,
        "document_data": document.document_data,
        "file_name": document.file_name,
        "status": "pending",
        "uploaded_at": datetime.utcnow()
    }
    await db.kyc_documents.insert_one(doc)
    await log_audit("kyc_document_uploaded", user["id"], "kyc_document", doc["id"], {"type": document.document_type})
    return {"message": "Document uploaded successfully", "document_id": doc["id"]}

@api_router.get("/kyc/my-documents")
async def get_my_kyc_documents(user: dict = Depends(get_current_user)):
    """Get user's KYC documents"""
    docs = await db.kyc_documents.find({"user_id": user["id"]}).to_list(100)
    return [{
        "id": d["id"],
        "document_type": d["document_type"],
        "file_name": d["file_name"],
        "status": d["status"],
        "uploaded_at": d["uploaded_at"]
    } for d in docs]

@api_router.post("/kyc/bank-details")
async def update_bank_details(details: BankDetails, user: dict = Depends(get_current_user)):
    """Update bank details (encrypted storage in production)"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"bank_details": details.dict(), "updated_at": datetime.utcnow()}}
    )
    await log_audit("bank_details_updated", user["id"], "user", user["id"], {})
    return {"message": "Bank details updated successfully"}

@api_router.post("/kyc/accept-nda")
async def accept_nda(user: dict = Depends(get_current_user)):
    """Accept NDA"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"nda_accepted": True, "nda_accepted_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
    )
    await log_audit("nda_accepted", user["id"], "user", user["id"], {})
    return {"message": "NDA accepted successfully"}

@api_router.post("/kyc/acknowledge-risk")
async def acknowledge_risk(user: dict = Depends(get_current_user)):
    """Acknowledge risk disclaimer"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"risk_acknowledged": True, "risk_acknowledged_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
    )
    await log_audit("risk_acknowledged", user["id"], "user", user["id"], {})
    return {"message": "Risk acknowledgment recorded"}

@api_router.post("/admin/kyc/{document_id}/approve")
async def approve_kyc_document(document_id: str, admin: dict = Depends(require_admin)):
    """Approve KYC document"""
    result = await db.kyc_documents.update_one(
        {"id": document_id},
        {"$set": {"status": "approved", "approved_by": admin["id"], "approved_at": datetime.utcnow()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if all required documents are approved
    doc = await db.kyc_documents.find_one({"id": document_id})
    user_docs = await db.kyc_documents.find({"user_id": doc["user_id"]}).to_list(100)
    approved_types = {d["document_type"] for d in user_docs if d["status"] == "approved"}
    required_types = {"pan", "id_proof", "address_proof"}
    
    if required_types.issubset(approved_types):
        await db.users.update_one(
            {"id": doc["user_id"]},
            {"$set": {"kyc_status": "approved", "updated_at": datetime.utcnow()}}
        )
    
    await log_audit("kyc_document_approved", admin["id"], "kyc_document", document_id, {})
    return {"message": "Document approved"}

# ==================== PROJECT ROUTES ====================

@api_router.post("/projects", response_model=dict)
async def create_project(project: ProjectCreate, admin: dict = Depends(require_admin)):
    """Create new venture/project"""
    project_id = str(uuid.uuid4())
    project_doc = {
        "id": project_id,
        **project.dict(),
        "total_raised": 0,
        "investor_count": 0,
        "created_by": admin["id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db.projects.insert_one(project_doc)
    
    # Initialize cap table
    await db.cap_tables.insert_one({
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "total_authorized_capital": project.capital_required,
        "issued_capital": 0,
        "entries": [],
        "created_at": datetime.utcnow()
    })
    
    await log_audit("project_created", admin["id"], "project", project_id, {"name": project.name})
    return {"message": "Project created successfully", "project_id": project_id}

@api_router.get("/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    """List all ventures"""
    projects = await db.projects.find().to_list(100)
    return [{
        "id": p["id"],
        "name": p["name"],
        "sector": p["sector"],
        "description": p["description"],
        "capital_required": p["capital_required"],
        "minimum_participation": p["minimum_participation"],
        "timeline": p["timeline"],
        "risk_level": p["risk_level"],
        "status": p["status"],
        "total_raised": p.get("total_raised", 0),
        "investor_count": p.get("investor_count", 0)
    } for p in projects]

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    """Get venture details"""
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Remove MongoDB _id field
    if "_id" in project:
        del project["_id"]
    
    # Get latest financial data
    financial = await db.financial_ledger.find_one(
        {"project_id": project_id},
        sort=[("created_at", -1)]
    )
    
    if financial and "_id" in financial:
        del financial["_id"]
    
    # Get cap table summary
    cap_table = await db.cap_tables.find_one({"project_id": project_id})
    
    if cap_table and "_id" in cap_table:
        del cap_table["_id"]
    
    return {
        **project,
        "financial_snapshot": financial,
        "cap_table_summary": {
            "total_authorized": cap_table.get("total_authorized_capital", 0) if cap_table else 0,
            "issued_capital": cap_table.get("issued_capital", 0) if cap_table else 0,
            "investor_count": len(cap_table.get("entries", [])) if cap_table else 0
        } if cap_table else None
    }

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, project: ProjectUpdate, admin: dict = Depends(require_admin)):
    """Update venture"""
    update_data = {k: v for k, v in project.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.projects.update_one({"id": project_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await log_audit("project_updated", admin["id"], "project", project_id, update_data)
    return {"message": "Project updated successfully"}

# ==================== PARTICIPATION ROUTES ====================

@api_router.post("/participations/request")
async def request_participation(request: ParticipationRequest, user: dict = Depends(get_current_user)):
    """Request to participate in a venture"""
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="Your account must be approved first")
    
    if not user.get("nda_accepted") or not user.get("risk_acknowledged"):
        raise HTTPException(status_code=403, detail="Please complete onboarding requirements")
    
    project = await db.projects.find_one({"id": request.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project["status"] != "open":
        raise HTTPException(status_code=400, detail="Project is not open for participation")
    
    if request.amount < project["minimum_participation"]:
        raise HTTPException(status_code=400, detail=f"Minimum participation is {project['minimum_participation']}")
    
    participation = {
        "id": str(uuid.uuid4()),
        "project_id": request.project_id,
        "investor_id": user["id"],
        "investor_name": user["full_name"],
        "amount": request.amount,
        "notes": request.notes,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    await db.participations.insert_one(participation)
    await log_audit("participation_requested", user["id"], "participation", participation["id"], {"project_id": request.project_id, "amount": request.amount})
    
    return {"message": "Participation request submitted", "participation_id": participation["id"]}

@api_router.get("/participations/my")
async def get_my_participations(user: dict = Depends(get_current_user)):
    """Get user's participation requests"""
    participations = await db.participations.find({"investor_id": user["id"]}).to_list(100)
    
    # Clean MongoDB _id fields
    for p in participations:
        if "_id" in p:
            del p["_id"]
    
    return participations

@api_router.post("/admin/participations/{participation_id}/approve")
async def approve_participation(participation_id: str, admin: dict = Depends(require_admin)):
    """Approve participation request and update cap table"""
    participation = await db.participations.find_one({"id": participation_id})
    if not participation:
        raise HTTPException(status_code=404, detail="Participation not found")
    
    if participation["status"] != "pending":
        raise HTTPException(status_code=400, detail="Participation already processed")
    
    # Update participation status
    await db.participations.update_one(
        {"id": participation_id},
        {"$set": {"status": "approved", "approved_by": admin["id"], "approved_at": datetime.utcnow()}}
    )
    
    # Update cap table
    cap_table = await db.cap_tables.find_one({"project_id": participation["project_id"]})
    if cap_table:
        new_issued = cap_table.get("issued_capital", 0) + participation["amount"]
        equity_pct = (participation["amount"] / cap_table["total_authorized_capital"]) * 100
        
        entry = {
            "investor_id": participation["investor_id"],
            "investor_name": participation["investor_name"],
            "invested_amount": participation["amount"],
            "equity_percentage": equity_pct,
            "entry_date": datetime.utcnow()
        }
        
        await db.cap_tables.update_one(
            {"project_id": participation["project_id"]},
            {
                "$set": {"issued_capital": new_issued, "updated_at": datetime.utcnow()},
                "$push": {"entries": entry}
            }
        )
        
        # Recalculate all equity percentages
        updated_cap = await db.cap_tables.find_one({"project_id": participation["project_id"]})
        if updated_cap and updated_cap.get("entries"):
            for i, e in enumerate(updated_cap["entries"]):
                e["equity_percentage"] = (e["invested_amount"] / new_issued) * 100
            await db.cap_tables.update_one(
                {"project_id": participation["project_id"]},
                {"$set": {"entries": updated_cap["entries"]}}
            )
    
    # Update project stats
    await db.projects.update_one(
        {"id": participation["project_id"]},
        {
            "$inc": {"total_raised": participation["amount"], "investor_count": 1},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    await log_audit("participation_approved", admin["id"], "participation", participation_id, {"amount": participation["amount"]})
    return {"message": "Participation approved and cap table updated"}

@api_router.get("/admin/participations")
async def list_participations(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    """List all participation requests"""
    query = {}
    if status:
        query["status"] = status
    participations = await db.participations.find(query).to_list(500)
    return participations

# ==================== FINANCIAL LEDGER ROUTES ====================

@api_router.post("/admin/projects/{project_id}/financials")
async def update_financials(project_id: str, entry: FinancialLedgerEntry, admin: dict = Depends(require_admin)):
    """Update project financial data"""
    financial = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        **entry.dict(),
        "created_by": admin["id"],
        "created_at": datetime.utcnow()
    }
    await db.financial_ledger.insert_one(financial)
    await log_audit("financials_updated", admin["id"], "financial_ledger", financial["id"], {"project_id": project_id})
    return {"message": "Financial data recorded", "entry_id": financial["id"]}

@api_router.get("/projects/{project_id}/financials")
async def get_project_financials(project_id: str, user: dict = Depends(get_current_user)):
    """Get project financial history"""
    financials = await db.financial_ledger.find({"project_id": project_id}).sort("created_at", -1).to_list(100)
    return financials

# ==================== CAP TABLE ROUTES ====================

@api_router.get("/projects/{project_id}/cap-table")
async def get_cap_table(project_id: str, user: dict = Depends(get_current_user)):
    """Get project cap table"""
    cap_table = await db.cap_tables.find_one({"project_id": project_id})
    if not cap_table:
        raise HTTPException(status_code=404, detail="Cap table not found")
    return cap_table

# ==================== DISTRIBUTION ROUTES ====================

@api_router.post("/admin/distributions")
async def create_distribution(dist: DistributionCreate, admin: dict = Depends(require_admin)):
    """Create profit distribution"""
    cap_table = await db.cap_tables.find_one({"project_id": dist.project_id})
    if not cap_table:
        raise HTTPException(status_code=404, detail="Project cap table not found")
    
    distribution_id = str(uuid.uuid4())
    
    # Calculate per-investor distributions based on equity
    investor_distributions = []
    for entry in cap_table.get("entries", []):
        amount = (entry["equity_percentage"] / 100) * dist.total_amount
        investor_distributions.append({
            "investor_id": entry["investor_id"],
            "investor_name": entry["investor_name"],
            "equity_percentage": entry["equity_percentage"],
            "amount": round(amount, 2),
            "status": "pending"
        })
    
    distribution = {
        "id": distribution_id,
        "project_id": dist.project_id,
        "total_amount": dist.total_amount,
        "distribution_type": dist.distribution_type,
        "notes": dist.notes,
        "investor_distributions": investor_distributions,
        "created_by": admin["id"],
        "created_at": datetime.utcnow()
    }
    await db.distributions.insert_one(distribution)
    await log_audit("distribution_created", admin["id"], "distribution", distribution_id, {"total_amount": dist.total_amount})
    
    return {"message": "Distribution created", "distribution_id": distribution_id, "breakdown": investor_distributions}

@api_router.get("/distributions/my")
async def get_my_distributions(user: dict = Depends(get_current_user)):
    """Get user's distributions"""
    distributions = await db.distributions.find({
        "investor_distributions.investor_id": user["id"]
    }).to_list(100)
    
    result = []
    for d in distributions:
        user_dist = next((i for i in d["investor_distributions"] if i["investor_id"] == user["id"]), None)
        if user_dist:
            project = await db.projects.find_one({"id": d["project_id"]})
            result.append({
                "distribution_id": d["id"],
                "project_id": d["project_id"],
                "project_name": project["name"] if project else "Unknown",
                "distribution_type": d["distribution_type"],
                "amount": user_dist["amount"],
                "status": user_dist["status"],
                "created_at": d["created_at"]
            })
    return result

# ==================== GOVERNANCE VOTING ROUTES ====================

@api_router.post("/admin/votes")
async def create_vote(vote: VoteCreate, admin: dict = Depends(require_admin)):
    """Create governance vote"""
    vote_id = str(uuid.uuid4())
    vote_doc = {
        "id": vote_id,
        "project_id": vote.project_id,
        "resolution_title": vote.resolution_title,
        "resolution_description": vote.resolution_description,
        "voting_deadline": vote.voting_deadline,
        "approval_threshold": vote.approval_threshold,
        "votes": [],
        "status": "open",
        "created_by": admin["id"],
        "created_at": datetime.utcnow()
    }
    await db.votes.insert_one(vote_doc)
    await log_audit("vote_created", admin["id"], "vote", vote_id, {"title": vote.resolution_title})
    return {"message": "Vote created", "vote_id": vote_id}

@api_router.get("/projects/{project_id}/votes")
async def get_project_votes(project_id: str, user: dict = Depends(get_current_user)):
    """Get votes for a project"""
    votes = await db.votes.find({"project_id": project_id}).to_list(100)
    return [{
        "id": v["id"],
        "resolution_title": v["resolution_title"],
        "resolution_description": v["resolution_description"],
        "voting_deadline": v["voting_deadline"],
        "approval_threshold": v["approval_threshold"],
        "status": v["status"],
        "total_votes": len(v.get("votes", [])),
        "user_voted": any(vote["investor_id"] == user["id"] for vote in v.get("votes", []))
    } for v in votes]

@api_router.post("/votes/cast")
async def cast_vote(vote_data: CastVote, user: dict = Depends(get_current_user)):
    """Cast a vote"""
    vote = await db.votes.find_one({"id": vote_data.vote_id})
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")
    
    if vote["status"] != "open":
        raise HTTPException(status_code=400, detail="Voting is closed")
    
    if datetime.utcnow() > vote["voting_deadline"]:
        raise HTTPException(status_code=400, detail="Voting deadline has passed")
    
    # Check if already voted
    if any(v["investor_id"] == user["id"] for v in vote.get("votes", [])):
        raise HTTPException(status_code=400, detail="Already voted")
    
    # Get user's equity in this project
    cap_table = await db.cap_tables.find_one({"project_id": vote["project_id"]})
    user_equity = 0
    if cap_table:
        entry = next((e for e in cap_table.get("entries", []) if e["investor_id"] == user["id"]), None)
        if entry:
            user_equity = entry["equity_percentage"]
    
    vote_entry = {
        "investor_id": user["id"],
        "investor_name": user["full_name"],
        "choice": vote_data.choice,
        "equity_weight": user_equity,
        "voted_at": datetime.utcnow()
    }
    
    await db.votes.update_one(
        {"id": vote_data.vote_id},
        {"$push": {"votes": vote_entry}}
    )
    
    await log_audit("vote_cast", user["id"], "vote", vote_data.vote_id, {"choice": vote_data.choice})
    return {"message": "Vote recorded successfully"}

# ==================== DATA ROOM ROUTES ====================

@api_router.post("/admin/data-room/upload")
async def upload_data_room_document(doc: DataRoomDocument, admin: dict = Depends(require_admin)):
    """Upload document to data room"""
    doc_id = str(uuid.uuid4())
    document = {
        "id": doc_id,
        "project_id": doc.project_id,
        "document_name": doc.document_name,
        "document_type": doc.document_type,
        "document_data": doc.document_data,
        "version": doc.version,
        "uploaded_by": admin["id"],
        "uploaded_at": datetime.utcnow()
    }
    await db.data_room_documents.insert_one(document)
    await log_audit("data_room_upload", admin["id"], "data_room", doc_id, {"name": doc.document_name})
    return {"message": "Document uploaded", "document_id": doc_id}

@api_router.get("/projects/{project_id}/data-room")
async def get_data_room_documents(project_id: str, user: dict = Depends(get_current_user)):
    """Get data room documents (requires NDA)"""
    if not user.get("nda_accepted"):
        raise HTTPException(status_code=403, detail="NDA acceptance required to access data room")
    
    documents = await db.data_room_documents.find({"project_id": project_id}).to_list(100)
    
    # Log access
    for doc in documents:
        await db.document_access_logs.insert_one({
            "id": str(uuid.uuid4()),
            "document_id": doc["id"],
            "user_id": user["id"],
            "accessed_at": datetime.utcnow()
        })
    
    return [{
        "id": d["id"],
        "document_name": d["document_name"],
        "document_type": d["document_type"],
        "version": d["version"],
        "uploaded_at": d["uploaded_at"]
    } for d in documents]

@api_router.get("/data-room/document/{document_id}")
async def download_data_room_document(document_id: str, user: dict = Depends(get_current_user)):
    """Download data room document"""
    if not user.get("nda_accepted"):
        raise HTTPException(status_code=403, detail="NDA acceptance required")
    
    document = await db.data_room_documents.find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Log access
    await db.document_access_logs.insert_one({
        "id": str(uuid.uuid4()),
        "document_id": document_id,
        "user_id": user["id"],
        "action": "download",
        "accessed_at": datetime.utcnow()
    })
    
    return document

# ==================== PORTFOLIO ROUTES ====================

@api_router.get("/portfolio/summary")
async def get_portfolio_summary(user: dict = Depends(get_current_user)):
    """Get investor's portfolio summary"""
    # Get all approved participations
    participations = await db.participations.find({
        "investor_id": user["id"],
        "status": "approved"
    }).to_list(100)
    
    total_deployed = 0
    current_valuation = 0
    realized_profit = 0
    portfolio_items = []
    
    for p in participations:
        project = await db.projects.find_one({"id": p["project_id"]})
        if not project:
            continue
        
        # Get cap table entry
        cap_table = await db.cap_tables.find_one({"project_id": p["project_id"]})
        user_entry = None
        if cap_table:
            user_entry = next((e for e in cap_table.get("entries", []) if e["investor_id"] == user["id"]), None)
        
        # Get latest financials
        financial = await db.financial_ledger.find_one(
            {"project_id": p["project_id"]},
            sort=[("created_at", -1)]
        )
        
        # Calculate current value based on valuation
        equity_pct = user_entry["equity_percentage"] if user_entry else 0
        project_valuation = financial.get("valuation", 0) if financial else 0
        current_value = (equity_pct / 100) * project_valuation if project_valuation > 0 else p["amount"]
        
        # Get distributions
        user_distributions = await db.distributions.find({
            "project_id": p["project_id"],
            "investor_distributions.investor_id": user["id"]
        }).to_list(100)
        
        dist_total = 0
        for d in user_distributions:
            user_dist = next((i for i in d["investor_distributions"] if i["investor_id"] == user["id"]), None)
            if user_dist:
                dist_total += user_dist["amount"]
        
        total_deployed += p["amount"]
        current_valuation += current_value
        realized_profit += dist_total
        
        portfolio_items.append({
            "project_id": p["project_id"],
            "project_name": project["name"],
            "sector": project["sector"],
            "invested_amount": p["amount"],
            "equity_percentage": equity_pct,
            "current_valuation": current_value,
            "unrealized_gain": current_value - p["amount"],
            "realized_profit": dist_total,
            "status": project["status"]
        })
    
    # Get sector allocation
    sector_allocation = {}
    for item in portfolio_items:
        sector = item["sector"]
        if sector in sector_allocation:
            sector_allocation[sector] += item["invested_amount"]
        else:
            sector_allocation[sector] = item["invested_amount"]
    
    return {
        "summary": {
            "total_capital_deployed": total_deployed,
            "current_portfolio_valuation": current_valuation,
            "net_gain_loss": current_valuation - total_deployed + realized_profit,
            "distributed_capital": realized_profit,
            "active_ventures": len([i for i in portfolio_items if i["status"] == "open"])
        },
        "portfolio_items": portfolio_items,
        "sector_allocation": [{"sector": k, "amount": v} for k, v in sector_allocation.items()]
    }

# ==================== REPORTS ROUTES ====================

@api_router.get("/reports/monthly-summary")
async def get_monthly_summary(user: dict = Depends(get_current_user)):
    """Get monthly summary report"""
    portfolio = await get_portfolio_summary(user)
    
    # Get recent activity
    recent_participations = await db.participations.find({
        "investor_id": user["id"]
    }).sort("created_at", -1).limit(5).to_list(5)
    
    recent_distributions = await db.distributions.find({
        "investor_distributions.investor_id": user["id"]
    }).sort("created_at", -1).limit(5).to_list(5)
    
    recent_votes = await db.votes.find({
        "votes.investor_id": user["id"]
    }).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "portfolio_summary": portfolio["summary"],
        "recent_participations": recent_participations,
        "recent_distributions": recent_distributions,
        "recent_votes": recent_votes,
        "generated_at": datetime.utcnow()
    }

# ==================== DASHBOARD DATA ====================

@api_router.get("/dashboard/investor")
async def get_investor_dashboard(user: dict = Depends(get_current_user)):
    """Get investor dashboard data"""
    portfolio = await get_portfolio_summary(user)
    
    # Recent activity
    recent_activity = []
    
    # Recent distributions
    distributions = await db.distributions.find({
        "investor_distributions.investor_id": user["id"]
    }).sort("created_at", -1).limit(5).to_list(5)
    
    for d in distributions:
        project = await db.projects.find_one({"id": d["project_id"]})
        user_dist = next((i for i in d["investor_distributions"] if i["investor_id"] == user["id"]), None)
        if user_dist:
            recent_activity.append({
                "type": "distribution",
                "title": f"Distribution from {project['name'] if project else 'Unknown'}",
                "amount": user_dist["amount"],
                "date": d["created_at"]
            })
    
    # Active votes
    open_votes = await db.votes.find({"status": "open"}).to_list(10)
    vote_notices = []
    for v in open_votes:
        project = await db.projects.find_one({"id": v["project_id"]})
        # Check if user has stake in this project
        cap_table = await db.cap_tables.find_one({"project_id": v["project_id"]})
        if cap_table:
            has_stake = any(e["investor_id"] == user["id"] for e in cap_table.get("entries", []))
            if has_stake:
                vote_notices.append({
                    "vote_id": v["id"],
                    "project_name": project["name"] if project else "Unknown",
                    "title": v["resolution_title"],
                    "deadline": v["voting_deadline"],
                    "has_voted": any(vote["investor_id"] == user["id"] for vote in v.get("votes", []))
                })
    
    return {
        "summary": portfolio["summary"],
        "sector_allocation": portfolio["sector_allocation"],
        "recent_activity": recent_activity,
        "vote_notices": vote_notices,
        "portfolio_items": portfolio["portfolio_items"][:5]  # Top 5
    }

# ==================== AUDIT LOGS ====================

@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    resource_type: Optional[str] = None,
    limit: int = 100,
    admin: dict = Depends(require_admin)
):
    """Get audit logs"""
    query = {}
    if resource_type:
        query["resource_type"] = resource_type
    
    logs = await db.audit_logs.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

# ==================== SEED DATA FOR DEMO ====================

@api_router.post("/seed/demo-data")
async def seed_demo_data():
    """Seed demo data for testing"""
    # Create super admin
    admin_id = str(uuid.uuid4())
    admin = {
        "id": admin_id,
        "email": "admin@treventa.com",
        "password_hash": hash_password("admin123"),
        "full_name": "Super Admin",
        "role": UserRole.SUPER_ADMIN,
        "is_approved": True,
        "is_active": True,
        "kyc_status": "approved",
        "nda_accepted": True,
        "risk_acknowledged": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    existing_admin = await db.users.find_one({"email": "admin@treventa.com"})
    if not existing_admin:
        await db.users.insert_one(admin)
    
    # Create invite code for demo investor
    invite_code = "DEMO2025"
    existing_invite = await db.invites.find_one({"code": invite_code})
    if not existing_invite:
        await db.invites.insert_one({
            "id": str(uuid.uuid4()),
            "code": invite_code,
            "email": None,
            "role": UserRole.INVESTOR,
            "created_by": admin_id,
            "used": False,
            "created_at": datetime.utcnow()
        })
    
    # Create sample projects
    sample_projects = [
        {
            "name": "TechVenture AI",
            "sector": "Technology",
            "description": "AI-powered enterprise software solutions",
            "business_model": "B2B SaaS with recurring revenue model",
            "capital_required": 5000000,
            "minimum_participation": 100000,
            "timeline": "36 months",
            "risk_level": "medium",
            "status": "open",
            "overview": "Leading AI software company targeting enterprise clients",
            "capital_structure": "60% equity, 40% convertible notes",
            "risk_disclosure": "Technology risk, market adoption risk"
        },
        {
            "name": "GreenEnergy Solutions",
            "sector": "Clean Energy",
            "description": "Renewable energy infrastructure projects",
            "business_model": "Power purchase agreements with utilities",
            "capital_required": 10000000,
            "minimum_participation": 250000,
            "timeline": "60 months",
            "risk_level": "low",
            "status": "open",
            "overview": "Solar and wind energy projects across multiple states",
            "capital_structure": "70% project finance, 30% equity",
            "risk_disclosure": "Regulatory risk, weather dependency"
        },
        {
            "name": "HealthTech Diagnostics",
            "sector": "Healthcare",
            "description": "Point-of-care diagnostic devices",
            "business_model": "Device sales and consumables",
            "capital_required": 3000000,
            "minimum_participation": 50000,
            "timeline": "24 months",
            "risk_level": "high",
            "status": "open",
            "overview": "FDA-cleared diagnostic devices for rapid testing",
            "capital_structure": "100% equity",
            "risk_disclosure": "Regulatory approval risk, clinical trial risk"
        }
    ]
    
    for proj in sample_projects:
        existing = await db.projects.find_one({"name": proj["name"]})
        if not existing:
            project_id = str(uuid.uuid4())
            await db.projects.insert_one({
                "id": project_id,
                **proj,
                "total_raised": 0,
                "investor_count": 0,
                "created_by": admin_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            # Initialize cap table
            await db.cap_tables.insert_one({
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "total_authorized_capital": proj["capital_required"],
                "issued_capital": 0,
                "entries": [],
                "created_at": datetime.utcnow()
            })
    
    return {
        "message": "Demo data seeded successfully",
        "admin_email": "admin@treventa.com",
        "admin_password": "admin123",
        "demo_invite_code": "DEMO2025"
    }

# ==================== ROOT & HEALTH ====================

@api_router.get("/")
async def root():
    return {"message": "TREVENTA VENTURES API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
