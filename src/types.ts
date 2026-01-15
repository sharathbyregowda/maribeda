export interface Note {
  id: number;
  title: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title?: string;
  content: string;
}
