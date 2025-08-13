import * as vscode from 'vscode';
import {
  ExtensionContext,
  WebviewMessage,
  ExtensionMessage,
  MessageType,
  WebviewState,
} from '../types/ExtensionContext';
import { InputFile, InputType, ChatRequest } from '../models/InputModels';

export class WebviewProvider implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];
  private state: WebviewState = { isReady: false };
  private copilotService: any | undefined;

  constructor(private context: ExtensionContext) {
    // Initialize CopilotIntegrationService lazily to avoid activation issues
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
      'webviewPanel',
      'WebView Extension',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media'),
          vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'dist'),
        ],
      }
    );

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
    this.panel.webview.html = this.getHtmlContent(this.panel.webview);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        await this.handleWebviewMessage(message);
      },
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        this.state = { isReady: false };
      },
      null,
      this.disposables
    );

    // Handle panel state changes
    this.panel.onDidChangeViewState(
      (e) => {
        if (e.webviewPanel.visible) {
          // Panel became visible
          this.context.logger.debug('Webview panel became visible');
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Refresh the webview content
   */
  public refresh(): void {
    if (this.panel) {
      this.panel.webview.html = this.getHtmlContent(this.panel.webview);
      this.context.logger.info('Webview refreshed');
    }
  }

  /**
   * Send message to webview
   */
  public async sendMessage(message: ExtensionMessage): Promise<void> {
    if (this.panel && this.state.isReady) {
      message.timestamp = Date.now();
      await this.panel.webview.postMessage(message);
    }
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
   * Handle messages from webview
   */
  private async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    this.context.logger.debug(`Received message from webview: ${message.type}`);

    switch (message.type) {
      case MessageType.READY:
        this.state.isReady = true;
        await this.initializeWebview();
        break;

      case MessageType.REQUEST_DATA:
        await this.handleDataRequest(message);
        break;

      case MessageType.SAVE_DATA:
        await this.handleDataSave(message);
        break;

      case MessageType.EXECUTE_COMMAND:
        await this.handleCommandExecution(message);
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
        title: 'Welcome to VSCode WebView Extension',
        content: 'Your webview is ready!',
      },
    });

    this.context.logger.info('Webview initialized');
  }

  /**
   * Handle data request from webview
   */
  private async handleDataRequest(message: WebviewMessage): Promise<void> {
    // Example: Load data from workspace or external source
    const data = {
      timestamp: new Date().toISOString(),
      workspace: vscode.workspace.name || 'No workspace',
      // Add your data here
    };

    await this.sendMessage({
      type: MessageType.UPDATE_CONTENT,
      payload: data,
      id: message.id,
    });
  }

  /**
   * Handle data save from webview
   */
  private async handleDataSave(message: WebviewMessage): Promise<void> {
    try {
      // Example: Save data to workspace settings or file
      this.state.data = message.payload as unknown;

      await this.sendMessage({
        type: MessageType.SHOW_MESSAGE,
        payload: {
          type: 'success',
          text: 'Data saved successfully',
        },
      });
    } catch (error) {
      this.context.logger.error('Failed to save data', error);
      await this.sendMessage({
        type: MessageType.SHOW_MESSAGE,
        payload: {
          type: 'error',
          text: 'Failed to save data',
        },
      });
    }
  }

  /**
   * Handle command execution from webview
   */
  private async handleCommandExecution(message: WebviewMessage): Promise<void> {
    const { command, args } = message.payload as { command: string; args?: unknown[] };

    try {
      await vscode.commands.executeCommand(command, ...(args || []));
    } catch (error) {
      this.context.logger.error(`Failed to execute command: ${command}`, error);
    }
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
          'Documents': ['docx', 'doc', 'pdf', 'pptx', 'ppt', 'txt', 'md'],
          'All Files': ['*']
        }
      };

      const fileUris = await vscode.window.showOpenDialog(options);
      
      if (fileUris && fileUris.length > 0) {
        const files: InputFile[] = fileUris.map(uri => ({
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
   * Handle input processing
   */
  private async handleProcessInputs(message: WebviewMessage): Promise<void> {
    try {
      const { goal, inputs, audience, contentType } = message.payload as { 
        goal: string; 
        inputs: InputFile[];
        audience?: string;
        contentType?: string;
      };

      // Initialize CopilotIntegrationService if not already done (lazy loading)
      if (!this.copilotService) {
        this.context.logger.debug('Lazy loading CopilotIntegrationService...');
        const CopilotIntegrationService = (await import('../services/CopilotIntegrationService')).default;
        this.copilotService = new CopilotIntegrationService(this.context);
        this.context.logger.debug('CopilotIntegrationService loaded successfully');
      }

      // Send processing status
      await this.sendMessage({
        type: MessageType.PROCESSING_STATUS,
        payload: { status: 'processing', message: 'Processing inputs...' },
      });

      // Use the new orchestrated content creation workflow
      const result = await this.copilotService.createNewContent(
        goal,
        inputs,
        {
          audience,
          contentType,
          onProgress: (step: string, message: string) => {
            // Send real-time progress updates to webview
            this.sendMessage({
              type: MessageType.PROCESSING_STATUS,
              payload: { status: step, message },
            });
          }
        }
      );

      // Convert result to ChatResponse format for webview compatibility
      const response = {
        response: result.success 
          ? `Content ${result.action} successfully! File: ${result.filePath}\n\nPattern used: ${result.pattern}`
          : `Failed to create content: ${result.error}`,
        sources: [], // Could be enhanced to include source file names
        timestamp: new Date()
      };

      // Send response back to webview
      await this.sendMessage({
        type: MessageType.COPILOT_RESPONSE,
        payload: response,
        id: message.id,
      });

      await this.sendMessage({
        type: MessageType.PROCESSING_STATUS,
        payload: { 
          status: result.success ? 'complete' : 'error', 
          message: result.success ? 'Content creation completed!' : `Error: ${result.error}`
        },
      });
    } catch (error) {
      this.context.logger.error('Failed to process inputs', error);
      
      await this.sendMessage({
        type: MessageType.PROCESSING_STATUS,
        payload: { 
          status: 'error', 
          message: `Error: ${error instanceof Error ? error.message : String(error)}` 
        },
      });
    }
  }

  /**
   * Get HTML content for webview
   */
  private getHtmlContent(webview: vscode.Webview): string {
    // Get resource URIs
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media', 'webview.css')
    );
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.vscodeContext.extensionUri, 'media', 'codicon.css')
    );

    // Use a nonce to only allow specific scripts to be run
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
        <link href="${styleUri.toString()}" rel="stylesheet">
        <link href="${codiconsUri.toString()}" rel="stylesheet">
        <title>VSCode WebView Extension</title>
    </head>
    <body>
        <div id="app">
            <header>
                <h1>VSCode WebView Extension</h1>
                <div class="actions">
                    <button id="refresh-btn" class="codicon codicon-refresh" title="Refresh"></button>
                    <button id="settings-btn" class="codicon codicon-settings-gear" title="Settings"></button>
                </div>
            </header>
            
            <main>
                <div class="content-container">
                    <div class="welcome-message">
                        <h2>Welcome to Your WebView Extension</h2>
                        <p>This is a modern template for building VSCode extensions with WebView support.</p>
                    </div>
                    
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon codicon codicon-code"></div>
                            <h3>TypeScript Support</h3>
                            <p>Built with TypeScript for type safety and better development experience.</p>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon codicon codicon-layers"></div>
                            <h3>Modular Architecture</h3>
                            <p>Clean, maintainable code structure with separation of concerns.</p>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon codicon codicon-sync"></div>
                            <h3>Two-way Communication</h3>
                            <p>Seamless message passing between extension and webview.</p>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon codicon codicon-color-mode"></div>
                            <h3>Theme Support</h3>
                            <p>Automatic adaptation to VSCode's light and dark themes.</p>
                        </div>
                    </div>
                    
                                    <div class="action-section">
                    <h3>Process Documents with Copilot</h3>
                    
                    <div class="input-section">
                        <h4>1. Add Your Inputs</h4>
                        <div class="input-controls">
                            <button id="select-files-btn" class="primary-btn">Select Files</button>
                            <button id="add-url-btn" class="secondary-btn">Add URL</button>
                            <button id="add-github-pr-btn" class="secondary-btn">Add GitHub PR</button>
                        </div>
                        
                        <div id="input-list" class="input-list"></div>
                        
                        <div class="url-input-container hidden" id="url-input-container">
                            <input type="text" id="url-input" placeholder="Enter URL..." />
                            <button id="add-url-confirm" class="secondary-btn">Add</button>
                        </div>
                        
                        <div class="github-input-container hidden" id="github-input-container">
                            <input type="text" id="github-input" placeholder="Enter GitHub PR URL..." />
                            <button id="add-github-confirm" class="secondary-btn">Add</button>
                        </div>
                    </div>
                    
                    <div class="goal-section">
                        <h4>2. Describe Your Goal</h4>
                        <textarea id="goal-input" placeholder="What would you like to do with these inputs? (e.g., 'Summarize the key points', 'Compare these documents', 'Extract action items')"></textarea>
                    </div>
                    
                    <div class="action-buttons">
                        <button id="process-btn" class="primary-btn" disabled>Process with Copilot</button>
                        <button id="clear-btn" class="secondary-btn">Clear All</button>
                    </div>
                    
                    <div id="processing-status" class="processing-status hidden"></div>
                </div>
                
                <div id="response-section" class="response-section hidden">
                    <h3>Copilot Response</h3>
                    <div id="response-content"></div>
                </div>
                    
                    <div id="data-display" class="data-display hidden">
                        <h3>Data Display</h3>
                        <pre id="data-content"></pre>
                    </div>
                </div>
            </main>
            
            <footer>
                <p>Extension Template v0.0.1 | <a href="#" id="documentation-link">Documentation</a></p>
            </footer>
        </div>
        
        <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
    </body>
    </html>`;
  }

  /**
   * Generate nonce for content security policy
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.panel?.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
