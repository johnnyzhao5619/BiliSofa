export type CommentSort = 'hot' | 'new';
export interface CommentText { author: string; text: string; createdAt: number; likes: number; replies: number; pinned: boolean; }
export interface CommentCard extends CommentText { key: string; }
export type CommentQuery = { kind: 'roots'; sort: CommentSort; page: number; refresh: boolean } | { kind: 'replies'; rootKey: string; page: number };
export interface CommentPage { kind: 'roots' | 'replies'; sort: CommentSort; page: number; items: CommentCard[]; noMore: boolean; limited: boolean; closed: boolean; }
export interface CommentAccess { read(query: CommentQuery, signal: AbortSignal): Promise<CommentPage>; close(): Promise<void>; }
