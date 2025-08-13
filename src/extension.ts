import * as vscode from 'vscode';
import { WebviewProvider } from './providers/WebviewProvider';
import { CommandManager } from './commands/CommandManager';
import { ConfigurationManager } from './config/ConfigurationManager';
import { Logger } from './utils/Logger';
import { ExtensionContext } from './types/ExtensionContext';

let webviewProvider: WebviewProvider | undefined;
let commandManager: CommandManager | undefined;
let configManager: ConfigurationManager | undefined;
let logger: Logger | undefined;

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export function activate(context: vscode.ExtensionContext): void {
  // Initialize logger
  logger = new Logger('VSCode WebView Extension');
  logger.info('Extension is being activated');

  // Initialize configuration manager
  configManager = new ConfigurationManager();

  // Create extension context
  const extensionContext: ExtensionContext = {
    vscodeContext: context,
    logger,
    configManager,
  };

  // Initialize webview provider
  webviewProvider = new WebviewProvider(extensionContext);

  // Initialize command manager
  commandManager = new CommandManager(extensionContext, webviewProvider);

  // Register all commands
  commandManager.registerCommands();

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('vscode-webview-extension')) {
        configManager!.reload();
        logger!.info('Configuration reloaded');

        // Notify webview of configuration changes
        void webviewProvider?.notifyConfigurationChange();
      }
    })
  );

  logger.info('Extension has been activated successfully');
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
  logger?.info('Extension is being deactivated');

  // Clean up resources
  webviewProvider?.dispose();
  commandManager?.dispose();

  logger?.info('Extension has been deactivated');
}
