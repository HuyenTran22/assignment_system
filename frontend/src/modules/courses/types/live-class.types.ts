export interface LiveSession {
    id: string;
    course_id: string;
    created_by: string;
    title: string;
    description?: string;
    meeting_url?: string;
    meeting_id?: string;
    meeting_password?: string;
    scheduled_start: string;
    scheduled_end: string;
    actual_start?: string;
    actual_end?: string;
    status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
    is_recorded: boolean;
    max_participants?: number;
    created_at: string;
    updated_at: string;
    creator_name?: string;
    attendance_count?: number;
    extra_data?: Record<string, any>;
}

export interface LiveSessionCreate {
    course_id: string;
    title: string;
    description?: string;
    meeting_url?: string;
    meeting_id?: string;
    meeting_password?: string;
    scheduled_start: string;
    scheduled_end: string;
    max_participants?: number;
    is_recorded: boolean;
    extra_data?: Record<string, any>;
}

export interface LiveSessionUpdate {
    title?: string;
    description?: string;
    meeting_url?: string;
    meeting_id?: string;
    meeting_password?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    max_participants?: number;
    is_recorded?: boolean;
    status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
    metadata?: Record<string, any>;
}

export interface SessionAttendance {
    id: string;
    session_id: string;
    user_id: string;
    joined_at: string;
    left_at?: string;
    duration_minutes?: number;
    user_name?: string;
}

export interface SessionRecording {
    id: string;
    session_id: string;
    recording_url: string;
    recording_type: string;
    file_size_bytes?: number;
    duration_seconds?: number;
    created_at: string;
}

export interface LiveSessionDetail extends LiveSession {
    attendance: SessionAttendance[];
    recordings: SessionRecording[];
}

export interface SessionRecordingCreate {
    session_id: string;
    recording_url: string;
    recording_type: string;
    file_size_bytes?: number;
    duration_seconds?: number;
}

