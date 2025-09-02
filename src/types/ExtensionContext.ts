import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';
import { ConfigurationManager } from '../config/ConfigurationManager';

/**
 * Extended context interface for the extension
 */
export interface ExtensionContext {
  vscodeContext: vscode.ExtensionContext;
  logger: Logger;
  configManager: ConfigurationManager;
}

/**
 * Message types for webview communication
 */
export enum MessageType {
  // From extension to webview
  UPDATE_THEME = 'updateTheme',
  UPDATE_CONFIG = 'updateConfig',
  SHOW_MESSAGE = 'showMessage',
  GENERATION_STATUS = 'generationStatus',
  GENERATION_COMPLETE = 'generationComplete',
  UPDATE_CONTENT = 'updateContent',

  // From webview to extension
  LOG_MESSAGE = 'logMessage',
  READY = 'ready',
  GENERATE_CONTENT = 'generateContent',
  SELECT_FILES = 'selectFiles',
}

/**
 * Base message interface
 */
export interface Message {
  type: MessageType;
  payload?: any;
}

/**
 * Webview message from webview to extension
 */
export interface WebviewMessage extends Message {
  id?: string; // For request-response pattern
}

/**
 * Extension message from extension to webview
 */
export interface ExtensionMessage extends Message {
  id?: string; // For request-response pattern
  timestamp?: number;
}

/**
 * Configuration interface
 */
export interface ExtensionConfiguration {
  enableDebugMode: boolean;
  theme: 'auto' | 'light' | 'dark';
}

/**
 * Webview state interface
 */
export interface WebviewState {
  data?: any;
  theme?: string;
  isReady: boolean;
}

/**
 * Content generation request
 */
export interface ContentRequest {
  contentGoal: string;
  inputs: Array<{
    id: string;
    name: string;
    type: string;
    uri: string;
  }>;
}

/**
 * Pattern selection result
 */
export interface PatternSelection {
  patternId: string;
  patternName: string;
  reasoning: string;
  requiredSections: string[];
  audienceAlignment: string;
  alternativePatterns: Array<{
    patternId: string;
    reason: string;
  }>;
}

/**
 * Generated content result
 */
export interface GeneratedContent {
  content: string;
  title: string;
  filename: string;
  frontMatter: {
    title: string;
    description: string;
    author: string;
    'ms.topic': string;
    'ms.date': string;
  };
  metadata: {
    wordCount: number;
    readingTime: number;
    technicalLevel: string;
  };
}
