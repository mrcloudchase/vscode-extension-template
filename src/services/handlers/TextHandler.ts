import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';

export interface ProcessedContent {
  content: string;
  metadata: {
    wordCount: number;
    lineCount: number;
    encoding: string;
  };
}

/**
 * Handler for text files (.txt, .log, .config, etc.)
 */
export class TextHandler {
  constructor(private context: ExtensionContext) {}

  /**
   * Process text file
   */
  public async process(uri: string): Promise<ProcessedContent> {
    try {
      const fileUri = vscode.Uri.parse(uri);
      const content = await vscode.workspace.fs.readFile(fileUri);
      const text = Buffer.from(content).toString('utf8');

      return {
        content: text,
        metadata: this.extractMetadata(text),
      };
    } catch (error) {
      this.context.logger.error('Failed to process text file', error);
      throw new Error(`Failed to read text file: ${error}`);
    }
  }

  /**
   * Extract metadata from text content
   */
  private extractMetadata(content: string): ProcessedContent['metadata'] {
    const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;
    const lineCount = content.split('\n').length;

    return {
      wordCount,
      lineCount,
      encoding: 'utf8',
    };
  }
}
