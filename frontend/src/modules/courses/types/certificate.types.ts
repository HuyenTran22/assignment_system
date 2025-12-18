export interface Certificate {
    id: string;
    course_id: string;
    user_id: string;
    certificate_number: string;
    verification_code: string;
    issued_at: string;
    issued_by: string;
    student_name: string;
    course_name: string;
    completion_date: string;
    grade?: string;
    template_id?: string;
    pdf_url?: string;
    is_verified: boolean;
    issuer_name?: string;
}

export interface CertificateGenerateRequest {
    course_id: string;
    user_id: string;
    template_id?: string;
    grade?: string;
}

export interface CertificateVerifyResponse {
    is_valid: boolean;
    certificate?: Certificate;
    message: string;
}

export interface CertificateTemplate {
    id: string;
    course_id?: string;
    created_by: string;
    name: string;
    description?: string;
    design_config: string;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    creator_name?: string;
}

export interface CertificateTemplateCreate {
    course_id?: string;
    name: string;
    description?: string;
    design_config: string;
    is_default: boolean;
    is_active: boolean;
}

export interface CertificateTemplateUpdate {
    name?: string;
    description?: string;
    design_config?: string;
    is_default?: boolean;
    is_active?: boolean;
}

