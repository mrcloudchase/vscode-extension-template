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
  UPDATE_CONTENT = 'updateContent',
  UPDATE_THEME = 'updateTheme',
  UPDATE_CONFIG = 'updateConfig',
  SHOW_MESSAGE = 'showMessage',
  WORKFLOW_STATUS = 'workflowStatus',
  WORKFLOW_COMPLETE = 'workflowComplete',
  COPILOT_INPUT = 'copilotInput',
  COPILOT_OUTPUT = 'copilotOutput',

  // From webview to extension
  LOG_MESSAGE = 'logMessage',
  READY = 'ready',
  EXECUTE_WORKFLOW = 'executeWorkflow',
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
 * Workflow execution options
 */
export interface WorkflowOptions {
  contentGoal: string;
  inputs: Array<{
    id: string;
    name: string;
    type: string;
    uri: string;
  }>;
  interactiveMode: boolean;
}
