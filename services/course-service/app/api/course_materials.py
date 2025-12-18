from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from pathlib import Path
import mimetypes
import uuid

from app.db import get_db
from app.core.security import get_current_user
from app.api.dependencies import require_teacher_or_manager_or_admin
from app.models.user import User, UserRole
from app.models.course import Course, CourseEnrollment, CourseRole
from app.models.course_material import CourseModule, CourseMaterial, MaterialType, UserCourseProgress
from app.schemas.course_material import (
    CourseModuleCreate, CourseModuleUpdate, CourseModuleResponse,
    CourseMaterialCreate, CourseMaterialUpdate, CourseMaterialResponse,
    UserCourseProgressResponse
)
from app.core.file_utils import save_upload_file, validate_file_size, validate_mime_type
from app.core.config import settings

router = APIRouter(prefix="/courses", tags=["Course Materials"])


def check_course_access(course_id: UUID, user: User, db: Session, require_teacher: bool = False) -> Course:
    """Check if user has access to course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Admin and Manager can access all courses
    if user.role in (UserRole.ADMIN, UserRole.MANAGER):
        return course
    
    # Check enrollment
    enrollment = db.query(CourseEnrollment).filter(
        CourseEnrollment.course_id == course_id,
        CourseEnrollment.user_id == user.id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this course"
        )
    
    # If require_teacher, check if user is teacher
    if require_teacher and enrollment.role_in_course != CourseRole.teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can perform this action"
        )
    
    return course


# ==================== Modules ====================

@router.get("/{course_id}/modules", response_model=List[CourseModuleResponse])
def list_modules(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all modules in a course."""
    check_course_access(course_id, current_user, db)
    
    modules = db.query(CourseModule).filter(
        CourseModule.course_id == course_id
    ).order_by(CourseModule.order_index).all()
    
    return modules


