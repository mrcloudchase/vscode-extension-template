import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  ExtensionContext,
  WebviewMessage,
  ExtensionMessage,
  MessageType,
  ContentRequest,
} from '../types/ExtensionContext';
import { ContentGenerator } from '../services/ContentGenerator';
import { InputProcessor } from '../services/InputProcessor';

/**
 * Simplified webview provider for content generation
 */
export class WebviewProvider implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];
  private isReady = false;

  constructor(
    private context: ExtensionContext,
    private contentGenerator: ContentGenerator
  ) {
    // Set up monitor callback to forward to webview
    this.contentGenerator.setMonitorCallback((type: string, data: any) => {
      this.forwardMonitorMessage(type, data);
    });
  }

  /**
   * Create or show the webview panel
   */
  public createOrShow(): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel exists, reveal it
    if (this.panel) {
      this.panel.reveal(column);
      return;
    }

    // Create new panel
    this.panel = vscode.window.createWebviewPanel(
      'aiContentDeveloper',
      'AI Content Developer',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media')],
      }
    );

    this.setupPanel();
  }

  /**
   * Setup panel configuration and event handlers
   */
  private setupPanel(): void {
    if (!this.panel) return;

    // Set icon
    this.panel.iconPath = {
      light: vscode.Uri.joinPath(
        this.context.vscodeContext.extensionUri,
        'media',
        'icon-light.svg'
      ),
      dark: vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media', 'icon-dark.svg'),
    };

    // Set HTML content
    this.panel.webview.html = this.getWebviewContent();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(this.handleMessage.bind(this), null, this.disposables);

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        this.dispose();
      },
      null,
      this.disposables
    );
  }

  /**
   * Handle messages from webview
   */
  private async handleMessage(message: WebviewMessage): Promise<void> {
    this.context.logger.debug(`Received message from webview: ${message.type}`);

    switch (message.type) {
      case MessageType.READY:
        this.isReady = true;
        await this.initializeWebview();
        break;

      case MessageType.LOG_MESSAGE:
        this.handleLogMessage(message);
        break;

      case MessageType.GENERATE_CONTENT:
        await this.handleGenerateContent(message);
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
    // Send theme information
    const theme =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light';
    await this.sendMessage({
      type: MessageType.UPDATE_THEME,
      payload: { theme },
    });

    // Send configuration
    const config = this.context.configManager.getConfiguration();
    await this.sendMessage({
      type: MessageType.UPDATE_CONFIG,
      payload: config,
    });

    this.context.logger.info('Webview initialized');
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
   * Handle content generation request
   */
  private async handleGenerateContent(message: WebviewMessage): Promise<void> {
    const request = message.payload as ContentRequest;

    this.context.logger.info(`Generating content: ${request.contentGoal}`);

    try {
      const result = await this.contentGenerator.generateContent(request, (step, msg) => {
        this.sendMessage({
          type: MessageType.GENERATION_STATUS,
          payload: { step, message: msg },
        });
      });

      await this.sendMessage({
        type: MessageType.GENERATION_COMPLETE,
        payload: {
          success: true,
          result,
          message: `Content generated successfully: ${result.filename}`,
        },
        id: message.id,
      });
    } catch (error) {
      this.context.logger.error('Content generation failed', error);

      await this.sendMessage({
        type: MessageType.GENERATION_COMPLETE,
        payload: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: 'Content generation failed',
        },
        id: message.id,
      });
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
          'Text Documents': ['md', 'markdown', 'txt', 'log', 'config'],
          'Office Documents': ['doc', 'docx', 'pdf', 'ppt', 'pptx'],
          Images: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'],
          'All Supported': [
            'md',
            'markdown',
            'txt',
            'doc',
            'docx',
            'pdf',
            'ppt',
            'pptx',
            'png',
            'jpg',
            'jpeg',
            'gif',
            'svg',
            'webp',
          ],
          'All Files': ['*'],
        },
      };

      const fileUris = await vscode.window.showOpenDialog(options);

      if (fileUris && fileUris.length > 0) {
        const files = fileUris.map((uri) => {
          const name = uri.path.split('/').pop() || 'Unknown';
          const type = InputProcessor.detectInputType(name, uri.toString());

          return {
            id: uri.toString(),
            name,
            type,
            uri: uri.toString(),
          };
        });

        await this.sendMessage({
          type: MessageType.UPDATE_CONTENT,
          payload: { files, append: true },
          id: message.id,
        });
      }
    } catch (error) {
      this.context.logger.error('Failed to select files', error);
    }
  }

  /**
   * Send message to webview
   */
  private async sendMessage(message: ExtensionMessage): Promise<void> {
    if (this.panel && this.isReady) {
      message.timestamp = Date.now();
      await this.panel.webview.postMessage(message);
    }
  }

  /**
   * Forward monitor messages to webview
   */
  private async forwardMonitorMessage(type: string, data: any): Promise<void> {
    const messageType = type === 'modelInput' ? MessageType.MODEL_INPUT : MessageType.MODEL_OUTPUT;

    await this.sendMessage({
      type: messageType,
      payload: data,
    });
  }

  /**
   * Notify webview of configuration changes
   */
  public async notifyConfigurationChange(): Promise<void> {
    if (this.isReady) {
      const config = this.context.configManager.getConfiguration();
      await this.sendMessage({
        type: MessageType.UPDATE_CONFIG,
        payload: config,
      });
    }
  }

  /**
   * Get webview HTML content
   */
  private getWebviewContent(): string {
    const scriptUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media', 'webview.js')
    );
    const styleUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media', 'webview.css')
    );
    const codiconsUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media', 'codicon.css')
    );

    // Try to read HTML template
    const htmlPath = path.join(this.context.vscodeContext.extensionPath, 'media', 'webview.html');
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf8');
      html = html.replace(/\${webviewJs}/g, scriptUri?.toString() || '');
      html = html.replace(/\${webviewCss}/g, styleUri?.toString() || '');
      html = html.replace(/\${codiconCss}/g, codiconsUri?.toString() || '');
      return html;
    }

    // Fallback HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Content Developer</title>
    <link href="${codiconsUri}" rel="stylesheet" />
    <link href="${styleUri}" rel="stylesheet" />
</head>
<body>
    <div class="container">
        <h1>AI Content Developer</h1>
        <div class="form-section">
            <label for="contentGoal">What content would you like to create?</label>
            <textarea id="contentGoal" placeholder="Describe the documentation you want to generate..."></textarea>
        </div>
        
        <div class="form-section">
            <label>Input Files (optional)</label>
            <button id="selectFiles">Select Files</button>
            <div id="selectedFiles"></div>
        </div>
        
        <div class="form-section">
            <button id="generateBtn" class="primary">Generate Content</button>
        </div>
        
        <div id="status" class="status"></div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
