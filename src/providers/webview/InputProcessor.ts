import * as vscode from 'vscode';
import { ExtensionContext, ExtensionMessage, MessageType } from '../../types/ExtensionContext';
import { InputFile } from '../../models/InputModels';

/**
 * Processes input files and launches AI workflow
 * Single responsibility: Input processing and workflow initiation
 */
export class InputProcessor {
  private copilotService: any | undefined;

  constructor(
    private context: ExtensionContext,
    private sendMessage: (message: ExtensionMessage) => Promise<void>
  ) {}

  /**
   * Handle input processing - launches AI workflow
   */
  public async processInputs(goal: string, inputs: InputFile[], messageId?: string): Promise<void> {
    try {
      // Initialize CopilotIntegrationService if not already done (lazy loading)
      if (!this.copilotService) {
        this.context.logger.debug('Lazy loading CopilotIntegrationService...');
        const CopilotIntegrationService = (await import('../../services/CopilotIntegrationService'))
          .default;
        this.copilotService = new CopilotIntegrationService(this.context);
        this.context.logger.debug('CopilotIntegrationService loaded successfully');
      }

      // Send processing status
      await this.sendMessage({
        type: MessageType.PROCESSING_STATUS,
        payload: { status: 'processing', message: 'Preparing content request...' },
      });

      // Use the Chat Participant workflow
      const result = await this.copilotService.createNewContent(goal, inputs, {
        onProgress: (step: string, message: string) => {
          // Send real-time progress updates to webview
          this.sendMessage({
            type: MessageType.PROCESSING_STATUS,
            payload: { status: step, message },
          });
        },
      });

      // Send response back to webview
      await this.sendResponse(result, goal, inputs, messageId);

      // Show chat participant status
      await this.showChatParticipantStatus();
    } catch (error) {
      this.context.logger.error('Failed to process inputs', error);

      await this.sendMessage({
        type: MessageType.PROCESSING_STATUS,
        payload: {
          status: 'error',
          message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  }

  /**
   * Send response to webview after processing
   */
  private async sendResponse(
    result: any,
    goal: string,
    inputs: InputFile[],
    messageId?: string
  ): Promise<void> {
    const response = {
      response: result.success
        ? `🤖 **Chat Participant Activated!**\n\nYour request has been sent to the @content-creator chat participant. The sequential workflow will continue in the VS Code Chat interface.\n\n**Next Steps:**\n1. Check the Chat panel (should have opened automatically)\n2. The @content-creator participant will guide you through the workflow\n3. You'll see real-time progress as it analyzes your repository and creates content\n\n**Your Request:** ${goal}\n**Input Files:** ${inputs.length} file(s) processed`
        : `❌ **Failed to launch Chat Participant**\n\nError: ${result.error}\n\nPlease try again or check the extension logs for more details.`,
      sources: inputs.map((input) => input.name),
      timestamp: new Date(),
    };

    // Send response back to webview
    await this.sendMessage({
      type: MessageType.COPILOT_RESPONSE,
      payload: response,
      id: messageId,
    });

    // Show final status
    await this.sendMessage({
      type: MessageType.PROCESSING_STATUS,
      payload: {
        status: result.success ? 'launched' : 'error',
        message: result.success
          ? 'Chat participant launched! Continue in the Chat panel.'
          : `Error: ${result.error}`,
      },
    });
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
