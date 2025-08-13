import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { ChatParticipantService } from './ChatParticipantService';
import { InputFile, ProcessedContent } from '../models/InputModels';
import { OrchestrationResult } from '../models/OrchestrationModels';
import { InputHandlerService } from './InputHandlerService';

/**
 * Main service for integrating with VS Code Chat Participant API
 * Orchestrates the new sequential workflow approach
 */
export default class CopilotIntegrationService {
  private chatParticipant: ChatParticipantService;
  private inputHandler: InputHandlerService;
  private processedContents: ProcessedContent[] = [];

  constructor(private context: ExtensionContext) {
    this.chatParticipant = new ChatParticipantService(context);
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
      audience?: string;
      contentType?: string;
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

      // For webview requests, we need to open the chat and guide the user to use the chat participant
      // The actual workflow will be handled by the ChatParticipantService when user interacts with @content-creator

      // Prepare the enhanced content request with processed inputs
      let enhancedRequest = contentRequest;
      
      if (this.processedContents.length > 0) {
        enhancedRequest += '\n\n**Input Materials:**\n';
        for (const content of this.processedContents) {
          enhancedRequest += `- ${content.source}: ${content.text.substring(0, 200)}...\n`;
        }
      }

      if (options?.audience) {
        enhancedRequest += `\n**Target Audience:** ${options.audience}`;
      }
      
      if (options?.contentType) {
        enhancedRequest += `\n**Content Type:** ${options.contentType}`;
      }

      // Open chat with the enhanced request
      const chatQuery = `@content-creator ${enhancedRequest}`;
      
      options?.onProgress?.('Launching', 'Opening chat participant...');
      
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: chatQuery
      });

      // Return success indicating that the chat workflow has been initiated
      return {
        success: true,
        action: 'INITIATED',
        steps: {},
        message: 'Chat participant workflow initiated. The sequential content creation process will continue in the chat interface.'
      };

    } catch (error) {
      this.context.logger.error('Failed to initiate content creation workflow:', error);
      return {
        success: false,
        action: 'FAILED',
        steps: {},
        error: error instanceof Error ? error.message : String(error)
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

  /**
   * Legacy method - now redirects to new workflow
   * @deprecated Use createNewContent instead
   */
  public async sendToCopilot(request: any): Promise<any> {
    this.context.logger.warn('sendToCopilot is deprecated, redirecting to new workflow');
    
    const contentRequest = request.message || request.prompt || 'Create documentation';
    const inputs = request.inputs || [];
    
    return this.createNewContent(contentRequest, inputs);
  }
}