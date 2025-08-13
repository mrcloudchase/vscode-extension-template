import * as vscode from 'vscode';
import * as fs from 'fs';
import { BaseService } from './BaseService';
import { ProcessingResult, InputFile, InputType, ProcessedContent } from '../models/InputModels';

/**
 * Service for processing text files (.txt, .md)
 */
export class TextService extends BaseService {
  private readonly supportedExtensions = ['.txt', '.md', '.text', '.markdown'];



  async process(input: InputFile): Promise<ProcessingResult> {
    try {
      this.validateInput(input);
      this.log(`Processing text file: ${input.name}`);

      const uri = vscode.Uri.parse(input.uri);
      const filePath = uri.fsPath;

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file content
      const content = fs.readFileSync(filePath, 'utf8');
      const text = this.ensureUtf8(content);

      const processedContent: ProcessedContent = {
        source: input.name,
        type: InputType.TEXT,
        text: text.trim(),
        metadata: {
          originalLength: text.length,
          encoding: 'utf-8',
          fileExtension: this.getFileExtension(input.name),
        },
      };

      return {
        success: true,
        content: processedContent,
      };
    } catch (error) {
      this.logError(`Failed to process text file: ${input.name}`, error);
      return {
        success: false,
        error: `Failed to process text file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }
}
