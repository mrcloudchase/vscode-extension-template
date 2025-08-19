/**
 * Input type enumeration
 */
export enum InputType {
  FILE = 'file',
  URL = 'url',
  GITHUB_PR = 'github_pr',
  MARKDOWN = 'markdown',
  WORD = 'word',
  PDF = 'pdf',
  POWERPOINT = 'powerpoint',
  TEXT = 'text',
  IMAGE = 'image',
}

/**
 * Input file/source interface
 */
export interface InputSource {
  id: string;
  name: string;
  type: InputType;
  uri: string;
  content?: string;
}

/**
 * Processed input result
 */
export interface ProcessedInput {
  source: InputSource;
  extractedContent: string;
  metadata?: {
    [key: string]: any;
  };
}
