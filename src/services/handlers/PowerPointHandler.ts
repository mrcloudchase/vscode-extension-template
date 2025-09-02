import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';

export interface ProcessedContent {
  content: string;
  metadata: {
    wordCount: number;
    slideCount?: number;
    title?: string;
  };
}

/**
 * Handler for PowerPoint presentations (.pptx, .ppt)
 */
export class PowerPointHandler {
  constructor(private context: ExtensionContext) {}

  /**
   * Process PowerPoint presentation
   */
  public async process(uri: string): Promise<ProcessedContent> {
    try {
      const fileUri = vscode.Uri.parse(uri);
      const fileName = fileUri.path.split('/').pop() || 'Unknown';

      // Get file stats
      const stats = await vscode.workspace.fs.stat(fileUri);
      const fileSizeKB = Math.round(stats.size / 1024);

      const content = `PowerPoint Presentation: ${fileName}
File Size: ${fileSizeKB} KB
Path: ${fileUri.fsPath}

Note: This is a PowerPoint presentation. The AI will need to extract and analyze the slide content from this file during processing.`;

      return {
        content,
        metadata: {
          wordCount: 0, // Will be determined by AI
          title: fileName,
        },
      };
    } catch (error) {
      this.context.logger.error('Failed to process PowerPoint presentation', error);
      throw new Error(`Failed to process PowerPoint presentation: ${error}`);
    }
  }
}
