export interface Quiz {
    id: string;
    course_id: string;
    created_by: string;
    title: string;
    description?: string;
    start_time?: string;  // When quiz becomes available
    end_time?: string;  // When quiz closes
    time_limit_minutes?: number;  // Time limit for the quiz
    max_attempts: number;
    passing_score: number;
    is_published: boolean;
    shuffle_questions: boolean;
    created_at: string;
    updated_at: string;
    due_date?: string;  // Deprecated
    question_count?: number;
    creator_name?: string;
    user_attempt_count?: number;  // Number of submitted attempts by current user
    has_submitted?: boolean;  // Whether user has submitted at least one attempt
}


export interface QuizCreate {
    course_id: string;
    title: string;
    description?: string;
    start_time?: string;  // ISO datetime string
    end_time?: string;  // ISO datetime string
    max_attempts: number;
    passing_score: number;
    is_published: boolean;
    shuffle_questions: boolean;
    due_date?: string;  // Deprecated
}

export interface QuizUpdate {
    title?: string;
    description?: string;
    start_time?: string;  // ISO datetime string
    end_time?: string;  // ISO datetime string
    max_attempts?: number;
    passing_score?: number;
    is_published?: boolean;
    shuffle_questions?: boolean;
    due_date?: string;  // Deprecated
}

export interface QuizQuestion {
    id: string;
    quiz_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correct_answer?: string;
    points: number;
    order_index: number;
    explanation?: string;
    created_at: string;
}

export interface QuizQuestionCreate {
    quiz_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correct_answer: string;
    points: number;
    order_index: number;
    explanation?: string;
}

export interface QuizQuestionUpdate {
    question_text?: string;
    question_type?: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correct_answer?: string;
    points?: number;
    order_index?: number;
    explanation?: string;
}

export interface QuizAttempt {
    id: string;
    quiz_id: string;
    user_id: string;
    score?: number;
    percentage?: number;
    is_passed?: boolean;
    time_taken_seconds?: number;
    started_at: string;
    submitted_at?: string;
    user_name?: string;
}

export interface QuizAnswer {
    id: string;
    attempt_id: string;
    question_id: string;
    answer_text: string;
    is_correct?: boolean;
    points_earned: number;
    created_at: string;
    question?: QuizQuestion;
}

export interface QuizAnswerSubmit {
    question_id: string;
    answer_text: string;
}

export interface QuizSubmitRequest {
    answers: QuizAnswerSubmit[];
}

export interface QuizAttemptDetail extends QuizAttempt {
    answers: QuizAnswer[];
    quiz?: Quiz;
}

export interface QuizWithQuestions extends Quiz {
    questions: QuizQuestion[];
}

export interface QuizAttemptWithQuestions extends QuizAttempt {
    quiz?: QuizWithQuestions;
    answers: QuizAnswer[];
}
