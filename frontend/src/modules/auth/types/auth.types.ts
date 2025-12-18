export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'STUDENT' | 'TEACHER' | 'MANAGER' | 'ADMIN';

    student_id?: string;
    class_name?: string;
    must_change_password: boolean;
    last_password_change?: string;
    created_at: string;
    updated_at: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    full_name: string;
    password: string;
    role: 'STUDENT' | 'TEACHER';
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: User;
}
