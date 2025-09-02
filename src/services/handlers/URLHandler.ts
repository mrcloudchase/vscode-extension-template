import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';

export interface ProcessedContent {
  content: string;
  metadata: {
    wordCount: number;
    url: string;
    domain?: string;
  };
}

/**
 * Handler for URL inputs (web pages, documentation, etc.)
 */
export class URLHandler {
  constructor(private context: ExtensionContext) {}

  /**
   * Process URL input
   */
  public async process(uri: string): Promise<ProcessedContent> {
    try {
      const url = new URL(uri);
      const domain = url.hostname;

      const content = `Web URL: ${uri}
Domain: ${domain}
Protocol: ${url.protocol}

Note: This is a web URL. The AI should fetch and analyze the content from this web page during processing. This may include documentation, articles, API references, or other web-based content relevant to the documentation being created.`;

      return {
        content,
        metadata: {
          wordCount: 0, // Will be determined by AI when fetched
          url: uri,
          domain,
        },
      };
    } catch (error) {
      this.context.logger.error('Failed to process URL', error);
      throw new Error(`Failed to process URL: ${error}`);
    }
  }
}
