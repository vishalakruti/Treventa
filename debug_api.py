#!/usr/bin/env python3
"""
Debug specific API failures
"""

import requests
import json

# Backend URL
BACKEND_URL = "https://private-capital-1.preview.emergentagent.com/api"

# Get auth token first
def get_auth_token():
    # Login
    login_response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": "admin@treventa.com",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        return None
    
    otp = login_response.json()["mocked_otp"]
    
    # Verify OTP
    otp_response = requests.post(f"{BACKEND_URL}/auth/verify-otp", json={
        "email": "admin@treventa.com",
        "otp": otp
    })
    
    if otp_response.status_code != 200:
        print(f"OTP verification failed: {otp_response.status_code}")
        return None
    
    return otp_response.json()["access_token"]

def debug_projects():
    token = get_auth_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get projects list
    projects_response = requests.get(f"{BACKEND_URL}/projects", headers=headers)
    print(f"Projects list status: {projects_response.status_code}")
    
    if projects_response.status_code == 200:
        projects = projects_response.json()
        print(f"Found {len(projects)} projects")
        
        if projects:
            project_id = projects[0]["id"]
            print(f"Testing project details for ID: {project_id}")
            
            # Get project details
            detail_response = requests.get(f"{BACKEND_URL}/projects/{project_id}", headers=headers)
            print(f"Project details status: {detail_response.status_code}")
            print(f"Project details response: {detail_response.text}")
    else:
        print(f"Failed to get projects: {projects_response.text}")

def debug_participations():
    token = get_auth_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get my participations
    response = requests.get(f"{BACKEND_URL}/participations/my", headers=headers)
    print(f"My participations status: {response.status_code}")
    print(f"My participations response: {response.text}")

if __name__ == "__main__":
    print("=== DEBUG PROJECTS ===")
    debug_projects()
    print("\n=== DEBUG PARTICIPATIONS ===")
    debug_participations()