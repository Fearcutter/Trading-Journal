export interface PlaybookEntry {
  id: string;
  name: string;
  description: string;
  entryRules: string[];
  exitRules: string[];
  riskRules: string[];
  exampleScreenshots: string[]; // base64 images
  tags: string[];
  setupType: string;
  createdAt: string;
  updatedAt: string;
}
