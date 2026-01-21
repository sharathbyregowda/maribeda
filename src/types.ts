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
