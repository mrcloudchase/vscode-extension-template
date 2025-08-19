import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
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
    try {
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

      // Read HTML template
      const htmlPath = path.join(this.context.vscodeContext.extensionPath, 'media', 'webview.html');
      if (!fs.existsSync(htmlPath)) {
        this.context.logger.error('webview.html not found at:', htmlPath);
        return this.getFallbackHtml();
      }

      let html = fs.readFileSync(htmlPath, 'utf8');

      // Replace placeholders
      html = html.replace(/\${webviewJs}/g, scriptUri.toString());
      html = html.replace(/\${webviewCss}/g, styleUri.toString());
      html = html.replace(/\${codiconCss}/g, codiconsUri.toString());

      return html;
    } catch (error) {
      this.context.logger.error('Failed to generate webview HTML', error);
      return this.getFallbackHtml();
    }
  }

  /**
   * Get fallback HTML if template loading fails
   */
  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Content Developer</title>
    </head>
    <body>
        <h1>AI Content Developer</h1>
        <p>Error loading webview. Please restart the extension.</p>
    </body>
    </html>`;
  }
}
