import * as vscode from 'vscode';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import { BaseService } from './BaseService';
import { ProcessingResult, InputFile, InputType, ProcessedContent } from '../models/InputModels';

/**
 * Service for processing Microsoft Word documents
 */
export class WordDocumentService extends BaseService {
  private readonly supportedExtensions = ['.docx', '.doc'];



  async process(input: InputFile): Promise<ProcessingResult> {
    try {
      this.validateInput(input);
      this.log(`Processing Word document: ${input.name}`);

      const uri = vscode.Uri.parse(input.uri);
      const filePath = uri.fsPath;

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file buffer
      const buffer = fs.readFileSync(filePath);

      // Extract text using mammoth
      const result = await mammoth.extractRawText({ buffer });

      if (result.messages && result.messages.length > 0) {
        this.log('Mammoth warnings:', result.messages);
      }

      const text = this.ensureUtf8(result.value);

      const processedContent: ProcessedContent = {
        source: input.name,
        type: InputType.WORD_DOC,
        text: text.trim(),
        metadata: {
          originalLength: text.length,
          warnings: result.messages,
        },
      };

      return {
        success: true,
        content: processedContent,
      };
    } catch (error) {
      this.logError(`Failed to process Word document: ${input.name}`, error);
      return {
        success: false,
        error: `Failed to process Word document: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Extract styled text with basic formatting preserved
   */
  async extractStyledText(input: InputFile): Promise<string> {
    try {
      const uri = vscode.Uri.parse(input.uri);
      const filePath = uri.fsPath;
      const buffer = fs.readFileSync(filePath);

      // Get HTML output to preserve some formatting
      const result = await mammoth.convertToHtml({ buffer });
      
      // Convert HTML to plain text with basic formatting
      const text = result.value
        .replace(/<p>/g, '\n')
        .replace(/<\/p>/g, '\n')
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<h[1-6]>/g, '\n### ')
        .replace(/<\/h[1-6]>/g, ' ###\n')
        .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines

      return text.trim();
    } catch (error) {
      this.logError('Failed to extract styled text', error);
      // Fallback to basic extraction
      const result = await this.process(input);
      return result.content?.text || '';
    }
  }
}
