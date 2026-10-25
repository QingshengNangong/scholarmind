
// Data structures for the application

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export type SupportedLanguage = 'Chinese' | 'Spanish' | 'French' | 'German' | 'Japanese' | 'Portuguese' | 'Korean';

export type UILanguage = 'en' | 'zh' | 'ko' | 'ja';

export interface Entity {
  name: string;
  category: string; // e.g., METHOD, METRIC, TASK, ORG
  count: number;
}

export interface TermDefinition {
  term: string;
  definition: string;
}

export interface Keyword {
  word: string;
  score: number; // 0-100 relevance
}

export interface DifficultyStats {
  score: number; // 0-100
  level: string; // e.g., "Intermediate", "Advanced"
  avgSentenceLength: number;
  technicalTermDensity: number;
  explanation: string;
}

export interface ConceptNode {
  id: string;
  group: number;
  radius?: number;
}

export interface ConceptLink {
  source: string;
  target: string;
  relation: string;
  value: number;
}

export interface ConceptGraphData {
  nodes: ConceptNode[];
  links: ConceptLink[];
}

export interface AnalysisResult {
  summary: string;
  entities: Entity[];
  definitions: TermDefinition[];
  keywords: Keyword[];
  difficulty: DifficultyStats;
  conceptGraph: ConceptGraphData;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface RelatedPaper {
  title: string;
  url: string;
  snippet: string;
}

export interface CustomAIConfig {
  isEnabled: boolean;
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
}

export interface ModelOption {
  id: string;
  name: string;
}

export interface SearchResult {
  text: string;
  sources: { title: string; url: string }[];
}
