export enum UserRole {
    STUDENT = 'STUDENT',
    TEACHER = 'TEACHER',
    ADMIN = 'ADMIN'
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    student_id?: string;
    class_name?: string;
    must_change_password: boolean;
    last_password_change?: string;
    created_at: string;
}

export interface UserListResponse {
    total: number;
    users: User[];
}

export interface CSVImportResponse {
    success: boolean;
    created: number;
    failed: number;
    users: Array<{
        student_id?: string;
        email: string;
        full_name: string;
        password?: string;
        role: string;
    }>;
    errors: Array<{
        row: number;
        error: string;
    }>;
}

export interface PasswordResetLinkResponse {
    reset_link: string;
    expires_at: string;
}
