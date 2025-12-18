"""
Script to set a user's role to ADMIN
Usage: python scripts/set_admin_role.py <email>
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal
from app.models.user import User, UserRole

def set_admin_role(email: str):
    """Set user role to ADMIN"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User with email '{email}' not found!")
            return False
        
        print(f"📋 Current user info:")
        print(f"   - Email: {user.email}")
        print(f"   - Name: {user.full_name}")
        print(f"   - Current Role: {user.role.value}")
        
        if user.role == UserRole.ADMIN:
            print(f"✅ User already has ADMIN role!")
            return True
        
        user.role = UserRole.ADMIN
        db.commit()
        
        print(f"✅ Successfully updated user role to ADMIN!")
        return True
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating user role: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/set_admin_role.py <email>")
        print("Example: python scripts/set_admin_role.py kyquangnguyen123@gmail.com")
        sys.exit(1)
    
    email = sys.argv[1]
    success = set_admin_role(email)
    sys.exit(0 if success else 1)

