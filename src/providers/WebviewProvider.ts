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
      'aiContentDeveloper',
      'AI Content Developer',
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
        title: 'AI Content Developer',
        content: 'Create professional technical documentation with AI assistance.',
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
   * Format workflow steps for display
   */
  private formatWorkflowSteps(steps: any): string {
    const parts: string[] = [];
    if (steps.directorySelection?.success) {
      parts.push(`✅ Directory: ${steps.directorySelection.data?.selectedDirectory}`);
    }
    if (steps.contentStrategy?.success) {
      parts.push(`✅ Strategy: ${steps.contentStrategy.data?.action}`);
    }
    if (steps.patternSelection?.success) {
      parts.push(`✅ Pattern: ${steps.patternSelection.data?.patternName}`);
    }
    if (steps.contentGeneration?.success) {
      parts.push(`✅ Generated: ${steps.contentGeneration.data?.title}`);
    }
    return parts.join('\n');
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
   * Handle input processing - Updated for Chat Participant workflow
   */
  private async handleProcessInputs(message: WebviewMessage): Promise<void> {
    try {
      const { goal, inputs } = message.payload as { 
        goal: string; 
        inputs: InputFile[];
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
        payload: { status: 'processing', message: 'Preparing content request...' },
      });

      // Use the new Chat Participant workflow
      const result = await this.copilotService.createNewContent(
        goal,
        inputs,
        {
          onProgress: (step: string, message: string) => {
            // Send real-time progress updates to webview
            this.sendMessage({
              type: MessageType.PROCESSING_STATUS,
              payload: { status: step, message },
            });
          }
        }
      );

      // For Chat Participant workflow, we notify user that the chat has been opened
      const response = {
        response: result.success 
          ? `🤖 **Chat Participant Activated!**\n\nYour request has been sent to the @content-creator chat participant. The sequential workflow will continue in the VS Code Chat interface.\n\n**Next Steps:**\n1. Check the Chat panel (should have opened automatically)\n2. The @content-creator participant will guide you through the workflow\n3. You'll see real-time progress as it analyzes your repository and creates content\n\n**Your Request:** ${goal}\n**Input Files:** ${inputs.length} file(s) processed`
          : `❌ **Failed to launch Chat Participant**\n\nError: ${result.error}\n\nPlease try again or check the extension logs for more details.`,
        sources: inputs.map(input => input.name),
        timestamp: new Date()
      };

      // Send response back to webview
      await this.sendMessage({
        type: MessageType.COPILOT_RESPONSE,
        payload: response,
        id: message.id,
      });

      // Show final status
      await this.sendMessage({
        type: MessageType.PROCESSING_STATUS,
        payload: { 
          status: result.success ? 'launched' : 'error', 
          message: result.success 
            ? 'Chat participant launched! Continue in the Chat panel.' 
            : `Error: ${result.error}`
        },
      });

      // Show chat participant status
      const chatStatus = this.copilotService.getChatParticipantStatus();
      if (!chatStatus.isSupported) {
        await this.sendMessage({
          type: MessageType.SHOW_MESSAGE,
          payload: {
            type: 'warning',
            text: 'Chat Participant API not supported in this VS Code version. Please update VS Code.'
          }
        });
      } else if (!chatStatus.isRegistered) {
        await this.sendMessage({
          type: MessageType.SHOW_MESSAGE,
          payload: {
            type: 'error',
            text: 'Chat Participant failed to register. Please restart the extension.'
          }
        });
      }

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
        <title>AI Content Developer</title>
    </head>
    <body>
        <div id="app">
            <header>
                <div class="header-content">
                    <div class="brand">
                        <div class="brand-icon codicon codicon-file-text"></div>
                        <h1>AI Content Developer</h1>
                    </div>
                    <div class="actions">
                        <button id="refresh-btn" class="codicon codicon-refresh" title="Refresh"></button>
                    </div>
                </div>
            </header>
            
            <main>
                <div class="content-container">
                    <div class="welcome-message">
                        <h2>Create Professional Technical Documentation</h2>
                        <p>Transform your files and ideas into structured, professional documentation using AI-powered content generation.</p>
                    </div>
                    
                                    <div class="action-section">
                        <h3>Content Creation Workflow</h3>
                        <p class="workflow-description">Upload your source materials and describe what documentation you need. Our AI will analyze your workspace and create professional content in the right location.</p>
                        
                        <div class="input-section">
                            <h4>📁 Source Materials</h4>
                            <div class="input-controls">
                                <button id="select-files-btn" class="primary-btn">
                                    <span class="codicon codicon-file"></span>
                                    Select Files
                                </button>
                                <button id="add-url-btn" class="secondary-btn">
                                    <span class="codicon codicon-globe"></span>
                                    Add URL
                                </button>
                                <button id="add-github-pr-btn" class="secondary-btn">
                                    <span class="codicon codicon-git-pull-request"></span>
                                    Add GitHub PR
                                </button>
                            </div>
                            
                            <div id="input-list" class="input-list"></div>
                            
                            <div class="url-input-container hidden" id="url-input-container">
                                <input type="text" id="url-input" placeholder="Enter URL (documentation, articles, specs)..." />
                                <button id="add-url-confirm" class="secondary-btn">Add</button>
                            </div>
                            
                            <div class="github-input-container hidden" id="github-input-container">
                                <input type="text" id="github-input" placeholder="Enter GitHub PR URL..." />
                                <button id="add-github-confirm" class="secondary-btn">Add</button>
                            </div>
                        </div>
                        
                        <div class="goal-section">
                            <h4>🎯 Content Goal</h4>
                            <textarea id="goal-input" placeholder="Describe the documentation you need (e.g., 'Create a getting started guide for new developers', 'Write API documentation for the authentication service', 'Generate troubleshooting documentation')"></textarea>
                        </div>
                        
                        <div class="action-buttons">
                            <button id="process-btn" class="primary-btn" disabled>
                                <span class="codicon codicon-rocket"></span>
                                Create Documentation
                            </button>
                            <button id="clear-btn" class="secondary-btn">
                                <span class="codicon codicon-clear-all"></span>
                                Clear All
                            </button>
                        </div>
                        
                        <div id="processing-status" class="processing-status hidden"></div>
                    </div>
                    
                    <div id="response-section" class="response-section hidden">
                        <h3>✨ AI Content Creation</h3>
                        <div id="response-content"></div>
                    </div>
                </div>
            </main>
            
            <footer>
                <p>AI Content Developer | Powered by VS Code Chat Participant API</p>
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
