import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import bcrypt
from config.database import get_db

if __name__ == "__main__":
    NEW_PASSWORD = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ADMIN_RESET_PASSWORD")
    if not NEW_PASSWORD:
        print("Usage: python reset_admin_password.py <newpassword>")
        print("   or: set ADMIN_RESET_PASSWORD env var")
        sys.exit(1)

    db = get_db()
    admin = db["users"].find_one({"role": "admin"})
    if not admin:
        print("No admin user found.")
        sys.exit(1)

    hashed = bcrypt.hashpw(NEW_PASSWORD.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    db["users"].update_one({"_id": admin["_id"]}, {"$set": {"password_hash": hashed}})
    print(f"Password reset for admin: {admin.get('email', 'unknown')}")
