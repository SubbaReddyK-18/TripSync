import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import bcrypt
from config.database import get_db

NEW_PASSWORD = "admin123"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

def reset_admin_password():
    db = get_db()
    admin = db["users"].find_one({"role": "admin"})
    if not admin:
        print("No admin user found.")
        return

    hashed = hash_password(NEW_PASSWORD)
    db["users"].update_one({"_id": admin["_id"]}, {"$set": {"password_hash": hashed}})
    print(f"Password reset for admin: {admin.get('email', 'unknown')}")
    print(f"New password: {NEW_PASSWORD}")

if __name__ == "__main__":
    reset_admin_password()
