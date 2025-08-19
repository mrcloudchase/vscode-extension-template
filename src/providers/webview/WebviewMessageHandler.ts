import * as vscode from 'vscode';
import {
  ExtensionContext,
  WebviewMessage,
  ExtensionMessage,
  MessageType,
  WebviewState,
  WorkflowOptions,
} from '../../types/ExtensionContext';
import { InputProcessor } from './InputProcessor';

/**
 * Handles webview message routing and workflow execution
 * Single responsibility: Message routing and workflow coordination
 */
export class WebviewMessageHandler {
  private state: WebviewState = { isReady: false };
  private inputProcessor: InputProcessor;

  constructor(
    private context: ExtensionContext,
    private sendMessage: (message: ExtensionMessage) => Promise<void>
  ) {
    this.inputProcessor = new InputProcessor(context, sendMessage);
  }

  /**
   * Handle incoming messages from webview
   */
  public async handleMessage(message: WebviewMessage): Promise<void> {
    this.context.logger.debug(`Received message from webview: ${message.type}`);

    switch (message.type) {
      case MessageType.READY:
        this.state.isReady = true;
        await this.initializeWebview();
        break;

      case MessageType.LOG_MESSAGE:
        this.handleLogMessage(message);
        break;

      case MessageType.EXECUTE_WORKFLOW:
        await this.handleExecuteWorkflow(message);
        break;

      case MessageType.SELECT_FILES:
        await this.handleSelectFiles(message);
        break;

      default:
        this.context.logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Initialize webview after it's ready
   */
  private async initializeWebview(): Promise<void> {
    // Send initial configuration
    await this.notifyConfigurationChange();

    // Send theme information
    const theme =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';
    await this.sendMessage({
      type: MessageType.UPDATE_THEME,
      payload: { theme },
    });

    this.context.logger.info('Webview initialized');
  }

  /**
   * Notify webview of configuration changes
   */
  public async notifyConfigurationChange(): Promise<void> {
    const config = this.context.configManager.getConfiguration();
    await this.sendMessage({
      type: MessageType.UPDATE_CONFIG,
      payload: config,
    });
  }

  /**
   * Handle log messages from webview
   */
  private handleLogMessage(message: WebviewMessage): void {
    const { level, text, data } = message.payload as {
      level: string;
      text: string;
      data?: unknown;
    };

    switch (level) {
      case 'debug':
        this.context.logger.debug(text, data);
        break;
      case 'info':
        this.context.logger.info(text, data);
        break;
      case 'warn':
        this.context.logger.warn(text, data);
        break;
      case 'error':
        this.context.logger.error(text, data);
        break;
    }
  }

  /**
   * Handle workflow execution request
   */
  private async handleExecuteWorkflow(message: WebviewMessage): Promise<void> {
    const options = message.payload as WorkflowOptions;
    
    this.context.logger.info(`Executing workflow: ${options.contentGoal}`);
    this.context.logger.info(`Interactive mode: ${options.interactiveMode}`);
    this.context.logger.info(`Inputs: ${options.inputs.length} items`);

    // Delegate to InputProcessor
    await this.inputProcessor.executeWorkflow(options, message.id);
  }

  /**
   * Handle file selection
   */
  private async handleSelectFiles(message: WebviewMessage): Promise<void> {
    try {
      const options: vscode.OpenDialogOptions = {
        canSelectMany: true,
        filters: {
          'Documents': ['md', 'markdown', 'txt', 'doc', 'docx', 'pdf', 'ppt', 'pptx'],
          'Images': ['png', 'jpg', 'jpeg', 'gif', 'svg'],
          'All Files': ['*']
        }
      };

      const fileUris = await vscode.window.showOpenDialog(options);

      if (fileUris && fileUris.length > 0) {
        const files = fileUris.map(uri => {
          const name = uri.path.split('/').pop() || 'Unknown';
          const ext = name.split('.').pop()?.toLowerCase() || '';
          
          let type = 'file';
          if (['md', 'markdown'].includes(ext)) type = 'markdown';
          else if (['doc', 'docx'].includes(ext)) type = 'word';
          else if (ext === 'pdf') type = 'pdf';
          else if (['ppt', 'pptx'].includes(ext)) type = 'powerpoint';
          else if (ext === 'txt') type = 'text';
          else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) type = 'image';
          
          return {
            name,
            type,
            uri: uri.toString()
          };
        });

        await this.sendMessage({
          type: MessageType.UPDATE_CONTENT,
          payload: { files },
          id: message.id
        });
      }
    } catch (error) {
      this.context.logger.error('Failed to select files', error);
    }
  }

  /**
   * Get current state
   */
  public getState(): WebviewState {
    return { ...this.state };
  }

  /**
   * Check if webview is ready
   */
  public isReady(): boolean {
    return this.state.isReady;
  }
}
