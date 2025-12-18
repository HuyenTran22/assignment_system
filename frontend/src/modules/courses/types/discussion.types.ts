export interface DiscussionThread {
    id: string;
    course_id: string;
    user_id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    is_locked: boolean;
    view_count: number;
    reply_count: number;
    created_at: string;
    updated_at: string;
    author_name?: string;
}

export interface DiscussionThreadCreate {
    course_id: string;
    title: string;
    content: string;
}

export interface DiscussionThreadUpdate {
    title?: string;
    content?: string;
    is_pinned?: boolean;
    is_locked?: boolean;
}

export interface DiscussionReply {
    id: string;
    thread_id: string;
    user_id: string;
    parent_reply_id?: string;
    content: string;
    created_at: string;
    updated_at: string;
    author_name?: string;
    child_replies?: DiscussionReply[];
}

export interface DiscussionReplyCreate {
    thread_id: string;
    parent_reply_id?: string;
    content: string;
}

export interface DiscussionReplyUpdate {
    content?: string;
}

export interface DiscussionThreadDetail extends DiscussionThread {
    replies: DiscussionReply[];
}

