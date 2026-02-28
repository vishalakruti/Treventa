#!/usr/bin/env python3
"""
Final comprehensive test covering all critical endpoints from review request
"""

import requests
import json

BACKEND_URL = "https://private-capital-1.preview.emergentagent.com/api"

def get_auth_token():
    # Login
    login_response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": "admin@treventa.com",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        return None
    
    otp = login_response.json()["mocked_otp"]
    
    # Verify OTP
    otp_response = requests.post(f"{BACKEND_URL}/auth/verify-otp", json={
        "email": "admin@treventa.com",
        "otp": otp
    })
    
    if otp_response.status_code != 200:
        return None
    
    return otp_response.json()["access_token"]

def run_comprehensive_tests():
    print("🚀 FINAL COMPREHENSIVE BACKEND TEST")
    print("=" * 60)
    
    results = {}
    
    # 1. Authentication Flow (HIGH PRIORITY)
    print("1. Testing Authentication Flow...")
    
    # Login
    login_resp = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": "admin@treventa.com",
        "password": "admin123"
    })
    
    if login_resp.status_code == 200 and "mocked_otp" in login_resp.json():
        results["Auth - Login"] = "✅ PASS"
        otp = login_resp.json()["mocked_otp"]
        
        # Verify OTP
        otp_resp = requests.post(f"{BACKEND_URL}/auth/verify-otp", json={
            "email": "admin@treventa.com",
            "otp": otp
        })
        
        if otp_resp.status_code == 200 and "access_token" in otp_resp.json():
            results["Auth - Verify OTP"] = "✅ PASS"
            token = otp_resp.json()["access_token"]
            
            # Get profile
            headers = {"Authorization": f"Bearer {token}"}
            me_resp = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
            
            if me_resp.status_code == 200:
                results["Auth - Get Profile"] = "✅ PASS"
            else:
                results["Auth - Get Profile"] = "❌ FAIL"
        else:
            results["Auth - Verify OTP"] = "❌ FAIL"
            return results
    else:
        results["Auth - Login"] = "❌ FAIL"
        return results
    
    # 2. Projects (HIGH PRIORITY)
    print("2. Testing Projects...")
    
    # List projects
    projects_resp = requests.get(f"{BACKEND_URL}/projects", headers=headers)
    if projects_resp.status_code == 200:
        results["Projects - List"] = "✅ PASS"
        projects = projects_resp.json()
        
        if projects:
            # Get project details
            project_id = projects[0]["id"]
            detail_resp = requests.get(f"{BACKEND_URL}/projects/{project_id}", headers=headers)
            
            if detail_resp.status_code == 200:
                results["Projects - Get Details"] = "✅ PASS"
            else:
                results["Projects - Get Details"] = "❌ FAIL"
        else:
            results["Projects - Get Details"] = "❌ FAIL - No projects"
    else:
        results["Projects - List"] = "❌ FAIL"
    
    # 3. Registration Flow  
    print("3. Testing Registration...")
    
    # Create new invite first (as admin)
    import time
    unique_id = int(time.time()) 
    test_email = f"test.reg.{unique_id}@example.com"
    
    invite_resp = requests.post(f"{BACKEND_URL}/admin/invites", 
                               json={"email": test_email, "role": "investor"}, 
                               headers=headers)
    
    if invite_resp.status_code == 200:
        invite_code = invite_resp.json()["code"]
        
        # Test registration
        reg_resp = requests.post(f"{BACKEND_URL}/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "full_name": f"Test User {unique_id}",
            "phone": "+1234567890",
            "invite_code": invite_code
        })
        
        if reg_resp.status_code == 200:
            results["Registration - With Invite"] = "✅ PASS"
        else:
            results["Registration - With Invite"] = "❌ FAIL"
    else:
        results["Registration - With Invite"] = "❌ FAIL"
    
    # 4. Portfolio & Dashboard
    print("4. Testing Portfolio & Dashboard...")
    
    portfolio_resp = requests.get(f"{BACKEND_URL}/portfolio/summary", headers=headers)
    if portfolio_resp.status_code == 200:
        results["Portfolio - Summary"] = "✅ PASS"
    else:
        results["Portfolio - Summary"] = "❌ FAIL"
    
    dashboard_resp = requests.get(f"{BACKEND_URL}/dashboard/investor", headers=headers)
    if dashboard_resp.status_code == 200:
        results["Dashboard - Investor"] = "✅ PASS"
    else:
        results["Dashboard - Investor"] = "❌ FAIL"
    
    # 5. KYC & Compliance
    print("5. Testing KYC & Compliance...")
    
    nda_resp = requests.post(f"{BACKEND_URL}/kyc/accept-nda", headers=headers)
    if nda_resp.status_code == 200:
        results["KYC - Accept NDA"] = "✅ PASS"
    else:
        results["KYC - Accept NDA"] = "❌ FAIL"
    
    risk_resp = requests.post(f"{BACKEND_URL}/kyc/acknowledge-risk", headers=headers)
    if risk_resp.status_code == 200:
        results["KYC - Acknowledge Risk"] = "✅ PASS"
    else:
        results["KYC - Acknowledge Risk"] = "❌ FAIL"
    
    docs_resp = requests.get(f"{BACKEND_URL}/kyc/my-documents", headers=headers)
    if docs_resp.status_code == 200:
        results["KYC - Get Documents"] = "✅ PASS"
    else:
        results["KYC - Get Documents"] = "❌ FAIL"
    
    # 6. Participations
    print("6. Testing Participations...")
    
    if projects:
        project_id = projects[0]["id"]
        part_resp = requests.post(f"{BACKEND_URL}/participations/request", 
                                 json={"project_id": project_id, "amount": 100000}, 
                                 headers=headers)
        
        if part_resp.status_code == 200:
            results["Participations - Request"] = "✅ PASS"
        else:
            results["Participations - Request"] = "❌ FAIL"
    
    my_part_resp = requests.get(f"{BACKEND_URL}/participations/my", headers=headers)
    if my_part_resp.status_code == 200:
        results["Participations - My Requests"] = "✅ PASS"
    else:
        results["Participations - My Requests"] = "❌ FAIL"
    
    return results

if __name__ == "__main__":
    results = run_comprehensive_tests()
    
    print("\n" + "=" * 60)
    print("🏁 FINAL TEST RESULTS")
    print("=" * 60)
    
    total = len(results)
    passed = sum(1 for r in results.values() if "✅" in r)
    
    for test_name, result in results.items():
        print(f"{result}: {test_name}")
    
    print(f"\nTotal: {total} | Passed: {passed} | Failed: {total - passed}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 ALL CRITICAL BACKEND TESTS PASSING!")
    else:
        print(f"\n⚠️  {total - passed} tests need attention")