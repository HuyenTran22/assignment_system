from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import secrets
import string
from datetime import datetime
import csv
from io import StringIO

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.models.user import User, UserRole
from app.models.course import Course, CourseEnrollment, CourseRole
from app.models.certificate import Certificate, CertificateTemplate
from app.models.course_material import UserCourseProgress
from app.schemas.certificate import (
    CertificateCreate, CertificateResponse, CertificateVerifyResponse,
    CertificateTemplateCreate, CertificateTemplateUpdate, CertificateTemplateResponse,
    CertificateGenerateRequest
)
from app.api.course_materials import check_course_access

router = APIRouter(prefix="/courses", tags=["Certificates"])


def generate_certificate_number() -> str:
    """Generate unique certificate number."""
    return f"CERT-{secrets.token_hex(8).upper()}"


def generate_verification_code() -> str:
    """Generate unique verification code."""
    return secrets.token_urlsafe(16)


def check_certificate_access(certificate_id: UUID, user: User, db: Session) -> Certificate:
    """Check if user has access to certificate."""
    certificate = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )
    
    # User can access their own certificates, or teacher/admin can access all
    if certificate.user_id != user.id:
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == certificate.course_id,
            CourseEnrollment.user_id == user.id,
            CourseEnrollment.role_in_course == CourseRole.teacher
        ).first()
        
        if not enrollment and user.role not in (UserRole.ADMIN, UserRole.MANAGER):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this certificate"
            )
    
    return certificate


@router.get("/{course_id}/certificates", response_model=List[CertificateResponse])
def list_course_certificates(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List certificates for a specific course.
    
    - ADMIN / MANAGER / TEACHER: thấy tất cả certificates của course
    - STUDENT: chỉ thấy certificates của chính mình trong course
    """
    query = db.query(Certificate).filter(Certificate.course_id == course_id)
    
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.MANAGER)
    is_teacher = current_user.role == UserRole.TEACHER
    
    if not (is_teacher or is_admin):
        query = query.filter(Certificate.user_id == current_user.id)
    
    certificates = query.order_by(Certificate.issued_at.desc()).all()
    
    result: List[CertificateResponse] = []
    for cert in certificates:
        cert_dict = CertificateResponse.model_validate(cert).model_dump()
        cert_dict["issuer_name"] = cert.issuer.full_name if cert.issuer else None
        result.append(CertificateResponse(**cert_dict))
    
    return result


def map_score_to_grade(score: float) -> str:
    """
    Map numeric score (0-10) to qualitative grade in Vietnamese.
    
    - 0.0 - 4.9  -> "Trung bình"
    - 5.0 - 6.4  -> "Khá"
    - 6.5 - 7.9  -> "Giỏi"
    - 8.0 - 10.0 -> "Xuất sắc"
    """
    if score < 5.0:
        return "Trung bình"
    if score < 6.5:
        return "Khá"
    if score < 8.0:
        return "Giỏi"
    return "Xuất sắc"


def create_certificate_record(
    *, course_id: UUID, student: User, course: Course, grade_text: Optional[str],
    issued_by: UUID, template_id: Optional[UUID], db: Session
) -> Certificate:
    """
    Internal helper to create and persist a certificate record
    and mark the course as completed for this user.
    """
    certificate = Certificate(
        course_id=course_id,
        user_id=student.id,
        certificate_number=generate_certificate_number(),
        verification_code=generate_verification_code(),
        issued_by=issued_by,
        student_name=student.full_name,
        course_name=course.name,
        completion_date=datetime.now(),
        grade=grade_text,
        template_id=template_id,
    )

    db.add(certificate)
    db.commit()
    db.refresh(certificate)

    # Mark overall course progress as completed for this user
    progress = db.query(UserCourseProgress).filter(
        UserCourseProgress.user_id == student.id,
        UserCourseProgress.course_id == course_id,
        UserCourseProgress.module_id.is_(None),
        UserCourseProgress.material_id.is_(None),
    ).first()
    now = datetime.now()
    if not progress:
        progress = UserCourseProgress(
            user_id=student.id,
            course_id=course_id,
            module_id=None,
            material_id=None,
            progress_percentage=100,
            completed_at=now,
        )
        db.add(progress)
    else:
        progress.progress_percentage = 100
        progress.completed_at = now

    db.commit()

    return certificate


# Certificate CRUD
@router.post("/{course_id}/certificates/generate", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
def generate_certificate(
    course_id: UUID,
    request: CertificateGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Generate a certificate for a student (Teacher/Manager/Admin only)."""
    check_course_access(course_id, current_user, db, require_teacher=True)
    
    # Verify user is enrolled in course
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.user_id == request.user_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not enrolled in this course"
        )
    
    # Check if certificate already exists
    existing = db.query(Certificate).filter(
        Certificate.course_id == course_id,
        Certificate.user_id == request.user_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate already exists for this user and course"
        )
    
    # Get course and user info
    course = db.query(Course).filter(Course.id == course_id).first()
    student = db.query(User).filter(User.id == request.user_id).first()
    
    if not course or not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course or user not found"
        )
    
    # Generate certificate
    certificate = create_certificate_record(
        course_id=course_id,
        student=student,
        course=course,
        grade_text=request.grade,
        issued_by=current_user.id,
        template_id=request.template_id,
        db=db,
    )
    
    result = CertificateResponse.model_validate(certificate)
    result.issuer_name = current_user.full_name
    
    return result