@router.post("/{course_id}/modules", response_model=CourseModuleResponse, status_code=status.HTTP_201_CREATED)
def create_module(
    course_id: UUID,
    module_data: CourseModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Create a new module in a course."""
    check_course_access(course_id, current_user, db, require_teacher=True)
    
    module = CourseModule(
        course_id=course_id,
        title=module_data.title,
        description=module_data.description,
        order_index=module_data.order_index
    )
    
    db.add(module)
    db.commit()
    db.refresh(module)
    
    return module


@router.put("/modules/{module_id}", response_model=CourseModuleResponse)
def update_module(
    module_id: UUID,
    module_data: CourseModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Update a module."""
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    check_course_access(module.course_id, current_user, db, require_teacher=True)
    
    update_data = module_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(module, field, value)
    
    db.commit()
    db.refresh(module)
    
    return module


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Delete a module."""
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found"
        )
    
    check_course_access(module.course_id, current_user, db, require_teacher=True)
    
    db.delete(module)
    db.commit()
    
    return None


# ==================== Materials ====================

@router.get("/{course_id}/materials", response_model=List[CourseMaterialResponse])
def list_materials(
    course_id: UUID,
    module_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all materials in a course (optionally filtered by module)."""
    check_course_access(course_id, current_user, db)
    
    query = db.query(CourseMaterial).filter(CourseMaterial.course_id == course_id)
    
    if module_id:
        query = query.filter(CourseMaterial.module_id == module_id)
    
    materials = query.order_by(CourseMaterial.order_index).all()
    
    return materials


@router.post("/{course_id}/materials", response_model=CourseMaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    course_id: UUID,
    material_data: CourseMaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Create a new material in a course."""
    import traceback
    
    try:
        check_course_access(course_id, current_user, db, require_teacher=True)
        
        # Ensure course_id from path matches body (if provided)
        # Use path parameter as source of truth
        if material_data.course_id != course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course ID in path does not match course ID in body"
            )
        
        # Validate module_id if provided
        if material_data.module_id:
            module = db.query(CourseModule).filter(
                CourseModule.id == material_data.module_id,
                CourseModule.course_id == course_id
            ).first()
            if not module:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Module not found in this course"
                )
        
        # Ensure type is the enum value (string), not enum name
        # Normalize and validate material type
        material_type_raw = material_data.type
        if isinstance(material_type_raw, MaterialType):
            material_type = material_type_raw.value
        elif isinstance(material_type_raw, str):
            # Normalize to lowercase to match enum values
            material_type = material_type_raw.lower()
            # Validate it's a valid enum value
            valid_types = [e.value for e in MaterialType]
            if material_type not in valid_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid material type: {material_type_raw}. Valid types are: {valid_types}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid material type format: {type(material_type_raw)}"
            )
        
        # Validate material type-specific fields
        if material_type == MaterialType.LESSON.value and not material_data.content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Content is required for lesson type material"
            )
        
        if material_type == MaterialType.VIDEO.value and not material_data.video_url and not material_data.file_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Video URL or file path is required for video type material"
            )
        
        print(f"[CreateMaterial] Creating material: course_id={course_id}, type={material_type}, title={material_data.title[:50]}")
        print(f"[CreateMaterial] Payload: module_id={material_data.module_id}, content_length={len(material_data.content) if material_data.content else 0}")
        
        # Convert normalized string to enum instance
        # MaterialTypeColumn TypeDecorator will serialize enum.value (lowercase) to database
        material_type_enum = MaterialType(material_type)
        
        material = CourseMaterial(
            course_id=course_id,
            module_id=material_data.module_id,
            title=material_data.title,
            type=material_type_enum,  # Pass enum instance - TypeDecorator will serialize value
            description=material_data.description,
            content=material_data.content,
            file_path=material_data.file_path,
            video_url=material_data.video_url,
            order_index=material_data.order_index,
            created_by=current_user.id
        )
        
        db.add(material)
        db.commit()
        db.refresh(material)
        
        print(f"[CreateMaterial] Successfully created material: id={material.id}")
        return material
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        print(f"[CreateMaterial] Error creating material: {error_msg}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create material: {error_msg}"
        )


@router.post("/{course_id}/materials/upload", response_model=CourseMaterialResponse, status_code=status.HTTP_201_CREATED)
async def upload_material(
    course_id: UUID,
    title: str = Form(...),
    type: MaterialType = Form(...),
    description: Optional[str] = Form(None),
    module_id: Optional[UUID] = Form(None),
    video_url: Optional[str] = Form(None),  # For YouTube/Vimeo
    file: Optional[UploadFile] = File(None),  # For document/video file
    content: Optional[str] = Form(None),  # For lesson type
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Upload a material (file or create lesson)."""
    check_course_access(course_id, current_user, db, require_teacher=True)
    
    file_path = None
    
    # Handle file upload for document/video
    if file and type in (MaterialType.DOCUMENT, MaterialType.VIDEO):
        # Read file content once
        content_bytes = await file.read()
        file_size = len(content_bytes)
        
        if not validate_file_size(file_size):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"File size exceeds maximum allowed ({settings.MAX_FILE_SIZE} bytes)"
            )
        
        # Validate MIME type
        if type == MaterialType.DOCUMENT:
            allowed_types = [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # PPTX
                "application/msword",  # DOC
                "text/plain"
            ]
        else:  # VIDEO
            allowed_types = [
                "video/mp4",
                "video/webm",
                "video/ogg"
            ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"File type '{file.content_type}' not allowed for {type.value}"
            )
        
        # Save file directly from bytes to ensure no corruption
        upload_dir = Path(settings.UPLOAD_DIR)
        subfolder_path = upload_dir / f"materials/{course_id}"
        subfolder_path.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path_full = subfolder_path / unique_filename
        
        # Write file in binary mode
        with open(file_path_full, "wb") as f:
            f.write(content_bytes)
        
        # Return relative path
        file_path = str(file_path_full.relative_to(upload_dir))
    
    # Create material
    material = CourseMaterial(
        course_id=course_id,
        module_id=module_id,
        title=title,
        type=type,
        description=description,
        content=content,
        file_path=file_path,
        video_url=video_url,
        created_by=current_user.id
    )
    
    db.add(material)
    db.commit()
    db.refresh(material)
    
    return material


@router.put("/materials/{material_id}", response_model=CourseMaterialResponse)
def update_material(
    material_id: UUID,
    material_data: CourseMaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Update a material."""
    material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    check_course_access(material.course_id, current_user, db, require_teacher=True)
    
    update_data = material_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(material, field, value)
    
    db.commit()
    db.refresh(material)
    
    return material


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_manager_or_admin)
):
    """Delete a material."""
    material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    check_course_access(material.course_id, current_user, db, require_teacher=True)
    
    db.delete(material)
    db.commit()
    
    return None


# ==================== File Download ====================

@router.get("/materials/{material_id}/download")
def download_material_file(
    material_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download a material file."""
    material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    # Check access
    check_course_access(material.course_id, current_user, db)
    
    if not material.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No file attached to this material"
        )
    
    # Get full file path
    file_path = Path(settings.UPLOAD_DIR) / material.file_path
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )
    
    # Determine content type
    content_type, _ = mimetypes.guess_type(str(file_path))
    if not content_type:
        # Default content types for common file extensions
        ext = file_path.suffix.lower()
        content_type_map = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.txt': 'text/plain',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg',
        }
        content_type = content_type_map.get(ext, 'application/octet-stream')
    
    # Return file with proper headers
    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=material.title + file_path.suffix,
        headers={
            "Content-Disposition": f'attachment; filename="{material.title}{file_path.suffix}"'
        }
    )


# ==================== Progress ====================

@router.get("/{course_id}/progress", response_model=List[UserCourseProgressResponse])
def get_my_progress(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's progress in a course."""
    check_course_access(course_id, current_user, db)
    
    progress = db.query(UserCourseProgress).filter(
        UserCourseProgress.course_id == course_id,
        UserCourseProgress.user_id == current_user.id
    ).all()
    
    return progress


@router.post("/materials/{material_id}/complete", response_model=UserCourseProgressResponse)
def mark_material_complete(
    material_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a material as completed."""
    material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    check_course_access(material.course_id, current_user, db)
    
    # Get or create progress
    progress = db.query(UserCourseProgress).filter(
        UserCourseProgress.material_id == material_id,
        UserCourseProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        progress = UserCourseProgress(
            user_id=current_user.id,
            course_id=material.course_id,
            module_id=material.module_id,
            material_id=material_id,
            progress_percentage=100
        )
        db.add(progress)
    else:
        progress.progress_percentage = 100
    
    from datetime import datetime, timezone
    progress.completed_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(progress)
    
    return progress

