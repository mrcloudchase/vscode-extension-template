import { ExtensionContext } from '../../types/ExtensionContext';
import { WorkflowContextManager } from '../WorkflowContextManager';
import { ChatParticipantRegistrar } from './ChatParticipantRegistrar';
import { ChatRequestRouter } from './ChatRequestRouter';

/**
 * Main Chat Participant Service - coordinates all chat-related functionality
 * Single responsibility: Chat participant lifecycle management and coordination
 */
export class ChatParticipantService {
  private registrar: ChatParticipantRegistrar;
  private router: ChatRequestRouter;

  constructor(
    private context: ExtensionContext,
    private contextManager: WorkflowContextManager
  ) {
    this.router = new ChatRequestRouter(context, contextManager);
    this.registrar = new ChatParticipantRegistrar(
      context,
      this.router.handleRequest.bind(this.router)
    );
  }

  /**
   * Register the chat participant
   */
  public registerChatParticipant(): void {
    this.registrar.register();
  }

  /**
   * Get participant status
   */
  public getParticipantStatus(): { isSupported: boolean; isRegistered: boolean } {
    return this.registrar.getStatus();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.registrar.dispose();
  }
}
