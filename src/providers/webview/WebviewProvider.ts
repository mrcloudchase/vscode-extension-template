import * as vscode from 'vscode';
import { ExtensionContext, WebviewMessage, ExtensionMessage } from '../../types/ExtensionContext';
import { WebviewPanelManager } from './WebviewPanelManager';
import { WebviewMessageHandler } from './WebviewMessageHandler';
import { WebviewHtmlGenerator } from './WebviewHtmlGenerator';

/**
 * Main WebView Provider - coordinates all webview functionality
 * Single responsibility: Webview lifecycle coordination and message routing
 */
export class WebviewProvider implements vscode.Disposable {
  private panelManager: WebviewPanelManager;
  private messageHandler: WebviewMessageHandler;
  private htmlGenerator: WebviewHtmlGenerator;

  constructor(private context: ExtensionContext) {
    this.htmlGenerator = new WebviewHtmlGenerator(context);
    this.messageHandler = new WebviewMessageHandler(context, this.sendMessage.bind(this));
    this.panelManager = new WebviewPanelManager(
      context,
      this.messageHandler.handleMessage.bind(this.messageHandler),
      this.htmlGenerator.generateHtml.bind(this.htmlGenerator)
    );
  }

  /**
   * Create or show the webview panel
   */
  public createOrShow(): void {
    this.panelManager.createOrShow();
  }

  /**
   * Refresh the webview content
   */
  public refresh(): void {
    this.panelManager.refresh();
  }

  /**
   * Send message to webview
   */
  public async sendMessage(message: ExtensionMessage): Promise<void> {
    const panel = this.panelManager.getPanel();
    if (panel && this.messageHandler.isReady()) {
      message.timestamp = Date.now();
      await panel.webview.postMessage(message);
    }
  }

  /**
   * Notify webview of configuration changes
   */
  public async notifyConfigurationChange(): Promise<void> {
    await this.messageHandler.notifyConfigurationChange();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.panelManager.dispose();
  }
}
