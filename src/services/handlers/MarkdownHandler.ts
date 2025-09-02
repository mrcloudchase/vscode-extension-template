import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';

export interface ProcessedContent {
  content: string;
  metadata: {
    wordCount: number;
    headings: string[];
    codeBlocks: number;
  };
}

/**
 * Handler for Markdown files (.md, .markdown)
 */
export class MarkdownHandler {
  constructor(private context: ExtensionContext) {}

  /**
   * Process markdown file
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
      this.context.logger.error('Failed to process markdown file', error);
      throw new Error(`Failed to read markdown file: ${error}`);
    }
  }

  /**
   * Extract metadata from markdown content
   */
  private extractMetadata(content: string): ProcessedContent['metadata'] {
    const wordCount = content.split(/\s+/).length;
    const headings = content.match(/^#+\s+(.+)$/gm) || [];
    const codeBlocks = (content.match(/```/g) || []).length / 2;

    return {
      wordCount,
      headings: headings.map((h) => h.replace(/^#+\s+/, '')),
      codeBlocks: Math.floor(codeBlocks),
    };
  }
}
