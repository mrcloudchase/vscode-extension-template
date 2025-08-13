import * as vscode from 'vscode';
import { ExtensionContext } from '../types/ExtensionContext';
import { WebviewProvider } from '../providers/WebviewProvider';

export class CommandManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: ExtensionContext,
    private webviewProvider: WebviewProvider
  ) {}

  /**
   * Register all extension commands
   */
  public registerCommands(): void {
    this.registerCommand('vscode-webview-extension.openWebview', () => this.openWebview());
    this.registerCommand('vscode-webview-extension.refresh', () => this.refreshWebview());

    this.context.logger.info('Commands registered successfully');
  }

  /**
   * Register a single command
   */
  private registerCommand(
    commandId: string,
    callback: (...args: any[]) => any,
    thisArg?: any
  ): void {
    const disposable = vscode.commands.registerCommand(commandId, callback, thisArg);
    this.context.vscodeContext.subscriptions.push(disposable);
    this.disposables.push(disposable);

    this.context.logger.debug(`Command registered: ${commandId}`);
  }

  /**
   * Open webview command handler
   */
  private openWebview(): void {
    try {
      this.context.logger.info('Opening webview...');
      this.webviewProvider.createOrShow();
      this.context.logger.info('Webview opened successfully');
    } catch (error) {
      this.context.logger.error('Failed to open webview', error);
      void vscode.window.showErrorMessage(
        'Failed to open webview. Please check the logs for details.'
      );
    }
  }

  /**
   * Refresh webview command handler
   */
  private refreshWebview(): void {
    try {
      this.context.logger.info('Refreshing webview...');
      this.webviewProvider.refresh();
      void vscode.window.showInformationMessage('Webview refreshed successfully');
    } catch (error) {
      this.context.logger.error('Failed to refresh webview', error);
      void vscode.window.showErrorMessage(
        'Failed to refresh webview. Please check the logs for details.'
      );
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
