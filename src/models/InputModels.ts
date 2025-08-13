/**
 * Models for various input types and processing results
 */

export enum InputType {
  WORD_DOC = 'word',
  PDF = 'pdf',
  POWERPOINT = 'powerpoint',
  GITHUB_PR = 'github_pr',
  URL = 'url',
  TEXT = 'text',
  UNKNOWN = 'unknown',
}

export interface InputFile {
  uri: string;
  name: string;
  type: InputType;
  size?: number;
}

export interface ProcessedContent {
  source: string;
  type: InputType;
  text: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface ProcessingResult {
  success: boolean;
  content?: ProcessedContent;
  error?: string;
}

export interface ChatRequest {
  goal: string;
  inputs: InputFile[];
  processedContents?: ProcessedContent[];
  context?: string;
}

export interface ChatResponse {
  response: string;
  sources?: string[];
  timestamp: Date;
}

export interface GitHubPRInfo {
  owner: string;
  repo: string;
  prNumber: number;
}

export interface URLContent {
  url: string;
  title?: string;
  content: string;
  contentType?: string;
}
