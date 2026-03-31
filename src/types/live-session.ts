export interface LiveSession {
  id: string;
  name: string;
  description: string;
  instrument?: string;
  color: string; // tailwind color name e.g. 'blue', 'emerald'
  createdAt: string;
  updatedAt: string;
}
