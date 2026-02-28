#!/usr/bin/env python3
"""
Backend API Testing Suite for TREVENTA VENTURES
Testing all critical backend endpoints including auth, projects, KYC, participations, etc.
"""

import requests
import json
import sys
import os
from typing import Dict, Any

# Backend URL (from frontend env)
BACKEND_URL = "https://private-capital-1.preview.emergentagent.com/api"

# Test data
TEST_CREDENTIALS = {
    "email": "admin@treventa.com",
    "password": "admin123"
}

DEMO_INVITE_CODE = "DEMO2025"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = {}
        
    def log_result(self, test_name: str, success: bool, message: str = "", details: Any = None):
        """Log test result"""
        self.test_results[test_name] = {
            "success": success,
            "message": message,
            "details": details
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"    {message}")
        if not success and details:
            print(f"    Details: {details}")
        print()
    
    def make_request(self, method: str, endpoint: str, data: dict = None, headers: dict = None) -> Dict[str, Any]:
        """Make API request with error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        req_headers = {"Content-Type": "application/json"}
        
        if self.auth_token:
            req_headers["Authorization"] = f"Bearer {self.auth_token}"
        
        if headers:
            req_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=req_headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=req_headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=req_headers)
            else:
                return {"error": f"Unsupported method: {method}"}
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": response.status_code < 400
            }
        except Exception as e:
            return {"error": str(e), "success": False}
    
    def test_health_check(self):
        """Test API health endpoint"""
        print("=== TESTING: API Health Check ===")
        
        result = self.make_request("GET", "/health")
        if result.get("success"):
            self.log_result("API Health Check", True, f"Status: {result['data'].get('status', 'unknown')}")
        else:
            self.log_result("API Health Check", False, "Health check failed", result.get("error"))
    
    def test_seed_demo_data(self):
        """Test seeding demo data"""
        print("=== TESTING: Seed Demo Data ===")
        
        result = self.make_request("POST", "/seed/demo-data")
        if result.get("success"):
            self.log_result("Seed Demo Data", True, "Demo data seeded successfully")
        else:
            self.log_result("Seed Demo Data", False, "Failed to seed demo data", result.get("error"))
    
    def test_authentication_flow(self):
        """Test complete authentication flow"""
        print("=== TESTING: Authentication Flow ===")
        
        # Step 1: Login to get OTP
        login_data = {
            "email": TEST_CREDENTIALS["email"],
            "password": TEST_CREDENTIALS["password"]
        }
        
        result = self.make_request("POST", "/auth/login", login_data)
        if not result.get("success"):
            self.log_result("Auth - Login", False, f"Login failed with status {result.get('status_code')}", result.get("data"))
            return False
        
        login_response = result["data"]
        if "mocked_otp" not in login_response:
            self.log_result("Auth - Login", False, "Mocked OTP not found in response", login_response)
            return False
        
        self.log_result("Auth - Login", True, f"Login successful, OTP: {login_response['mocked_otp']}")
        
        # Step 2: Verify OTP
        otp_data = {
            "email": TEST_CREDENTIALS["email"],
            "otp": login_response["mocked_otp"]
        }
        
        result = self.make_request("POST", "/auth/verify-otp", otp_data)
        if not result.get("success"):
            self.log_result("Auth - Verify OTP", False, f"OTP verification failed", result.get("data"))
            return False
        
        otp_response = result["data"]
        if "access_token" not in otp_response:
            self.log_result("Auth - Verify OTP", False, "Access token not found in response", otp_response)
            return False
        
        self.auth_token = otp_response["access_token"]
        self.log_result("Auth - Verify OTP", True, "OTP verified, JWT token received")
        
        # Step 3: Get current user profile
        result = self.make_request("GET", "/auth/me")
        if result.get("success"):
            user_data = result["data"]
            self.log_result("Auth - Get Profile", True, f"User: {user_data.get('full_name')} ({user_data.get('role')})")
            return True
        else:
            self.log_result("Auth - Get Profile", False, "Failed to get user profile", result.get("data"))
            return False
    
    def test_registration_flow(self):
        """Test registration with invite code"""
        print("=== TESTING: Registration Flow ===")
        
        registration_data = {
            "email": "test.investor@example.com",
            "password": "testpass123",
            "full_name": "Test Investor",
            "phone": "+1234567890",
            "invite_code": DEMO_INVITE_CODE
        }
        
        result = self.make_request("POST", "/auth/register", registration_data)
        if result.get("success"):
            self.log_result("Registration with Invite Code", True, "Registration successful")
        else:
            response = result.get("data", {})
            if result.get("status_code") == 400 and "already registered" in response.get("detail", ""):
                self.log_result("Registration with Invite Code", True, "User already exists (expected)")
            else:
                self.log_result("Registration with Invite Code", False, f"Registration failed", response)
    
    def test_projects_api(self):
        """Test projects/ventures API"""
        print("=== TESTING: Projects API ===")
        
        if not self.auth_token:
            self.log_result("Projects API", False, "No auth token available")
            return
        
        # Test list projects
        result = self.make_request("GET", "/projects")
        if not result.get("success"):
            self.log_result("Projects - List", False, "Failed to get projects list", result.get("data"))
            return
        
        projects = result["data"]
        if not isinstance(projects, list):
            self.log_result("Projects - List", False, "Projects response is not a list", projects)
            return
        
        self.log_result("Projects - List", True, f"Retrieved {len(projects)} projects")
        
        # Test get project details
        if projects:
            project_id = projects[0]["id"]
            result = self.make_request("GET", f"/projects/{project_id}")
            if result.get("success"):
                project_details = result["data"]
                self.log_result("Projects - Get Details", True, f"Project: {project_details.get('name')}")
            else:
                self.log_result("Projects - Get Details", False, "Failed to get project details", result.get("data"))
        else:
            self.log_result("Projects - Get Details", False, "No projects available for testing")
    
    def test_kyc_endpoints(self):
        """Test KYC related endpoints"""
        print("=== TESTING: KYC Endpoints ===")
        
        if not self.auth_token:
            self.log_result("KYC Endpoints", False, "No auth token available")
            return
        
        # Test accept NDA
        result = self.make_request("POST", "/kyc/accept-nda")
        if result.get("success"):
            self.log_result("KYC - Accept NDA", True, "NDA accepted successfully")
        else:
            self.log_result("KYC - Accept NDA", False, "Failed to accept NDA", result.get("data"))
        
        # Test acknowledge risk
        result = self.make_request("POST", "/kyc/acknowledge-risk")
        if result.get("success"):
            self.log_result("KYC - Acknowledge Risk", True, "Risk acknowledged successfully")
        else:
            self.log_result("KYC - Acknowledge Risk", False, "Failed to acknowledge risk", result.get("data"))
        
        # Test get my documents
        result = self.make_request("GET", "/kyc/my-documents")
        if result.get("success"):
            documents = result["data"]
            self.log_result("KYC - Get Documents", True, f"Retrieved {len(documents)} documents")
        else:
            self.log_result("KYC - Get Documents", False, "Failed to get KYC documents", result.get("data"))
    
    def test_participation_endpoints(self):
        """Test participation request endpoints"""
        print("=== TESTING: Participation Endpoints ===")
        
        if not self.auth_token:
            self.log_result("Participation Endpoints", False, "No auth token available")
            return
        
        # First get projects to find one to participate in
        projects_result = self.make_request("GET", "/projects")
        if not projects_result.get("success") or not projects_result["data"]:
            self.log_result("Participation - Request", False, "No projects available")
            return
        
        project_id = projects_result["data"][0]["id"]
        project_name = projects_result["data"][0]["name"]
        
        # Test participation request
        participation_data = {
            "project_id": project_id,
            "amount": 100000,
            "notes": "Test participation request"
        }
        
        result = self.make_request("POST", "/participations/request", participation_data)
        if result.get("success"):
            self.log_result("Participation - Request", True, f"Participation requested for {project_name}")
        else:
            response = result.get("data", {})
            if "approved first" in response.get("detail", ""):
                self.log_result("Participation - Request", True, "Account needs approval (expected for new users)")
            elif "onboarding requirements" in response.get("detail", ""):
                self.log_result("Participation - Request", True, "Onboarding required (expected)")
            else:
                self.log_result("Participation - Request", False, "Failed to request participation", response)
        
        # Test get my participations
        result = self.make_request("GET", "/participations/my")
        if result.get("success"):
            participations = result["data"]
            self.log_result("Participation - My Requests", True, f"Retrieved {len(participations)} participation requests")
        else:
            self.log_result("Participation - My Requests", False, "Failed to get participation requests", result.get("data"))
    
    def test_portfolio_endpoints(self):
        """Test portfolio and dashboard endpoints"""
        print("=== TESTING: Portfolio & Dashboard ===")
        
        if not self.auth_token:
            self.log_result("Portfolio Endpoints", False, "No auth token available")
            return
        
        # Test portfolio summary
        result = self.make_request("GET", "/portfolio/summary")
        if result.get("success"):
            portfolio = result["data"]
            summary = portfolio.get("summary", {})
            self.log_result("Portfolio - Summary", True, 
                          f"Portfolio value: ${summary.get('current_portfolio_valuation', 0):,.2f}")
        else:
            self.log_result("Portfolio - Summary", False, "Failed to get portfolio summary", result.get("data"))
        
        # Test investor dashboard
        result = self.make_request("GET", "/dashboard/investor")
        if result.get("success"):
            dashboard = result["data"]
            self.log_result("Dashboard - Investor", True, 
                          f"Dashboard loaded with {len(dashboard.get('portfolio_items', []))} items")
        else:
            self.log_result("Dashboard - Investor", False, "Failed to get dashboard data", result.get("data"))
    
    def test_governance_endpoints(self):
        """Test governance voting endpoints (basic read operations)"""
        print("=== TESTING: Governance Endpoints ===")
        
        if not self.auth_token:
            self.log_result("Governance Endpoints", False, "No auth token available")
            return
        
        # Get projects first
        projects_result = self.make_request("GET", "/projects")
        if projects_result.get("success") and projects_result["data"]:
            project_id = projects_result["data"][0]["id"]
            
            # Test get votes for project
            result = self.make_request("GET", f"/projects/{project_id}/votes")
            if result.get("success"):
                votes = result["data"]
                self.log_result("Governance - Get Votes", True, f"Retrieved {len(votes)} votes for project")
            else:
                self.log_result("Governance - Get Votes", False, "Failed to get votes", result.get("data"))
        else:
            self.log_result("Governance - Get Votes", False, "No projects available")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting TREVENTA VENTURES Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Basic tests
        self.test_health_check()
        self.test_seed_demo_data()
        
        # Authentication flow (critical)
        auth_success = self.test_authentication_flow()
        
        if auth_success:
            # All other tests require authentication
            self.test_registration_flow()
            self.test_projects_api()
            self.test_kyc_endpoints()
            self.test_participation_endpoints()
            self.test_portfolio_endpoints()
            self.test_governance_endpoints()
        else:
            print("❌ Authentication failed - skipping authenticated tests")
        
        # Summary
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results.values() if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for name, result in self.test_results.items():
                if not result["success"]:
                    print(f"  • {name}: {result['message']}")
        
        print("\n" + "=" * 60)
        return failed_tests == 0

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)