@router.post("/{course_id}/certificates/import-csv", response_model=List[CertificateResponse], status_code=status.HTTP_201_CREATED)
async def import_certificates_from_csv(
    course_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """
    Import certificates from a CSV file.
    
    Expected CSV columns (header row required):
    - course_name (optional, will be validated if present)
    - student_name
    - student_email
    - score (0-10)
    
    For each row:
    - Find enrolled student in this course by email
    - Convert numeric score (0-10) to qualitative grade
    - Generate certificate (skipping duplicates)
    """
    check_course_access(course_id, current_user, db, require_teacher=True)
    
    if file.content_type not in ("text/csv", "application/vnd.ms-excel", "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )
    
    raw_bytes = await file.read()
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = raw_bytes.decode("latin-1")
    
    reader = csv.DictReader(StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file is empty or missing header row"
        )
    
    required_columns = {"student_email", "score"}
    missing = required_columns - set(col.strip() for col in reader.fieldnames)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV missing required columns: {', '.join(sorted(missing))}"
        )
    
    # Load course once
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    created_certificates: List[CertificateResponse] = []
    skipped_rows: int = 0
    
    for row in reader:
        student_email = (row.get("student_email") or "").strip()
        score_raw = (row.get("score") or "").strip()
        course_name_csv = (row.get("course_name") or "").strip()
        
        if not student_email or not score_raw:
            skipped_rows += 1
            continue
        
        # Optional: validate course name if provided
        if course_name_csv and course_name_csv != course.name:
            skipped_rows += 1
            continue
        
        try:
            score_val = float(score_raw.replace(",", "."))
        except ValueError:
            skipped_rows += 1
            continue
        
        # Clamp score to [0, 10]
        score_val = max(0.0, min(10.0, score_val))
        # Only issue certificates for scores >= 5.0
        if score_val < 5.0:
            skipped_rows += 1
            continue

        grade_text = map_score_to_grade(score_val)
        
        # Find student by email
        student = db.query(User).filter(User.email == student_email).first()
        if not student:
            skipped_rows += 1
            continue
        
        # Check enrollment
        enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.user_id == student.id
        ).first()
        if not enrollment:
            skipped_rows += 1
            continue
        
        # Skip if certificate already exists
        existing = db.query(Certificate).filter(
            Certificate.course_id == course_id,
            Certificate.user_id == student.id
        ).first()
        if existing:
            continue
        
        cert = create_certificate_record(
            course_id=course_id,
            student=student,
            course=course,
            grade_text=grade_text,
            issued_by=current_user.id,
            template_id=None,
            db=db,
        )
        cert_resp = CertificateResponse.model_validate(cert)
        cert_resp.issuer_name = current_user.full_name
        created_certificates.append(cert_resp)
    
    if not created_certificates and skipped_rows > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No certificates were created. Check that students are enrolled and CSV columns are correct."
        )
    
    return created_certificates


@router.get("/certificates", response_model=List[CertificateResponse])
def list_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    course_id: Optional[str] = None,
):
    """
    List certificates (user's own or all if teacher/admin).
    
    - ADMIN / MANAGER / TEACHER: thấy tất cả certificates (có thể lọc theo course_id)
    - STUDENT: chỉ thấy certificates của chính mình
    
    Dùng course_id dạng string để tránh lỗi 422 khi query param không phải UUID hợp lệ,
    sau đó parse thủ công.
    """
    query = db.query(Certificate)
    
    # Permission model
    is_admin = current_user.role in (UserRole.ADMIN, UserRole.MANAGER)
    is_teacher = current_user.role == UserRole.TEACHER
    
    if not (is_teacher or is_admin):
        # Students see only their own
        query = query.filter(Certificate.user_id == current_user.id)
    
    # Parse course_id thủ công (nếu có)
    from uuid import UUID as _UUID
    
    if course_id:
        try:
            course_uuid = _UUID(course_id)
            query = query.filter(Certificate.course_id == course_uuid)
        except ValueError:
            # course_id không hợp lệ -> bỏ filter theo course_id, tránh 422
            pass
    
    certificates = query.order_by(Certificate.issued_at.desc()).all()
    
    result = []
    for cert in certificates:
        cert_dict = CertificateResponse.model_validate(cert).model_dump()
        cert_dict['issuer_name'] = cert.issuer.full_name if cert.issuer else None
        result.append(CertificateResponse(**cert_dict))
    
    return result


