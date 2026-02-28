#!/usr/bin/env python3
"""
Test registration with a new unique email
"""

import requests
import time
import random

BACKEND_URL = "https://private-capital-1.preview.emergentagent.com/api"
DEMO_INVITE_CODE = "DEMO2025"

# Generate unique email
unique_id = int(time.time())
test_email = f"test.investor.{unique_id}@example.com"

print(f"Testing registration with unique email: {test_email}")

registration_data = {
    "email": test_email,
    "password": "testpass123",
    "full_name": f"Test Investor {unique_id}",
    "phone": "+1234567890",
    "invite_code": DEMO_INVITE_CODE
}

response = requests.post(f"{BACKEND_URL}/auth/register", json=registration_data)
print(f"Registration status: {response.status_code}")
print(f"Registration response: {response.text}")

# Also check if we can create a new invite code as admin
def get_admin_token():
    # Login as admin
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

# Test creating new invite
admin_token = get_admin_token()
if admin_token:
    print("\nTesting invite creation...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    invite_data = {
        "email": f"newinvestor.{unique_id}@example.com",
        "role": "investor"
    }
    
    invite_response = requests.post(f"{BACKEND_URL}/admin/invites", json=invite_data, headers=headers)
    print(f"Invite creation status: {invite_response.status_code}")
    print(f"Invite creation response: {invite_response.text}")
    
    if invite_response.status_code == 200:
        new_code = invite_response.json()["code"]
        
        # Test registration with new code
        print(f"\nTesting registration with new invite code: {new_code}")
        
        new_reg_data = {
            "email": f"newinvestor.{unique_id}@example.com",
            "password": "testpass123",
            "full_name": f"New Investor {unique_id}",
            "phone": "+1234567891",
            "invite_code": new_code
        }
        
        new_reg_response = requests.post(f"{BACKEND_URL}/auth/register", json=new_reg_data)
        print(f"New registration status: {new_reg_response.status_code}")
        print(f"New registration response: {new_reg_response.text}")
else:
    print("Failed to get admin token")