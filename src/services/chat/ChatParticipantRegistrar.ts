import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';
import { CHAT_PARTICIPANT } from '../../constants';

/**
 * Handles registration and lifecycle of the VS Code Chat Participant
 * Single responsibility: Chat Participant API integration
 */
export class ChatParticipantRegistrar {
  private participant: vscode.ChatParticipant | undefined;

  constructor(
    private context: ExtensionContext,
    private requestHandler: (
      request: vscode.ChatRequest,
      context: vscode.ChatContext,
      stream: vscode.ChatResponseStream,
      token: vscode.CancellationToken
    ) => Promise<vscode.ChatResult>
  ) {}

  /**
   * Register the chat participant using VS Code's official API
   */
  public register(): void {
    try {
      if (!vscode.chat || !vscode.chat.createChatParticipant) {
        this.context.logger.warn('Chat Participant API not available in this VS Code version');
        return;
      }

      this.participant = vscode.chat.createChatParticipant(
        CHAT_PARTICIPANT.ID,
        this.requestHandler
      );

      this.participant.iconPath = new vscode.ThemeIcon('file-text');

      this.context.vscodeContext.subscriptions.push(this.participant);
      this.context.logger.info('Chat Participant registered successfully');
    } catch (error) {
      this.context.logger.error('Failed to register chat participant:', error);
    }
  }

  /**
   * Get participant status
   */
  public getStatus(): { isSupported: boolean; isRegistered: boolean } {
    return {
      isSupported: !!(vscode.chat && vscode.chat.createChatParticipant),
      isRegistered: !!this.participant,
    };
  }

  /**
   * Dispose the participant
   */
  public dispose(): void {
    if (this.participant) {
      this.participant.dispose();
      this.participant = undefined;
    }
  }
}
