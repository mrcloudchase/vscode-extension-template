import * as vscode from 'vscode';
import { ExtensionContext, ExtensionMessage, MessageType, WorkflowOptions } from '../../types/ExtensionContext';

/**
 * Processes workflow execution requests
 * Single responsibility: Workflow initiation and status reporting
 */
export class InputProcessor {
  private copilotService: any | undefined;

  constructor(
    private context: ExtensionContext,
    private sendMessage: (message: ExtensionMessage) => Promise<void>
  ) {}

  /**
   * Handle workflow execution request
   */
  public async executeWorkflow(options: WorkflowOptions, messageId?: string): Promise<void> {
    try {
      // Initialize CopilotIntegrationService if not already done (lazy loading)
      if (!this.copilotService) {
        this.context.logger.debug('Lazy loading CopilotIntegrationService...');
        const { CopilotIntegrationService } = await import('../../services/CopilotIntegrationService');
        this.copilotService = new CopilotIntegrationService(this.context);
        this.context.logger.debug('CopilotIntegrationService loaded successfully');
      }

      // Send processing status
      await this.sendMessage({
        type: MessageType.WORKFLOW_STATUS,
        payload: { 
          message: 'Preparing workflow execution...',
          step: 0,
          stepName: 'Initialization'
        },
      });

      // Execute workflow through chat participant
      const result = await this.copilotService.executeWorkflow(options, {
        onProgress: (step: string, message: string) => {
          // Send real-time progress updates to webview
          this.sendMessage({
            type: MessageType.WORKFLOW_STATUS,
            payload: { message },
          });
        },
      });

      // Send completion message
      await this.sendMessage({
        type: MessageType.WORKFLOW_COMPLETE,
        payload: {
          success: result.success,
          error: result.error,
          message: result.success 
            ? 'Workflow initiated successfully. Check the chat panel for progress.'
            : `Failed to initiate workflow: ${result.error}`,
        },
        id: messageId,
      });

      // Show chat participant status if there's an issue
      if (!result.success) {
        await this.showChatParticipantStatus();
      }
    } catch (error) {
      this.context.logger.error('Failed to execute workflow', error);

      await this.sendMessage({
        type: MessageType.WORKFLOW_COMPLETE,
        payload: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        id: messageId,
      });
    }
  }

  /**
   * Show chat participant status messages
   */
  private async showChatParticipantStatus(): Promise<void> {
    const chatStatus = this.copilotService.getChatParticipantStatus();
    if (!chatStatus.isSupported) {
      await this.sendMessage({
        type: MessageType.SHOW_MESSAGE,
        payload: {
          type: 'warning',
          text: 'Chat Participant API not supported in this VS Code version. Please update VS Code.',
        },
      });
    } else if (!chatStatus.isRegistered) {
      await this.sendMessage({
        type: MessageType.SHOW_MESSAGE,
        payload: {
          type: 'error',
          text: 'Chat Participant failed to register. Please restart the extension.',
        },
      });
    }
  }
}
