#!/usr/bin/env python3
"""
TREVENTA VENTURES - Backend API Testing Suite
Testing production hardening refactor - verifying all APIs still work correctly
"""

import requests
import json
import sys
from datetime import datetime
import time

# Configuration
BASE_URL = "https://private-capital-1.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@treventa.com"
ADMIN_PASSWORD = "admin123"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log_test(test_name, status, details=""):
    """Log test results with colors"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    if status == "PASS":
        print(f"{Colors.GREEN}✅ [{timestamp}] {test_name}: PASS{Colors.END}")
    elif status == "FAIL":
        print(f"{Colors.RED}❌ [{timestamp}] {test_name}: FAIL{Colors.END}")
        if details:
            print(f"   {Colors.RED}Details: {details}{Colors.END}")
    elif status == "WARN":
        print(f"{Colors.YELLOW}⚠️  [{timestamp}] {test_name}: WARNING{Colors.END}")
        if details:
            print(f"   {Colors.YELLOW}Details: {details}{Colors.END}")
    elif status == "INFO":
        print(f"{Colors.BLUE}ℹ️  [{timestamp}] {test_name}{Colors.END}")
        if details:
            print(f"   {Colors.BLUE}{details}{Colors.END}")

def make_request(method, url, headers=None, json_data=None, timeout=10):
    """Make HTTP request with error handling"""
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=timeout)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=json_data, timeout=timeout)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.Timeout:
        return None, "Request timeout"
    except requests.exceptions.ConnectionError:
        return None, "Connection error"
    except Exception as e:
        return None, f"Request error: {str(e)}"

def test_health_endpoints():
    """Test new health check endpoints from production hardening"""
    print(f"\n{Colors.BOLD}=== TESTING HEALTH ENDPOINTS (NEW) ==={Colors.END}")
    
    # Note: Root / and /health are served by frontend in this setup
    # The backend health endpoints are accessible via /api prefix
    
    # Test 1: API root endpoint
    log_test("API Root Check", "INFO", "Testing GET /api/")
    response = make_request("GET", f"{API_BASE}/")
    
    if response is None:
        log_test("API Root Check", "FAIL", "No response from server")
        return False
    
    if response.status_code == 200:
        try:
            data = response.json()
            expected_fields = ["message", "version"]
            if all(field in data for field in expected_fields):
                if data["message"] == "TREVENTA VENTURES API" and data["version"] == "1.0.0":
                    log_test("API Root Check", "PASS", f"Message: {data['message']}, Version: {data['version']}")
                else:
                    log_test("API Root Check", "FAIL", f"Unexpected message/version: {data}")
                    return False
            else:
                log_test("API Root Check", "FAIL", f"Missing expected fields. Got: {data}")
                return False
        except json.JSONDecodeError:
            log_test("API Root Check", "FAIL", "Invalid JSON response")
            return False
    else:
        log_test("API Root Check", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False
    
    # Test 2: API health check
    log_test("API Health Check", "INFO", "Testing GET /api/health")
    response = make_request("GET", f"{API_BASE}/health")
    
    if response is None:
        log_test("API Health Check", "FAIL", "No response from server")
        return False
    
    if response.status_code == 200:
        try:
            data = response.json()
            expected_fields = ["status", "database", "timestamp"]
            if all(field in data for field in expected_fields):
                log_test("API Health Check", "PASS", f"Status: {data['status']}, DB: {data['database']}")
            else:
                log_test("API Health Check", "FAIL", f"Missing expected fields. Got: {data}")
                return False
        except json.JSONDecodeError:
            log_test("API Health Check", "FAIL", "Invalid JSON response")
            return False
    else:
        log_test("API Health Check", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False
    
    # Test 3: Seed demo data (ensure data exists for testing)
    log_test("Demo Data Seeding", "INFO", "Testing POST /api/seed/demo-data")
    response = make_request("POST", f"{API_BASE}/seed/demo-data")
    
    if response is None:
        log_test("Demo Data Seeding", "FAIL", "No response from server")
        return False
    
    if response.status_code == 200:
        try:
            data = response.json()
            if "message" in data and "admin_email" in data:
                log_test("Demo Data Seeding", "PASS", f"Demo data ready: {data['admin_email']}")
            else:
                log_test("Demo Data Seeding", "FAIL", f"Unexpected response: {data}")
                return False
        except json.JSONDecodeError:
            log_test("Demo Data Seeding", "FAIL", "Invalid JSON response")
            return False
    else:
        log_test("Demo Data Seeding", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False
    
    return True

def test_auth_flow():
    """Test complete authentication flow"""
    print(f"\n{Colors.BOLD}=== TESTING AUTH FLOW (EXISTING) ==={Colors.END}")
    
    # Test 1: Login
    log_test("Auth Login", "INFO", f"Testing POST /api/auth/login with {ADMIN_EMAIL}")
    login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    response = make_request("POST", f"{API_BASE}/auth/login", json_data=login_data)
    
    if response is None:
        log_test("Auth Login", "FAIL", "No response from server")
        return None
    
    if response.status_code == 200:
        try:
            data = response.json()
            if "mocked_otp" in data and "requires_2fa" in data:
                otp = data["mocked_otp"]
                log_test("Auth Login", "PASS", f"Login successful, OTP: {otp}")
            else:
                log_test("Auth Login", "FAIL", f"Missing OTP in response: {data}")
                return None
        except json.JSONDecodeError:
            log_test("Auth Login", "FAIL", "Invalid JSON response")
            return None
    else:
        log_test("Auth Login", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return None
    
    # Test 2: Verify OTP
    log_test("Auth OTP Verification", "INFO", f"Testing POST /api/auth/verify-otp with OTP: {otp}")
    otp_data = {
        "email": ADMIN_EMAIL,
        "otp": otp
    }
    
    response = make_request("POST", f"{API_BASE}/auth/verify-otp", json_data=otp_data)
    
    if response is None:
        log_test("Auth OTP Verification", "FAIL", "No response from server")
        return None
    
    if response.status_code == 200:
        try:
            data = response.json()
            if "access_token" in data and "user" in data:
                token = data["access_token"]
                user = data["user"]
                log_test("Auth OTP Verification", "PASS", f"Token received, User: {user['full_name']} ({user['role']})")
            else:
                log_test("Auth OTP Verification", "FAIL", f"Missing token/user in response: {data}")
                return None
        except json.JSONDecodeError:
            log_test("Auth OTP Verification", "FAIL", "Invalid JSON response")
            return None
    else:
        log_test("Auth OTP Verification", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return None
    
    # Test 3: Get current user profile
    log_test("Auth Profile", "INFO", "Testing GET /api/auth/me with token")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = make_request("GET", f"{API_BASE}/auth/me", headers=headers)
    
    if response is None:
        log_test("Auth Profile", "FAIL", "No response from server")
        return None
    
    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ["id", "email", "full_name", "role", "is_approved", "kyc_status"]
            if all(field in data for field in required_fields):
                log_test("Auth Profile", "PASS", f"Profile: {data['full_name']} - {data['role']}")
            else:
                log_test("Auth Profile", "FAIL", f"Missing required fields in profile: {data}")
                return None
        except json.JSONDecodeError:
            log_test("Auth Profile", "FAIL", "Invalid JSON response")
            return None
    else:
        log_test("Auth Profile", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return None
    
    return token

def test_projects_api(token):
    """Test projects API endpoints"""
    print(f"\n{Colors.BOLD}=== TESTING PROJECTS API (EXISTING) ==={Colors.END}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: List projects
    log_test("Projects List", "INFO", "Testing GET /api/projects")
    response = make_request("GET", f"{API_BASE}/projects", headers=headers)
    
    if response is None:
        log_test("Projects List", "FAIL", "No response from server")
        return False
    
    if response.status_code == 200:
        try:
            projects = response.json()
            if isinstance(projects, list) and len(projects) > 0:
                log_test("Projects List", "PASS", f"Retrieved {len(projects)} projects")
                project_id = projects[0]["id"]  # Get first project ID for detail test
            else:
                log_test("Projects List", "WARN", "No projects found in response")
                return False
        except json.JSONDecodeError:
            log_test("Projects List", "FAIL", "Invalid JSON response")
            return False
    else:
        log_test("Projects List", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False
    
    # Test 2: Get project details
    log_test("Project Details", "INFO", f"Testing GET /api/projects/{project_id}")
    response = make_request("GET", f"{API_BASE}/projects/{project_id}", headers=headers)
    
    if response is None:
        log_test("Project Details", "FAIL", "No response from server")
        return False
    
    if response.status_code == 200:
        try:
            project = response.json()
            required_fields = ["id", "name", "sector", "description", "capital_required"]
            if all(field in project for field in required_fields):
                log_test("Project Details", "PASS", f"Project: {project['name']} - {project['sector']}")
            else:
                log_test("Project Details", "FAIL", f"Missing required fields in project: {project}")
                return False
        except json.JSONDecodeError:
            log_test("Project Details", "FAIL", "Invalid JSON response")
            return False
    else:
        log_test("Project Details", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False
    
    return True

def test_portfolio_dashboard(token):
    """Test portfolio and dashboard endpoints"""
    print(f"\n{Colors.BOLD}=== TESTING PORTFOLIO & DASHBOARD (EXISTING) ==={Colors.END}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Portfolio summary
    log_test("Portfolio Summary", "INFO", "Testing GET /api/portfolio/summary")
    response = make_request("GET", f"{API_BASE}/portfolio/summary", headers=headers)
    
    if response is None:
        log_test("Portfolio Summary", "FAIL", "No response from server")
        return False
    
    if response.status_code == 200:
        try:
            portfolio = response.json()
            required_fields = ["summary", "portfolio_items", "sector_allocation"]
            if all(field in portfolio for field in required_fields):
                summary = portfolio["summary"]
                log_test("Portfolio Summary", "PASS", f"Portfolio value: {summary.get('current_portfolio_valuation', 0)}")
            else:
                log_test("Portfolio Summary", "FAIL", f"Missing required fields in portfolio: {portfolio}")
                return False
        except json.JSONDecodeError:
            log_test("Portfolio Summary", "FAIL", "Invalid JSON response")
            return False
    else:
        log_test("Portfolio Summary", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False
    
    # Test 2: Dashboard data
    log_test("Dashboard Data", "INFO", "Testing GET /api/dashboard/investor")
    response = make_request("GET", f"{API_BASE}/dashboard/investor", headers=headers)
    
    if response is None:
        log_test("Dashboard Data", "FAIL", "No response from server")
        return False
    
    if response.status_code == 200:
        try:
            dashboard = response.json()
            required_fields = ["summary", "sector_allocation", "recent_activity", "vote_notices", "portfolio_items"]
            if all(field in dashboard for field in required_fields):
                log_test("Dashboard Data", "PASS", f"Dashboard loaded with {len(dashboard['portfolio_items'])} portfolio items")
            else:
                log_test("Dashboard Data", "FAIL", f"Missing required fields in dashboard: {dashboard}")
                return False
        except json.JSONDecodeError:
            log_test("Dashboard Data", "FAIL", "Invalid JSON response")
            return False
    else:
        log_test("Dashboard Data", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False
    
    return True

def test_additional_endpoints(token):
    """Test additional critical endpoints to ensure no regression"""
    print(f"\n{Colors.BOLD}=== TESTING ADDITIONAL ENDPOINTS ==={Colors.END}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test KYC endpoints
    log_test("KYC Documents", "INFO", "Testing GET /api/kyc/my-documents")
    response = make_request("GET", f"{API_BASE}/kyc/my-documents", headers=headers)
    
    if response is None:
        log_test("KYC Documents", "FAIL", "No response from server")
        return False
    
    if response.status_code == 200:
        try:
            documents = response.json()
            log_test("KYC Documents", "PASS", f"Retrieved {len(documents)} KYC documents")
        except json.JSONDecodeError:
            log_test("KYC Documents", "FAIL", "Invalid JSON response")
            return False
    else:
        log_test("KYC Documents", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False
    
    # Test participations
    log_test("My Participations", "INFO", "Testing GET /api/participations/my")
    response = make_request("GET", f"{API_BASE}/participations/my", headers=headers)
    
    if response is None:
        log_test("My Participations", "FAIL", "No response from server")
        return False
    
    if response.status_code == 200:
        try:
            participations = response.json()
            log_test("My Participations", "PASS", f"Retrieved {len(participations)} participations")
        except json.JSONDecodeError:
            log_test("My Participations", "FAIL", "Invalid JSON response")
            return False
    else:
        log_test("My Participations", "FAIL", f"HTTP {response.status_code}: {response.text}")
        return False
    
    return True

def main():
    """Main test execution"""
    print(f"{Colors.BOLD}{'='*60}")
    print("TREVENTA VENTURES - BACKEND API TESTING")
    print("Production Hardening Verification")
    print(f"{'='*60}{Colors.END}")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Credentials: {ADMIN_EMAIL}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Track test results
    test_results = {
        "health_endpoints": False,
        "auth_flow": False,
        "projects_api": False,
        "portfolio_dashboard": False,
        "additional_endpoints": False
    }
    
    # Test 1: Health endpoints (NEW)
    test_results["health_endpoints"] = test_health_endpoints()
    
    # Test 2: Authentication flow (EXISTING)
    token = test_auth_flow()
    if token:
        test_results["auth_flow"] = True
        
        # Test 3: Projects API (EXISTING)
        test_results["projects_api"] = test_projects_api(token)
        
        # Test 4: Portfolio & Dashboard (EXISTING)
        test_results["portfolio_dashboard"] = test_portfolio_dashboard(token)
        
        # Test 5: Additional endpoints
        test_results["additional_endpoints"] = test_additional_endpoints(token)
    
    # Summary
    print(f"\n{Colors.BOLD}=== TEST SUMMARY ==={Colors.END}")
    total_tests = len(test_results)
    passed_tests = sum(test_results.values())
    
    for test_name, result in test_results.items():
        status = "PASS" if result else "FAIL"
        log_test(test_name.replace("_", " ").title(), status)
    
    print(f"\n{Colors.BOLD}Overall Result: {passed_tests}/{total_tests} tests passed{Colors.END}")
    
    if passed_tests == total_tests:
        print(f"{Colors.GREEN}{Colors.BOLD}✅ ALL TESTS PASSED - Production hardening successful!{Colors.END}")
        return 0
    else:
        print(f"{Colors.RED}{Colors.BOLD}❌ SOME TESTS FAILED - Issues detected after production hardening{Colors.END}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)