export type Post = {
  id: number;
  title: string | null;
  body: string;
  created_at: string;
  status: string;
};

export type PostInfo = {
  post: Post;
  down_votes: number;
  up_votes: number;
};

export type ComposerState = {
  title: string;
  body: string;
};

export type FeedSort = "latest" | "affirmed" | "engaged";
export type ViewMode = "home" | "compose" | "about" | "contact" | "admin";
