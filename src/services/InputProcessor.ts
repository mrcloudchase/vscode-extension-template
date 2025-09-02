import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';
import {
  MarkdownHandler,
  WordHandler,
  PDFHandler,
  PowerPointHandler,
  ImageHandler,
  URLHandler,
  TextHandler,
} from './handlers';

export interface InputFile {
  id: string;
  name: string;
  type: string;
  uri: string;
}

export interface ProcessedInput {
  source: InputFile;
  content: string;
  metadata: any;
}

/**
 * Input processor with type-specific handlers
 */
export class InputProcessor {
  private markdownHandler: MarkdownHandler;
  private wordHandler: WordHandler;
  private pdfHandler: PDFHandler;
  private powerPointHandler: PowerPointHandler;
  private imageHandler: ImageHandler;
  private urlHandler: URLHandler;
  private textHandler: TextHandler;

  constructor(private context: ExtensionContext) {
    // Initialize all handlers
    this.markdownHandler = new MarkdownHandler(context);
    this.wordHandler = new WordHandler(context);
    this.pdfHandler = new PDFHandler(context);
    this.powerPointHandler = new PowerPointHandler(context);
    this.imageHandler = new ImageHandler(context);
    this.urlHandler = new URLHandler(context);
    this.textHandler = new TextHandler(context);
  }

  /**
   * Process input files and return combined context
   */
  public async processInputs(inputs: InputFile[]): Promise<string> {
    if (!inputs || inputs.length === 0) {
      return 'No input files provided.';
    }

    const processedInputs: ProcessedInput[] = [];

    for (const input of inputs) {
      try {
        const processed = await this.processSingleInput(input);
        processedInputs.push(processed);
      } catch (error) {
        this.context.logger.error(`Failed to process input ${input.name}:`, error);
        processedInputs.push({
          source: input,
          content: `Error processing ${input.name}: ${error}`,
          metadata: { error: true },
        });
      }
    }

    // Format processed inputs for the prompt
    return this.formatProcessedInputs(processedInputs);
  }

  /**
   * Process a single input using appropriate handler
   */
  private async processSingleInput(input: InputFile): Promise<ProcessedInput> {
    this.context.logger.info(`Processing ${input.type} input: ${input.name}`);

    let processedContent;

    try {
      switch (input.type.toLowerCase()) {
        case 'markdown':
          processedContent = await this.markdownHandler.process(input.uri);
          break;
        case 'word':
          processedContent = await this.wordHandler.process(input.uri);
          break;
        case 'pdf':
          processedContent = await this.pdfHandler.process(input.uri);
          break;
        case 'powerpoint':
          processedContent = await this.powerPointHandler.process(input.uri);
          break;
        case 'image':
          processedContent = await this.imageHandler.process(input.uri);
          break;
        case 'url':
          processedContent = await this.urlHandler.process(input.uri);
          break;
        case 'text':
        case 'file':
        default:
          processedContent = await this.textHandler.process(input.uri);
          break;
      }

      return {
        source: input,
        content: processedContent.content,
        metadata: processedContent.metadata,
      };
    } catch (error) {
      throw new Error(`Handler failed for ${input.type}: ${error}`);
    }
  }

  /**
   * Format processed inputs for prompt context
   */
  private formatProcessedInputs(inputs: ProcessedInput[]): string {
    if (inputs.length === 0) {
      return 'No input materials provided.';
    }

    const sections = inputs.map((input) => {
      const { source, content, metadata } = input;

      let section = `### ${source.name} (${source.type.toUpperCase()})\n\n`;

      // Add metadata if available
      if (metadata && !metadata.error) {
        const metaInfo = [];
        if (metadata.wordCount) {
          metaInfo.push(`Words: ${metadata.wordCount}`);
        }
        if (metadata.pageCount) {
          metaInfo.push(`Pages: ${metadata.pageCount}`);
        }
        if (metadata.slideCount) {
          metaInfo.push(`Slides: ${metadata.slideCount}`);
        }
        if (metadata.lineCount) {
          metaInfo.push(`Lines: ${metadata.lineCount}`);
        }

        if (metaInfo.length > 0) {
          section += `*Metadata: ${metaInfo.join(', ')}*\n\n`;
        }
      }

      section += content;

      return section;
    });

    return sections.join('\n\n---\n\n');
  }

  /**
   * Detect input type from file extension or URI
   */
  public static detectInputType(name: string, uri: string): string {
    // Check if it's a URL
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return 'url';
    }

    // Detect by file extension
    const ext = name.split('.').pop()?.toLowerCase();

    const typeMap: { [key: string]: string } = {
      md: 'markdown',
      markdown: 'markdown',
      txt: 'text',
      log: 'text',
      config: 'text',
      doc: 'word',
      docx: 'word',
      pdf: 'pdf',
      ppt: 'powerpoint',
      pptx: 'powerpoint',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      svg: 'image',
      webp: 'image',
    };

    return typeMap[ext || ''] || 'file';
  }
}
