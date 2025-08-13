import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';

/**
 * Repository structure information
 */
export interface RepositoryStructure {
  rootPath: string;
  structure: DirectoryNode;
  markdownFiles: string[];
  documentationDirectories: string[];
  configFiles: string[];
}

/**
 * Directory tree node
 */
export interface DirectoryNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  size?: number;
  isDocumentationRelated?: boolean;
}

/**
 * Service for analyzing the current VSCode workspace repository context
 */
export class RepositoryContextService {
  private workspaceRoot: string;

  constructor(private context: ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder is open in VSCode');
    }
    this.workspaceRoot = workspaceFolders[0].uri.fsPath;
  }

  /**
   * Get comprehensive repository structure and context
   */
  public async getRepositoryStructure(): Promise<RepositoryStructure> {
    this.context.logger.info('Analyzing repository structure...');

    const structure = await this.buildDirectoryTree(this.workspaceRoot);
    const markdownFiles = this.findMarkdownFiles(structure);
    const documentationDirectories = this.findDocumentationDirectories(structure);
    const configFiles = this.findConfigFiles(structure);

    return {
      rootPath: this.workspaceRoot,
      structure,
      markdownFiles,
      documentationDirectories,
      configFiles
    };
  }

  /**
   * Build directory tree structure (limited depth for performance)
   */
  private async buildDirectoryTree(dirPath: string, depth: number = 0, maxDepth: number = 3): Promise<DirectoryNode> {
    const stats = fs.statSync(dirPath);
    const name = path.basename(dirPath);
    
    const node: DirectoryNode = {
      name,
      path: dirPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.isFile() ? stats.size : undefined,
      isDocumentationRelated: this.isDocumentationRelated(name, dirPath)
    };

    // If it's a directory and we haven't reached max depth, get children
    if (stats.isDirectory() && depth < maxDepth && !this.shouldSkipDirectory(name)) {
      try {
        const entries = fs.readdirSync(dirPath);
        node.children = [];

        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry);
          try {
            const childNode = await this.buildDirectoryTree(entryPath, depth + 1, maxDepth);
            node.children.push(childNode);
          } catch (error) {
            // Skip inaccessible files/directories
            this.context.logger.debug(`Skipping inaccessible path: ${entryPath}`);
          }
        }

        // Sort children: directories first, then files
        node.children.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      } catch (error) {
        this.context.logger.warn(`Cannot read directory: ${dirPath}`, error);
      }
    }

    return node;
  }

  /**
   * Find all markdown files in the repository
   */
  private findMarkdownFiles(node: DirectoryNode, files: string[] = []): string[] {
    if (node.type === 'file' && (node.name.endsWith('.md') || node.name.endsWith('.markdown'))) {
      files.push(node.path);
    }

    if (node.children) {
      for (const child of node.children) {
        this.findMarkdownFiles(child, files);
      }
    }

    return files;
  }

  /**
   * Find directories that likely contain documentation
   */
  private findDocumentationDirectories(node: DirectoryNode, dirs: string[] = []): string[] {
    if (node.type === 'directory' && node.isDocumentationRelated) {
      dirs.push(node.path);
    }

    if (node.children) {
      for (const child of node.children) {
        this.findDocumentationDirectories(child, dirs);
      }
    }

    return dirs;
  }

  /**
   * Find configuration files that might indicate project type
   */
  private findConfigFiles(node: DirectoryNode, files: string[] = []): string[] {
    const configFileNames = [
      'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 
      'pom.xml', 'build.gradle', 'composer.json', 'README.md',
      'tsconfig.json', 'webpack.config.js', 'angular.json',
      'next.config.js', 'gatsby-config.js', 'nuxt.config.js'
    ];

    if (node.type === 'file' && configFileNames.includes(node.name)) {
      files.push(node.path);
    }

    if (node.children) {
      for (const child of node.children) {
        this.findConfigFiles(child, files);
      }
    }

    return files;
  }

  /**
   * Check if a file/directory is documentation-related
   */
  private isDocumentationRelated(name: string, fullPath: string): boolean {
    const docKeywords = [
      'docs', 'doc', 'documentation', 'guide', 'guides', 'tutorial', 'tutorials',
      'manual', 'wiki', 'readme', 'api-docs', 'reference', 'examples',
      'how-to', 'howto', 'getting-started', 'quickstart'
    ];

    const lowerName = name.toLowerCase();
    return docKeywords.some(keyword => 
      lowerName.includes(keyword) || 
      lowerName === keyword ||
      lowerName.startsWith(keyword + '-') ||
      lowerName.endsWith('-' + keyword)
    );
  }

  /**
   * Check if we should skip a directory during traversal
   */
  private shouldSkipDirectory(name: string): boolean {
    const skipPatterns = [
      'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'target',
      'bin', 'obj', '.vscode', '.idea', '__pycache__', '.pytest_cache',
      'coverage', '.nyc_output', 'vendor', '.DS_Store', 'logs'
    ];

    return skipPatterns.includes(name) || name.startsWith('.');
  }

  /**
   * Get a simplified structure summary for AI analysis
   */
  public getStructureSummary(structure: RepositoryStructure): string {
    const summary = [];
    
    summary.push(`Repository Root: ${path.basename(structure.rootPath)}`);
    summary.push(`Total Markdown Files: ${structure.markdownFiles.length}`);
    summary.push(`Documentation Directories: ${structure.documentationDirectories.length}`);
    
    if (structure.documentationDirectories.length > 0) {
      summary.push('\nDocumentation Directories:');
      structure.documentationDirectories.forEach(dir => {
        const relativePath = path.relative(structure.rootPath, dir);
        summary.push(`  - ${relativePath}`);
      });
    }

    if (structure.markdownFiles.length > 0) {
      summary.push('\nExisting Markdown Files:');
      structure.markdownFiles.slice(0, 10).forEach(file => {
        const relativePath = path.relative(structure.rootPath, file);
        summary.push(`  - ${relativePath}`);
      });
      if (structure.markdownFiles.length > 10) {
        summary.push(`  ... and ${structure.markdownFiles.length - 10} more`);
      }
    }

    if (structure.configFiles.length > 0) {
      summary.push('\nProject Configuration Files:');
      structure.configFiles.forEach(file => {
        const relativePath = path.relative(structure.rootPath, file);
        summary.push(`  - ${relativePath}`);
      });
    }

    summary.push('\nDirectory Structure (top level):');
    if (structure.structure.children) {
      structure.structure.children.slice(0, 15).forEach(child => {
        const icon = child.type === 'directory' ? '📁' : '📄';
        const docIndicator = child.isDocumentationRelated ? ' 📚' : '';
        summary.push(`  ${icon} ${child.name}${docIndicator}`);
      });
    }

    return summary.join('\n');
  }

  /**
   * Get the workspace root path
   */
  public getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * Check if a path is within the workspace
   */
  public isWithinWorkspace(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const workspaceRoot = path.resolve(this.workspaceRoot);
    return resolvedPath.startsWith(workspaceRoot);
  }

  /**
   * Convert absolute path to workspace-relative path
   */
  public getRelativePath(absolutePath: string): string {
    return path.relative(this.workspaceRoot, absolutePath);
  }
}
