import * as vscode from 'vscode';
import { ExtensionContext, WorkflowOptions } from '../types/ExtensionContext';
import { ChatParticipantService } from './chat/ChatParticipantService';

/**
 * Simplified Copilot Integration Service
 * Coordinates between webview and chat participant
 */
export class CopilotIntegrationService {
  private chatParticipantService: ChatParticipantService;
  private updateCallback?: (type: string, data: any) => void;

  constructor(private context: ExtensionContext) {
    this.chatParticipantService = new ChatParticipantService(context);
    this.chatParticipantService.registerChatParticipant();
  }

  /**
   * Set callback for real-time updates
   */
  public setUpdateCallback(callback: (type: string, data: any) => void): void {
    this.updateCallback = callback;
    this.chatParticipantService.setUpdateCallback(callback);
  }

  /**
   * Execute workflow through chat participant
   */
  public async executeWorkflow(
    options: WorkflowOptions,
    callbacks?: {
      onProgress?: (step: string, message: string) => void;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.context.logger.info('Starting workflow execution via Copilot');
      
      // Report progress
      if (callbacks?.onProgress) {
        callbacks.onProgress('initializing', 'Opening chat interface...');
      }

      // Store options globally for chat participant to pick up
      (global as any).currentWorkflowOptions = options;

      // Open chat panel
      await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
      
      if (callbacks?.onProgress) {
        callbacks.onProgress('launching', 'Launching chat participant...');
      }

      // Create a new chat
      await vscode.commands.executeCommand('workbench.action.chat.newChat');
      
      // Build the initial chat command
      // Include a marker that tells our participant this is a multi-turn workflow
      let chatCommand = `@content-creator [WORKFLOW START]\n${options.contentGoal}`;
      
      // If there are inputs, include a summary in the chat message
      if (options.inputs && options.inputs.length > 0) {
        chatCommand += `\n\nInputs provided: ${options.inputs.length} file(s)`;
        chatCommand += `\nMode: ${options.interactiveMode ? 'Interactive' : 'Automated'}`;
      }
      
      // Type the command (simulate user input)
      await vscode.commands.executeCommand('type', { text: chatCommand });
      
      if (callbacks?.onProgress) {
        callbacks.onProgress('executing', 'Workflow executing in chat panel...');
      }
      
      // Submit the chat
      await vscode.commands.executeCommand('workbench.action.chat.submit');
      
      return {
        success: true,
      };
    } catch (error) {
      this.context.logger.error('Failed to execute workflow', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get chat participant status
   */
  public getChatParticipantStatus(): { isSupported: boolean; isRegistered: boolean } {
    return this.chatParticipantService.getParticipantStatus();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.chatParticipantService.dispose();
  }
}