import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { ChatParticipantService } from './chat/ChatParticipantService';
import { InputFile, ProcessedContent } from '../models/InputModels';
import { OrchestrationResult } from '../models/OrchestrationModels';
import { InputHandlerService } from './InputHandlerService';
import { WorkflowContextManager } from './WorkflowContextManager';
import { COMMAND_IDS } from '../constants';

/**
 * Main service for integrating with VS Code Chat Participant API
 * Orchestrates the new sequential workflow approach
 */
export default class CopilotIntegrationService {
  private chatParticipant: ChatParticipantService;
  private inputHandler: InputHandlerService;
  private contextManager: WorkflowContextManager;
  private processedContents: ProcessedContent[] = [];

  constructor(private context: ExtensionContext) {
    this.contextManager = new WorkflowContextManager(context);
    this.chatParticipant = new ChatParticipantService(context, this.contextManager);
    this.inputHandler = new InputHandlerService(context);

    // Register the chat participant on initialization
    this.chatParticipant.registerChatParticipant();
  }

  /**
   * Process input files and trigger content creation workflow
   * This method is called from the webview when users submit content requests
   */
  async createNewContent(
    contentRequest: string,
    inputs: InputFile[],
    options?: {
      onProgress?: (step: string, message: string) => void;
    }
  ): Promise<OrchestrationResult> {
    try {
      this.context.logger.info('Starting content creation workflow from webview');

      // Process input files first
      if (inputs && inputs.length > 0) {
        options?.onProgress?.('Processing', 'Processing input files...');
        this.processedContents = await this.inputHandler.processInputs(inputs);
        this.context.logger.info(`Processed ${this.processedContents.length} input files`);
      }

      options?.onProgress?.('Preparing', 'Storing workflow context...');

      // Store context for handoff to chat participant
      const contextId = this.contextManager.storeContext(
        contentRequest,
        this.processedContents,
        inputs,
        {}
      );

      // Generate chat query with context ID
      const chatQuery = this.contextManager.generateChatQuery(contextId);

      options?.onProgress?.('Launching', 'Opening chat participant...');

      await vscode.commands.executeCommand(COMMAND_IDS.OPEN_CHAT, {
        query: chatQuery,
      });

      // Return success indicating that the chat workflow has been initiated
      return {
        success: true,
        action: 'INITIATED',
        steps: {},
        message: `Chat participant launched with context ${contextId}. The workflow will continue in the chat interface with full access to your files and VS Code workspace.`,
      };
    } catch (error) {
      this.context.logger.error('Failed to initiate content creation workflow:', error);
      return {
        success: false,
        action: 'FAILED',
        steps: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the processed contents from input files
   * This can be called by the chat participant to access file contents
   */
  public getProcessedContents(): ProcessedContent[] {
    return this.processedContents;
  }

  /**
   * Clear processed contents
   */
  public clearProcessedContents(): void {
    this.processedContents = [];
  }

  /**
   * Get chat participant status
   */
  public getChatParticipantStatus(): { isSupported: boolean; isRegistered: boolean } {
    return this.chatParticipant.getParticipantStatus();
  }
}
