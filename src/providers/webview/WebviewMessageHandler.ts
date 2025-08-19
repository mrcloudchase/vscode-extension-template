import * as vscode from 'vscode';
import {
  ExtensionContext,
  WebviewMessage,
  ExtensionMessage,
  MessageType,
  WebviewState,
} from '../../types/ExtensionContext';
import { InputFile, InputType } from '../../models/InputModels';
import { InputProcessor } from './InputProcessor';

/**
 * Handles webview message routing and basic operations
 * Single responsibility: Message routing and basic webview operations
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

      case MessageType.PROCESS_INPUTS:
        await this.handleProcessInputs(message);
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

    // Send initial data
    await this.sendMessage({
      type: MessageType.UPDATE_CONTENT,
      payload: {
        title: 'AI Content Developer',
        content: 'Create professional technical documentation with AI assistance.',
      },
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
   * Handle file selection
   */
  private async handleSelectFiles(message: WebviewMessage): Promise<void> {
    try {
      const options: vscode.OpenDialogOptions = {
        canSelectMany: true,
        filters: {
          Documents: ['docx', 'doc', 'pdf', 'pptx', 'ppt', 'txt', 'md'],
          'All Files': ['*'],
        },
      };

      const fileUris = await vscode.window.showOpenDialog(options);

      if (fileUris && fileUris.length > 0) {
        const files: InputFile[] = fileUris.map((uri) => ({
          uri: uri.toString(),
          name: uri.path.split('/').pop() || 'Unknown',
          type: InputType.UNKNOWN,
        }));

        await this.sendMessage({
          type: MessageType.UPDATE_CONTENT,
          payload: { files },
          id: message.id,
        });
      }
    } catch (error) {
      this.context.logger.error('Failed to select files', error);
    }
  }

  /**
   * Handle input processing by delegating to InputProcessor
   */
  private async handleProcessInputs(message: WebviewMessage): Promise<void> {
    const { goal, inputs } = message.payload as {
      goal: string;
      inputs: InputFile[];
    };

    await this.inputProcessor.processInputs(goal, inputs, message.id);
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
