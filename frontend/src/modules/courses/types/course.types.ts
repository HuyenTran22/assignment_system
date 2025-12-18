export interface Course {
    id: string;
    name: string;
    code: string;
    description?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    enrollment_count?: number;
    assignment_count?: number;
}

export interface CourseCreate {
    name: string;
    code: string;
    description?: string;
}

export interface CourseUpdate {
    name?: string;
    code?: string;
    description?: string;
}

export interface EnrollmentCreate {
    user_id: string;
    role: 'STUDENT' | 'TEACHER';
}

export interface Enrollment {
    id: string;
    user_id: string;
    course_id: string;
    role_in_course: 'student' | 'teacher'; // Backend returns role_in_course
    enrolled_at: string; // Backend returns enrolled_at, not joined_at
    role?: 'STUDENT' | 'TEACHER'; // Legacy field for compatibility
    joined_at?: string; // Legacy field for compatibility
    user: {
        id: string;
        full_name: string;
        email: string;
        student_id?: string;
    };
}
