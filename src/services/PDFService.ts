import * as vscode from 'vscode';
import * as fs from 'fs';
import { BaseService } from './BaseService';
import { ProcessingResult, InputFile, InputType, ProcessedContent } from '../models/InputModels';
const pdfParse = require('pdf-parse');

/**
 * Service for processing PDF documents
 */
export class PDFService extends BaseService {
  private readonly supportedExtensions = ['.pdf'];
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB limit



  async process(input: InputFile): Promise<ProcessingResult> {
    try {
      this.validateInput(input);
      this.log(`Processing PDF: ${input.name}`);

      const uri = vscode.Uri.parse(input.uri);
      const filePath = uri.fsPath;

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size > this.maxFileSize) {
        throw new Error(`PDF file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max: 50MB)`);
      }

      // Read file buffer
      const buffer = fs.readFileSync(filePath);

      // Parse PDF
      const data = await pdfParse(buffer, {
        max: 0, // No page limit
        version: 'v2.0.550',
      });

      const text = this.ensureUtf8(data.text);

      const processedContent: ProcessedContent = {
        source: input.name,
        type: InputType.PDF,
        text: text.trim(),
        metadata: {
          pages: data.numpages,
          info: data.info,
          originalLength: text.length,
        },
      };

      return {
        success: true,
        content: processedContent,
      };
    } catch (error) {
      this.logError(`Failed to process PDF: ${input.name}`, error);
      return {
        success: false,
        error: `Failed to process PDF: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Extract text from specific pages
   */
  async extractPages(input: InputFile, startPage: number, endPage?: number): Promise<string> {
    try {
      const uri = vscode.Uri.parse(input.uri);
      const filePath = uri.fsPath;
      const buffer = fs.readFileSync(filePath);

      const data = await pdfParse(buffer, {
        pagerender: (pageData: any) => {
          const pageNum = pageData.pageIndex + 1;
          if (pageNum >= startPage && (!endPage || pageNum <= endPage)) {
            return pageData.getTextContent();
          }
          return '';
        },
      });

      return data.text.trim();
    } catch (error) {
      this.logError('Failed to extract specific pages', error);
      return '';
    }
  }

  /**
   * Get PDF metadata
   */
  async getMetadata(input: InputFile): Promise<Record<string, any>> {
    try {
      const uri = vscode.Uri.parse(input.uri);
      const filePath = uri.fsPath;
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);

      return {
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        version: data.version,
      };
    } catch (error) {
      this.logError('Failed to get PDF metadata', error);
      return {};
    }
  }
}
