"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
import json
from typing import Optional

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load teacher credentials from JSON file
def load_teachers():
    teacher_file = os.path.join(Path(__file__).parent, "teachers.json")
    try:
        with open(teacher_file, 'r') as f:
            data = json.load(f)
            return data.get("teachers", [])
    except FileNotFoundError:
        return []

# In-memory session storage (teacher sessions)
teacher_sessions = {}

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.post("/login")
def login(username: str, password: str):
    """Teacher login endpoint"""
    teachers = load_teachers()
    
    # Validate credentials
    for teacher in teachers:
        if teacher["username"] == username and teacher["password"] == password:
            # Create a session token (simple implementation)
            session_token = f"{username}_{int(__import__('time').time())}"
            teacher_sessions[session_token] = {
                "username": username,
                "timestamp": __import__('time').time()
            }
            return {
                "message": f"Login successful for {username}",
                "session_token": session_token,
                "username": username
            }
    
    raise HTTPException(status_code=401, detail="Invalid username or password")


@app.post("/logout")
def logout(session_token: Optional[str] = None):
    """Teacher logout endpoint"""
    if session_token and session_token in teacher_sessions:
        del teacher_sessions[session_token]
        return {"message": "Logged out successfully"}
    
    raise HTTPException(status_code=401, detail="Invalid session token")


@app.post("/verify-session")
def verify_session(session_token: str):
    """Verify if a session token is valid"""
    if session_token in teacher_sessions:
        session_data = teacher_sessions[session_token]
        return {
            "valid": True,
            "username": session_data["username"]
        }
    
    return {"valid": False}


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, session_token: Optional[str] = None):
    """Sign up a student for an activity (teacher only)"""
    # Verify teacher is logged in
    if not session_token or session_token not in teacher_sessions:
        raise HTTPException(status_code=401, detail="Unauthorized. Only logged-in teachers can register students.")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    teacher_username = teacher_sessions[session_token]["username"]
    return {"message": f"Teacher {teacher_username} signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, session_token: Optional[str] = None):
    """Unregister a student from an activity (teacher only)"""
    # Verify teacher is logged in
    if not session_token or session_token not in teacher_sessions:
        raise HTTPException(status_code=401, detail="Unauthorized. Only logged-in teachers can unregister students.")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    teacher_username = teacher_sessions[session_token]["username"]
    return {"message": f"Teacher {teacher_username} unregistered {email} from {activity_name}"}
