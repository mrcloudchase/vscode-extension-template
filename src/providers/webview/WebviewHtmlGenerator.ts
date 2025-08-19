import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';

/**
 * Generates HTML content for the webview
 * Single responsibility: HTML content generation and CSP management
 */
export class WebviewHtmlGenerator {
  constructor(private context: ExtensionContext) {}

  /**
   * Generate complete HTML content for webview
   */
  public generateHtml(webview: vscode.Webview): string {
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
    const nonce = this.generateNonce();

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
  private generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
