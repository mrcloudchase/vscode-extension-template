import * as vscode from 'vscode';
import { ExtensionContext, WebviewMessage } from '../../types/ExtensionContext';

/**
 * Manages the lifecycle of the webview panel
 * Single responsibility: Panel creation, disposal, and state management
 */
export class WebviewPanelManager {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: ExtensionContext,
    private messageHandler: (message: WebviewMessage) => Promise<void>,
    private htmlGenerator: (webview: vscode.Webview) => string
  ) {}

  /**
   * Create or show the webview panel
   */
  public createOrShow(): vscode.WebviewPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel exists, reveal it
    if (this.panel) {
      this.panel.reveal(column);
      return this.panel;
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

    this.setupPanel();
    return this.panel;
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
    this.panel.webview.html = this.htmlGenerator(this.panel.webview);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(this.messageHandler, null, this.disposables);

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
        this.dispose();
      },
      null,
      this.disposables
    );

    // Handle panel state changes
    this.panel.onDidChangeViewState(
      (e) => {
        if (e.webviewPanel.visible) {
          this.context.logger.debug('Webview panel became visible');
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Get the current panel
   */
  public getPanel(): vscode.WebviewPanel | undefined {
    return this.panel;
  }

  /**
   * Check if panel exists and is visible
   */
  public isVisible(): boolean {
    return !!this.panel && this.panel.visible;
  }

  /**
   * Refresh the webview content
   */
  public refresh(): void {
    if (this.panel) {
      this.panel.webview.html = this.htmlGenerator(this.panel.webview);
      this.context.logger.info('Webview refreshed');
    }
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
