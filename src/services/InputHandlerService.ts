import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';
import { InputSource, ProcessedInput, InputType } from '../models/InputModels';

/**
 * Service for handling and processing various input types
 * Routes inputs to appropriate handlers and extracts content
 */
export class InputHandlerService {
  constructor(private context: ExtensionContext) {}

  /**
   * Process multiple input sources
   */
  public async processInputs(inputs: InputSource[]): Promise<ProcessedInput[]> {
    const processed: ProcessedInput[] = [];

    for (const input of inputs) {
      try {
        const result = await this.processInput(input);
        processed.push(result);
      } catch (error) {
        this.context.logger.error(`Failed to process input ${input.name}:`, error);
        // Add error result
        processed.push({
          source: input,
          extractedContent: `Error processing ${input.name}: ${error instanceof Error ? error.message : String(error)}`,
          metadata: { error: true }
        });
      }
    }

    return processed;
  }

  /**
   * Process a single input based on its type
   */
  private async processInput(input: InputSource): Promise<ProcessedInput> {
    this.context.logger.info(`Processing input: ${input.name} (${input.type})`);

    switch (input.type) {
      case InputType.MARKDOWN:
      case InputType.TEXT:
        return await this.processTextFile(input);
      
      case InputType.URL:
        return await this.processUrl(input);
      
      case InputType.GITHUB_PR:
        return await this.processGithubPR(input);
      
      case InputType.WORD:
      case InputType.PDF:
      case InputType.POWERPOINT:
        return await this.processDocumentFile(input);
      
      case InputType.IMAGE:
        return await this.processImage(input);
      
      default:
        return await this.processGenericFile(input);
    }
  }

  /**
   * Process text-based files (markdown, txt)
   */
  private async processTextFile(input: InputSource): Promise<ProcessedInput> {
    try {
      const uri = vscode.Uri.parse(input.uri);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf8');

      return {
        source: input,
        extractedContent: text,
        metadata: {
          fileSize: content.byteLength,
          encoding: 'utf8'
        }
      };
    } catch (error) {
      throw new Error(`Failed to read text file: ${error}`);
    }
  }

  /**
   * Process URL input
   */
  private async processUrl(input: InputSource): Promise<ProcessedInput> {
    // For URLs, we'll just pass the URL to Copilot to fetch and process
    return {
      source: input,
      extractedContent: `URL Content: ${input.uri}`,
      metadata: {
        type: 'url',
        instruction: 'Please fetch and analyze the content from this URL'
      }
    };
  }

  /**
   * Process GitHub PR
   */
  private async processGithubPR(input: InputSource): Promise<ProcessedInput> {
    // For GitHub PRs, we'll pass the PR info to Copilot
    return {
      source: input,
      extractedContent: `GitHub PR: ${input.uri}`,
      metadata: {
        type: 'github_pr',
        instruction: 'Please fetch and analyze this GitHub pull request'
      }
    };
  }

  /**
   * Process document files (Word, PDF, PowerPoint)
   */
  private async processDocumentFile(input: InputSource): Promise<ProcessedInput> {
    // For complex document types, we'll let Copilot handle the extraction
    const uri = vscode.Uri.parse(input.uri);
    const fileName = path.basename(uri.fsPath);
    
    return {
      source: input,
      extractedContent: `Document File: ${fileName}`,
      metadata: {
        type: input.type,
        filePath: uri.fsPath,
        instruction: `Please extract and analyze the content from this ${input.type} file`
      }
    };
  }

  /**
   * Process image files
   */
  private async processImage(input: InputSource): Promise<ProcessedInput> {
    const uri = vscode.Uri.parse(input.uri);
    const fileName = path.basename(uri.fsPath);
    
    return {
      source: input,
      extractedContent: `Image File: ${fileName}`,
      metadata: {
        type: 'image',
        filePath: uri.fsPath,
        instruction: 'Please analyze this image and describe its content'
      }
    };
  }

  /**
   * Process generic files
   */
  private async processGenericFile(input: InputSource): Promise<ProcessedInput> {
    try {
      // Try to read as text
      const uri = vscode.Uri.parse(input.uri);
      const content = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(content).toString('utf8');
      
      // Check if it looks like text
      if (this.isTextContent(text)) {
        return {
          source: input,
          extractedContent: text,
          metadata: {
            fileSize: content.byteLength
          }
        };
      } else {
        // Binary file
        return {
          source: input,
          extractedContent: `Binary File: ${input.name}`,
          metadata: {
            type: 'binary',
            instruction: 'This appears to be a binary file'
          }
        };
      }
    } catch (error) {
      throw new Error(`Failed to process file: ${error}`);
    }
  }

  /**
   * Check if content appears to be text
   */
  private isTextContent(content: string): boolean {
    // Simple heuristic: check for null bytes or excessive control characters
    const nullBytes = (content.match(/\0/g) || []).length;
    const controlChars = (content.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g) || []).length;
    
    return nullBytes === 0 && controlChars < content.length * 0.1;
  }
}
