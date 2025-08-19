import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ExtensionContext } from '../../types/ExtensionContext';

/**
 * Handles file system operations for workflow execution
 * Single responsibility: File reading and writing operations
 */
export class FileOperations {
  constructor(private context: ExtensionContext) {}

  /**
   * Read directory contents
   */
  public async readDirectoryContents(directory: string): Promise<string[]> {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const fullPath = path.join(workspaceRoot, directory);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      this.context.logger.warn(`Failed to read directory ${fullPath}:`, error);
      return [];
    }
  }

  /**
   * Read file content
   */
  public async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Write file with directory creation
   */
  public async writeFile(directory: string, filename: string, content: string): Promise<string> {
    const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const dirPath = path.join(workspaceRoot, directory);
    const filePath = path.join(dirPath, filename);

    try {
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });

      // Write file
      await fs.writeFile(filePath, content, 'utf-8');

      this.context.logger.info(`File written successfully: ${filePath}`);
      return filePath;
    } catch (error) {
      throw new Error(
        `Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
