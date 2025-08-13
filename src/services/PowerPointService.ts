import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BaseService } from './BaseService';
import { ProcessingResult, InputFile, InputType, ProcessedContent } from '../models/InputModels';
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');

/**
 * Service for processing PowerPoint presentations
 */
export class PowerPointService extends BaseService {
  private readonly supportedExtensions = ['.pptx', '.ppt'];



  async process(input: InputFile): Promise<ProcessingResult> {
    try {
      this.validateInput(input);
      this.log(`Processing PowerPoint: ${input.name}`);

      const uri = vscode.Uri.parse(input.uri);
      const filePath = uri.fsPath;

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // For .ppt files, we would need a different approach
      if (filePath.endsWith('.ppt')) {
        return {
          success: false,
          error: 'Legacy .ppt format is not supported. Please convert to .pptx format.',
        };
      }

      // Extract text from .pptx file
      const text = await this.extractTextFromPptx(filePath);

      const processedContent: ProcessedContent = {
        source: input.name,
        type: InputType.POWERPOINT,
        text: text.trim(),
        metadata: {
          originalLength: text.length,
        },
      };

      return {
        success: true,
        content: processedContent,
      };
    } catch (error) {
      this.logError(`Failed to process PowerPoint: ${input.name}`, error);
      return {
        success: false,
        error: `Failed to process PowerPoint: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Extract text from .pptx file using ZIP extraction
   */
  private async extractTextFromPptx(filePath: string): Promise<string> {
    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      const slideTexts: string[] = [];
      const parser = new xml2js.Parser({ explicitArray: false });

      // Process slides
      const slideEntries = zipEntries.filter((entry: any) =>
        entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml')
      );

      // Sort slides by number
      slideEntries.sort((a: any, b: any) => {
        const aNum = parseInt(a.entryName.match(/slide(\d+)\.xml/)?.[1] || '0');
        const bNum = parseInt(b.entryName.match(/slide(\d+)\.xml/)?.[1] || '0');
        return aNum - bNum;
      });

      for (const entry of slideEntries) {
        const xmlContent = zip.readAsText(entry);
        const result = await parser.parseStringPromise(xmlContent);
        const slideText = this.extractTextFromSlideXml(result);
        if (slideText) {
          slideTexts.push(slideText);
        }
      }

      // Also extract notes if available
      const notesEntries = zipEntries.filter((entry: any) =>
        entry.entryName.startsWith('ppt/notesSlides/') && entry.entryName.endsWith('.xml')
      );

      for (const entry of notesEntries) {
        const xmlContent = zip.readAsText(entry);
        const result = await parser.parseStringPromise(xmlContent);
        const notesText = this.extractTextFromSlideXml(result);
        if (notesText) {
          slideTexts.push(`[Notes] ${notesText}`);
        }
      }

      return slideTexts.join('\n\n---\n\n');
    } catch (error) {
      throw new Error(`Failed to extract text from PPTX: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract text from slide XML structure
   */
  private extractTextFromSlideXml(xmlObj: any): string {
    const texts: string[] = [];

    const extractText = (obj: any): void => {
      if (typeof obj === 'string') {
        texts.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(extractText);
      } else if (typeof obj === 'object' && obj !== null) {
        // Look for text nodes
        if (obj['a:t']) {
          if (typeof obj['a:t'] === 'string') {
            texts.push(obj['a:t']);
          } else if (Array.isArray(obj['a:t'])) {
            obj['a:t'].forEach((t: any) => {
              if (typeof t === 'string') {
                texts.push(t);
              }
            });
          }
        }
        // Recursively search all properties
        Object.values(obj).forEach(extractText);
      }
    };

    extractText(xmlObj);
    return texts.filter(t => t.trim()).join(' ');
  }

  /**
   * Get presentation metadata
   */
  async getMetadata(input: InputFile): Promise<Record<string, any>> {
    try {
      const uri = vscode.Uri.parse(input.uri);
      const filePath = uri.fsPath;
      
      if (!filePath.endsWith('.pptx')) {
        return { error: 'Only .pptx format supported for metadata extraction' };
      }

      const zip = new AdmZip(filePath);
      const parser = new xml2js.Parser({ explicitArray: false });
      
      // Try to get core properties
      const coreEntry = zip.getEntry('docProps/core.xml');
      if (coreEntry) {
        const coreXml = zip.readAsText(coreEntry);
        const coreData = await parser.parseStringPromise(coreXml);
        
        return {
          title: coreData['cp:coreProperties']?.['dc:title'] || '',
          creator: coreData['cp:coreProperties']?.['dc:creator'] || '',
          lastModifiedBy: coreData['cp:coreProperties']?.['cp:lastModifiedBy'] || '',
          created: coreData['cp:coreProperties']?.['dcterms:created'] || '',
          modified: coreData['cp:coreProperties']?.['dcterms:modified'] || '',
        };
      }
      
      return {};
    } catch (error) {
      this.logError('Failed to get PowerPoint metadata', error);
      return {};
    }
  }
}
