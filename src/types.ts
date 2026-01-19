export interface Note {
  id: number;
  title: string | null;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title?: string;
  content: string;
}
