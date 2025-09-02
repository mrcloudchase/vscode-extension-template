import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';

export interface ProcessedContent {
  content: string;
  metadata: {
    wordCount: number;
    dimensions?: string;
    fileSize?: number;
  };
}

/**
 * Handler for image files (.png, .jpg, .jpeg, .gif, .svg)
 */
export class ImageHandler {
  constructor(private context: ExtensionContext) {}

  /**
   * Process image file
   */
  public async process(uri: string): Promise<ProcessedContent> {
    try {
      const fileUri = vscode.Uri.parse(uri);
      const fileName = fileUri.path.split('/').pop() || 'Unknown';
      const fileExt = fileName.split('.').pop()?.toUpperCase() || 'IMAGE';

      // Get file stats
      const stats = await vscode.workspace.fs.stat(fileUri);
      const fileSizeKB = Math.round(stats.size / 1024);

      const content = `Image File: ${fileName}
Type: ${fileExt}
File Size: ${fileSizeKB} KB
Path: ${fileUri.fsPath}

Note: This is an image file. The AI should analyze this image and describe its content, diagrams, or any text visible in the image that might be relevant to the documentation being created.`;

      return {
        content,
        metadata: {
          wordCount: 0,
          fileSize: stats.size,
        },
      };
    } catch (error) {
      this.context.logger.error('Failed to process image file', error);
      throw new Error(`Failed to process image file: ${error}`);
    }
  }
}
