import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';

export interface InputFile {
  id: string;
  name: string;
  type: string;
  uri: string;
}

/**
 * Simplified input processor for content generation
 */
export class InputProcessor {
  constructor(private context: ExtensionContext) {}

  /**
   * Process input files and return combined context
   */
  public async processInputs(inputs: InputFile[]): Promise<string> {
    if (!inputs || inputs.length === 0) {
      return 'No input files provided.';
    }

    const processedContent: string[] = [];

    for (const input of inputs) {
      try {
        const content = await this.processSingleInput(input);
        processedContent.push(`### ${input.name}\n\n${content}\n`);
      } catch (error) {
        this.context.logger.error(`Failed to process input ${input.name}:`, error);
        processedContent.push(`### ${input.name}\n\nError processing file: ${error}\n`);
      }
    }

    return processedContent.join('\n---\n\n');
  }

  /**
   * Process a single input file
   */
  private async processSingleInput(input: InputFile): Promise<string> {
    try {
      const uri = vscode.Uri.parse(input.uri);

      // For text-based files, read the content
      if (this.isTextFile(input.type)) {
        const content = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(content).toString('utf8');
      }

      // For other file types, provide file information
      return `File: ${input.name} (${input.type})\nPath: ${uri.fsPath}\n\nNote: Please analyze this ${input.type} file for relevant content.`;
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }
  }

  /**
   * Check if file type is text-based
   */
  private isTextFile(type: string): boolean {
    return ['markdown', 'text', 'file'].includes(type.toLowerCase());
  }
}
