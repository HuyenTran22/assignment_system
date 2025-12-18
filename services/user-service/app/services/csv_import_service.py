import csv
import io
from sqlalchemy.orm import Session
from fastapi import UploadFile
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.services.password_service import generate_random_password
from app.schemas.admin import CSVUserRow, CSVImportResponse


async def process_csv_import(
    db: Session,
    file: UploadFile,
    admin_id: str
) -> CSVImportResponse:
    """Process CSV file and create users"""
    
    # Read CSV content
    content = await file.read()
    csv_text = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(csv_text))
    
    created_users = []
    errors = []
    row_number = 1
    
    for row in csv_reader:
        row_number += 1
        
        try:
            # Validate row data
            user_data = CSVUserRow(
                student_id=row.get('student_id', '').strip(),
                full_name=row.get('full_name', '').strip(),
                email=row.get('email', '').strip(),
                class_name=row.get('class_name', '').strip() or None,
                role=UserRole(row.get('role', 'STUDENT').strip().upper())
            )
            
            # Check if email already exists
            existing_email = db.query(User).filter(User.email == user_data.email).first()
            if existing_email:
                errors.append({
                    "row": row_number,
                    "error": f"Email {user_data.email} already exists"
                })
                continue
            
            # Check if student_id already exists
            if user_data.student_id:
                existing_student = db.query(User).filter(User.student_id == user_data.student_id).first()
                if existing_student:
                    errors.append({
                        "row": row_number,
                        "error": f"Student ID {user_data.student_id} already exists"
                    })
                    continue
            
            # Generate random password
            password = generate_random_password()
            password_hash = get_password_hash(password)
            
            # Create user
            new_user = User(
                email=user_data.email,
                full_name=user_data.full_name,
                password_hash=password_hash,
                role=user_data.role,
                student_id=user_data.student_id if user_data.student_id else None,
                class_name=user_data.class_name,
                must_change_password=True,
                created_by=admin_id
            )
            
            db.add(new_user)
            db.flush()  # Get the ID without committing
            
            # Add to created users list (with password - ONE TIME ONLY)
            created_users.append({
                "student_id": user_data.student_id,
                "email": user_data.email,
                "full_name": user_data.full_name,
                "password": password,  # This is the ONLY time password is returned
                "role": user_data.role.value
            })
            
        except Exception as e:
            errors.append({
                "row": row_number,
                "error": str(e)
            })
    
    # Commit all changes
    if created_users:
        db.commit()
    
    return CSVImportResponse(
        success=len(created_users) > 0,
        created=len(created_users),
        failed=len(errors),
        users=created_users,
        errors=errors
    )


def generate_csv_template() -> str:
    """Generate CSV template"""
    template = "student_id,full_name,email,class_name,role\n"
    template += "SV001,Nguyen Van A,student1@example.com,CNTT-K15,STUDENT\n"
    template += "SV002,Tran Thi B,student2@example.com,CNTT-K15,STUDENT\n"
    template += "GV001,Le Van C,teacher1@example.com,CNTT,TEACHER\n"
    return template
