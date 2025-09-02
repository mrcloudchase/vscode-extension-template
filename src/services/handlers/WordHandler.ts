import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';

export interface ProcessedContent {
  content: string;
  metadata: {
    wordCount: number;
    pageCount?: number;
    title?: string;
  };
}

/**
 * Handler for Word documents (.docx, .doc)
 */
export class WordHandler {
  constructor(private context: ExtensionContext) {}

  /**
   * Process Word document
   */
  public async process(uri: string): Promise<ProcessedContent> {
    try {
      // For now, we'll extract basic file info and let the language model handle content extraction
      const fileUri = vscode.Uri.parse(uri);
      const fileName = fileUri.path.split('/').pop() || 'Unknown';

      // Get file stats
      const stats = await vscode.workspace.fs.stat(fileUri);
      const fileSizeKB = Math.round(stats.size / 1024);

      const content = `Word Document: ${fileName}
File Size: ${fileSizeKB} KB
Path: ${fileUri.fsPath}

Note: This is a Word document. The AI will need to extract and analyze the content from this file during processing.`;

      return {
        content,
        metadata: {
          wordCount: 0, // Will be determined by AI
          title: fileName,
        },
      };
    } catch (error) {
      this.context.logger.error('Failed to process Word document', error);
      throw new Error(`Failed to process Word document: ${error}`);
    }
  }
}
