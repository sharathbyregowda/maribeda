export interface Note {
  id: number;
  title: string | null;
  content: string;
  isPinned: boolean;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title?: string;
  content: string;
}

export interface LinkPreview {
  id: number;
  noteId: number;
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  fetchedAt: string;
}
