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
  PROCESSING_STATUS = 'processingStatus',
  COPILOT_RESPONSE = 'copilotResponse',
  WORKFLOW_STEP_COMPLETE = 'workflowStepComplete',
  WORKFLOW_RESULT = 'workflowResult',
  CONTENT_CREATION_PROGRESS = 'contentCreationProgress',
  CONTENT_CREATION_RESULT = 'contentCreationResult',
  
  // From webview to extension
  REQUEST_DATA = 'requestData',
  SAVE_DATA = 'saveData',
  EXECUTE_COMMAND = 'executeCommand',
  LOG_MESSAGE = 'logMessage',
  READY = 'ready',
  PROCESS_INPUTS = 'processInputs',
  SELECT_FILES = 'selectFiles',
  EXECUTE_WORKFLOW = 'executeWorkflow',
  GET_WORKFLOWS = 'getWorkflows',
  CREATE_CONTENT = 'createContent',
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