@router.get("/certificates/{certificate_id}", response_model=CertificateResponse)
def get_certificate(
    certificate_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get certificate details."""
    certificate = check_certificate_access(certificate_id, current_user, db)
    
    result = CertificateResponse.model_validate(certificate)
    result.issuer_name = certificate.issuer.full_name if certificate.issuer else None
    
    return result


@router.get("/certificates/{certificate_id}/download")
def download_certificate(
    certificate_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download certificate PDF."""
    certificate = check_certificate_access(certificate_id, current_user, db)
    
    if not certificate.pdf_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not generated yet"
        )
    
    # In a real implementation, you would generate/retrieve the PDF file
    # For now, return a placeholder response
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="PDF generation not implemented yet. Use pdf_url to access the certificate."
    )


@router.get("/certificates/verify/{verification_code}", response_model=CertificateVerifyResponse)
def verify_certificate(
    verification_code: str,
    db: Session = Depends(get_db)
):
    """Verify a certificate by verification code (public endpoint)."""
    certificate = db.query(Certificate).filter(
        Certificate.verification_code == verification_code
    ).first()
    
    if not certificate:
        return CertificateVerifyResponse(
            is_valid=False,
            message="Certificate not found or verification code is invalid"
        )
    
    certificate.is_verified = True
    db.commit()
    
    result = CertificateResponse.model_validate(certificate)
    result.issuer_name = certificate.issuer.full_name if certificate.issuer else None
    
    return CertificateVerifyResponse(
        is_valid=True,
        certificate=result,
        message="Certificate verified successfully"
    )


# Certificate Template CRUD
@router.post("/certificate-templates", response_model=CertificateTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_template(
    template_data: CertificateTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Create a certificate template (Teacher/Manager/Admin only)."""
    if template_data.course_id:
        check_course_access(template_data.course_id, current_user, db, require_teacher=True)
    
    template = CertificateTemplate(
        course_id=template_data.course_id,
        created_by=current_user.id,
        name=template_data.name,
        description=template_data.description,
        design_config=template_data.design_config,
        is_default=template_data.is_default,
        is_active=template_data.is_active
    )
    
    # If this is set as default, unset other defaults
    if template_data.is_default:
        db.query(CertificateTemplate).filter(
            CertificateTemplate.is_default == True
        ).update({CertificateTemplate.is_default: False})
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    result = CertificateTemplateResponse.model_validate(template)
    result.creator_name = current_user.full_name
    
    return result


@router.get("/certificate-templates", response_model=List[CertificateTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    course_id: Optional[UUID] = None
):
    """List certificate templates."""
    query = db.query(CertificateTemplate).filter(CertificateTemplate.is_active == True)
    
    if course_id:
        query = query.filter(
            (CertificateTemplate.course_id == course_id) | (CertificateTemplate.course_id == None)
        )
    
    templates = query.order_by(CertificateTemplate.is_default.desc(), CertificateTemplate.created_at.desc()).all()
    
    result = []
    for template in templates:
        template_dict = CertificateTemplateResponse.model_validate(template).model_dump()
        template_dict['creator_name'] = template.creator.full_name if template.creator else None
        result.append(CertificateTemplateResponse(**template_dict))
    
    return result


@router.get("/certificate-templates/{template_id}", response_model=CertificateTemplateResponse)
def get_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get template details."""
    template = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    result = CertificateTemplateResponse.model_validate(template)
    result.creator_name = template.creator.full_name if template.creator else None
    
    return result


@router.put("/certificate-templates/{template_id}", response_model=CertificateTemplateResponse)
def update_template(
    template_id: UUID,
    template_data: CertificateTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Update a template (Teacher/Manager/Admin only)."""
    template = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    update_data = template_data.model_dump(exclude_unset=True)
    
    # If setting as default, unset other defaults
    if update_data.get('is_default') == True:
        db.query(CertificateTemplate).filter(
            CertificateTemplate.is_default == True,
            CertificateTemplate.id != template_id
        ).update({CertificateTemplate.is_default: False})
    
    for field, value in update_data.items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    
    result = CertificateTemplateResponse.model_validate(template)
    result.creator_name = template.creator.full_name if template.creator else None
    
    return result


@router.delete("/certificate-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Delete a template (Teacher/Manager/Admin only)."""
    template = db.query(CertificateTemplate).filter(CertificateTemplate.id == template_id).first()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    db.delete(template)
    db.commit()
    
    return None

