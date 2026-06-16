import type { UserProfile } from "@workspace/api-client-react";
import { httpRequest } from "@/lib/http-client";

export type FeedComment = {
  id: number;
  postId: number;
  authorId: number;
  content: string;
  createdAt: string;
  author: UserProfile | null;
};

export type FeedPost = {
  id: number;
  authorId: number;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  postType: "update" | "job";
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  comments: FeedComment[];
  createdAt: string;
  updatedAt?: string;
  author: UserProfile | null;
};

export type FeedContributor = {
  authorId: number;
  postCount: number;
  author: UserProfile | null;
};

export type FeedContributorsResponse = {
  items: FeedContributor[];
};

export type FeedListResponse = {
  items: FeedPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const FEED_PAGE_SIZE = 10;

export const feedApi = {
  listPosts: (page = 1, limit = FEED_PAGE_SIZE) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return httpRequest<FeedListResponse>(`/posts?${params.toString()}`);
  },
  listContributors: (limit = 5) =>
    httpRequest<FeedContributorsResponse>(`/posts/contributors?limit=${limit}`),
  createPost: (body: {
    content: string;
    imageUrl?: string | null;
    videoUrl?: string | null;
    linkUrl?: string | null;
    linkLabel?: string | null;
    postType?: "update" | "job";
  }) =>
    httpRequest<FeedPost>("/posts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  toggleLike: (postId: number) =>
    httpRequest<FeedPost>(`/posts/${postId}/like`, { method: "POST" }),
  addComment: (postId: number, content: string) =>
    httpRequest<{ comment: FeedComment; post: FeedPost }>(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  uploadMedia: (data: string, mimeType: string) =>
    httpRequest<{ url: string; kind: "image" | "video" }>("/posts/media", {
      method: "POST",
      body: JSON.stringify({ data, mimeType }),
    }),
  deletePost: (id: number) =>
    httpRequest<void>(`/posts/${id}`, { method: "DELETE" }),
  updatePost: (
    id: number,
    body: {
      content: string;
      imageUrl?: string | null;
      videoUrl?: string | null;
      linkUrl?: string | null;
      linkLabel?: string | null;
      postType?: "update" | "job";
    },
  ) =>
    httpRequest<FeedPost>(`/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

export const FEED_QUERY_KEYS = {
  list: (page: number, limit = FEED_PAGE_SIZE) => ["/api/posts", { page, limit }] as const,
  contributors: ["/api/posts/contributors"] as const,
};
