import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';
import { ProcessedContent, ChatRequest, ChatResponse } from '../models/InputModels';
import { DirectorySelection } from './DirectorySelectionService';
import { RepositoryStructure } from './RepositoryContextService';
import { ContentPattern, PatternSelectionRequest } from '../models/ContentPattern';
import { ContentPatternService } from './ContentPatternService';

/**
 * Content creation request
 */
export interface ContentCreationRequest {
  goal: string;
  processedInputs: ProcessedContent[];
  directorySelection: DirectorySelection;
  repositoryStructure: RepositoryStructure;
  contentType?: string;
  audience?: string;
  selectedPattern?: ContentPattern;
}

/**
 * Content creation result
 */
export interface ContentCreationResult {
  success: boolean;
  filePath?: string;
  relativePath?: string;
  content?: string;
  filename?: string;
  error?: string;
  metadata?: {
    wordCount: number;
    sections: string[];
    estimatedReadTime: number;
  };
}

/**
 * Service for creating new documentation content using AI assistance
 */
export class ContentCreationService {
  private patternService: ContentPatternService;

  constructor(private context: ExtensionContext) {
    this.patternService = new ContentPatternService(context);
  }

  /**
   * Create new content based on the request and place it in the selected directory
   */
  public async createContent(
    request: ContentCreationRequest,
    copilotService: any // CopilotIntegrationService
  ): Promise<ContentCreationResult> {
    this.context.logger.info(`Creating new content: ${request.goal}`);

    try {
      // Step 1: Select content pattern if not provided
      let contentPattern = request.selectedPattern;
      if (!contentPattern) {
        contentPattern = await this.selectContentPattern(request, copilotService);
      }

      // Step 2: Generate content using Copilot with pattern guidance
      const generatedContent = await this.generateContentWithCopilot(request, copilotService, contentPattern);
      
      // Step 3: Apply pattern structure and formatting
      const patternedContent = this.patternService.applyPatternToContent(
        contentPattern, 
        generatedContent,
        this.extractPatternVariables(request, contentPattern)
      );
      
      // Step 4: Prepare file path and ensure directory exists
      const { filePath, relativePath, filename } = await this.prepareFilePath(request);
      
      // Step 5: Save content to file
      await this.saveContentToFile(filePath, patternedContent);
      
      // Step 6: Calculate metadata
      const metadata = this.calculateContentMetadata(patternedContent);
      
      this.context.logger.info(`Content created successfully: ${relativePath}`);
      
      return {
        success: true,
        filePath,
        relativePath,
        content: patternedContent,
        filename,
        metadata
      };

    } catch (error) {
      this.context.logger.error('Failed to create content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Select appropriate content pattern for the request
   */
  private async selectContentPattern(
    request: ContentCreationRequest,
    copilotService: any
  ): Promise<ContentPattern> {
    const patternRequest: PatternSelectionRequest = {
      goal: request.goal,
      audience: request.audience || 'technical professionals',
      contentContext: this.getContentContext(request),
      suggestedType: request.contentType
    };

    const patternResult = await this.patternService.selectOptimalPattern(patternRequest, copilotService);
    
    this.context.logger.info(`Selected content pattern: ${patternResult.selectedPattern.name} (confidence: ${patternResult.confidence})`);
    
    return patternResult.selectedPattern;
  }

  /**
   * Get content context for pattern selection
   */
  private getContentContext(request: ContentCreationRequest): string {
    const context = [];
    
    // Repository context
    context.push(`Repository: ${path.basename(request.repositoryStructure.rootPath)}`);
    
    // Input materials context
    if (request.processedInputs.length > 0) {
      context.push(`Input materials: ${request.processedInputs.length} sources`);
      context.push(`Material types: ${[...new Set(request.processedInputs.map(i => i.type))].join(', ')}`);
    }
    
    // Target location context
    context.push(`Target location: ${request.directorySelection.relativePath}`);
    
    return context.join(' | ');
  }

  /**
   * Extract variables for pattern template
   */
  private extractPatternVariables(
    request: ContentCreationRequest,
    pattern: ContentPattern
  ): Record<string, string> {
    return {
      title: this.generateTitleFromGoal(request.goal),
      description: this.generateDescriptionFromGoal(request.goal),
      author: 'content-creator',
      date: new Date().toLocaleDateString(),
      audience: request.audience || 'technical professionals'
    };
  }

  /**
   * Generate title from goal
   */
  private generateTitleFromGoal(goal: string): string {
    // Clean and format goal as title
    return goal
      .replace(/^(create|write|generate)\s+/i, '')
      .replace(/\b(documentation|docs|guide)\b/gi, '')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate description from goal
   */
  private generateDescriptionFromGoal(goal: string): string {
    if (goal.length <= 100) {
      return goal;
    }
    return goal.substring(0, 100).trim() + '...';
  }

  /**
   * Generate content using Copilot with specialized prompts
   */
  private async generateContentWithCopilot(
    request: ContentCreationRequest,
    copilotService: any,
    pattern: ContentPattern
  ): Promise<string> {
    const contentPrompt = this.createContentGenerationPrompt(request, pattern);

    const chatRequest: ChatRequest = {
      goal: contentPrompt,
      inputs: [],
      processedContents: request.processedInputs
    };

    const response = await copilotService.sendToCopilot(chatRequest);
    
    // Extract and clean the generated content
    return this.extractAndCleanContent(response.response);
  }

  /**
   * Create comprehensive prompt for content generation
   */
  private createContentGenerationPrompt(request: ContentCreationRequest, pattern: ContentPattern): string {
    const inputsSummary = this.formatInputsForGeneration(request.processedInputs);
    const projectContext = this.getProjectContext(request.repositoryStructure);
    
    return `# Technical Documentation Content Creation

## Content Goal
${request.goal}

## Selected Content Pattern
**Pattern**: ${pattern.name} (${pattern.id})
**Purpose**: ${pattern.purpose}
**Description**: ${pattern.description}

## Required Structure
**Required Sections**: ${pattern.requiredSections.join(', ')}
**Section Order**: ${pattern.sectionOrder.map(s => `${s.position}. ${s.name}${s.required ? ' (required)' : ''}`).join(', ')}
**Terminal Sections**: ${pattern.terminalSections.join(', ')}

## Target Location
**Directory**: ${request.directorySelection.relativePath}
**Filename**: ${request.directorySelection.suggestedFilename || 'new-content.md'}
**Selection Reasoning**: ${request.directorySelection.reasoning}

## Project Context
${projectContext}

## Source Materials
${inputsSummary}

## Content Requirements

### Documentation Standards
- **Format**: Markdown with proper heading hierarchy
- **Style**: Professional, clear, and concise technical writing
- **Audience**: ${request.audience || 'Technical professionals and developers'}
- **Tone**: Informative and accessible

### Structure Guidelines
1. **Clear Title**: Descriptive and SEO-friendly
2. **Introduction**: Brief overview and purpose
3. **Table of Contents**: For longer documents (if needed)
4. **Main Sections**: Logical organization with proper headings
5. **Code Examples**: Well-formatted with syntax highlighting
6. **Prerequisites**: List any requirements or dependencies
7. **Best Practices**: Include tips and recommendations
8. **Troubleshooting**: Common issues and solutions (if applicable)
9. **Related Resources**: Links to additional information

### Markdown Best Practices
- Use proper heading hierarchy (H1 → H2 → H3)
- Include code blocks with language specification
- Use tables for structured data
- Add appropriate links and cross-references
- Include callout boxes for important information
- Use consistent formatting throughout

## Content Generation Instructions

Based on the source materials and project context, create comprehensive technical documentation that:

1. **Addresses the specific goal** stated above
2. **Incorporates key information** from all source materials
3. **Follows documentation best practices** for the detected project type
4. **Maintains consistency** with existing project documentation style
5. **Provides practical value** to the target audience

### Output Format
Provide the complete markdown content ready to be saved to a file. Include:

- Proper front matter (if commonly used in this project)
- Well-structured headings and sections
- Code examples with proper syntax highlighting
- Links to relevant resources
- Clear and actionable content

### Quality Standards
- **Accuracy**: Ensure all technical information is correct
- **Completeness**: Cover all aspects mentioned in the goal
- **Clarity**: Use clear language and logical organization
- **Actionability**: Provide specific steps and examples where appropriate

Generate the complete documentation content now.`;
  }

  /**
   * Format processed inputs for content generation
   */
  private formatInputsForGeneration(processedInputs: ProcessedContent[]): string {
    if (processedInputs.length === 0) {
      return 'No source materials provided - create content based on the goal and project context.';
    }

    const formattedInputs = processedInputs.map((input, index) => {
      return `### Source ${index + 1}: ${input.source}
**Type**: ${input.type}
**Content**:
${input.text}

---`;
    }).join('\n\n');

    return `${processedInputs.length} source material(s) provided:\n\n${formattedInputs}`;
  }

  /**
   * Get project context for content generation
   */
  private getProjectContext(repositoryStructure: RepositoryStructure): string {
    const context = [];
    
    // Project identification
    context.push(`**Repository**: ${path.basename(repositoryStructure.rootPath)}`);
    
    // Documentation structure
    if (repositoryStructure.documentationDirectories.length > 0) {
      context.push(`**Existing Documentation Structure**:`);
      repositoryStructure.documentationDirectories.forEach(dir => {
        const relativePath = path.relative(repositoryStructure.rootPath, dir);
        context.push(`  - ${relativePath}/`);
      });
    }
    
    // Sample existing files for style reference
    if (repositoryStructure.markdownFiles.length > 0) {
      context.push(`**Existing Documentation Files** (for style reference):`);
      repositoryStructure.markdownFiles.slice(0, 5).forEach(file => {
        const relativePath = path.relative(repositoryStructure.rootPath, file);
        context.push(`  - ${relativePath}`);
      });
    }

    // Configuration files for project type detection
    if (repositoryStructure.configFiles.length > 0) {
      const configFiles = repositoryStructure.configFiles.map(f => path.basename(f));
      context.push(`**Project Type Indicators**: ${configFiles.join(', ')}`);
    }

    return context.join('\n');
  }

  /**
   * Extract and clean generated content from Copilot response
   */
  private extractAndCleanContent(response: string): string {
    // Remove any explanatory text that might surround the actual content
    let content = response;

    // If the response is wrapped in markdown code blocks, extract the content
    const markdownMatch = content.match(/```(?:markdown|md)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      content = markdownMatch[1];
    }

    // Clean up any extra whitespace or unwanted prefixes
    content = content.trim();
    
    // Ensure proper line endings
    content = content.replace(/\r\n/g, '\n');
    
    // Add final newline if not present
    if (!content.endsWith('\n')) {
      content += '\n';
    }

    return content;
  }

  /**
   * Prepare file path and ensure directory exists
   */
  private async prepareFilePath(request: ContentCreationRequest): Promise<{
    filePath: string;
    relativePath: string;
    filename: string;
  }> {
    const { directorySelection } = request;
    
    // Ensure directory exists
    if (directorySelection.isNewDirectory) {
      await fs.promises.mkdir(directorySelection.selectedPath, { recursive: true });
      this.context.logger.info(`Created directory: ${directorySelection.relativePath}`);
    }

    // Generate filename if not provided
    let filename = directorySelection.suggestedFilename;
    if (!filename) {
      filename = this.generateFilename(request.goal);
    }

    // Ensure .md extension
    if (!filename.endsWith('.md')) {
      filename += '.md';
    }

    // Create full file path
    const filePath = path.join(directorySelection.selectedPath, filename);
    const relativePath = path.join(directorySelection.relativePath, filename);

    // Check if file already exists and handle conflicts
    if (fs.existsSync(filePath)) {
      const { newFilename, newFilePath, newRelativePath } = this.handleFileConflict(
        filePath, 
        relativePath, 
        filename,
        directorySelection
      );
      filename = newFilename;
      return {
        filePath: newFilePath,
        relativePath: newRelativePath,
        filename
      };
    }

    return { filePath, relativePath, filename };
  }

  /**
   * Generate filename from content goal
   */
  private generateFilename(goal: string): string {
    // Convert goal to filename-friendly format
    let filename = goal
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Truncate if too long
    if (filename.length > 50) {
      filename = filename.substring(0, 50).replace(/-[^-]*$/, '');
    }

    return filename || 'new-content';
  }

  /**
   * Handle file naming conflicts
   */
  private handleFileConflict(
    originalPath: string,
    originalRelativePath: string,
    originalFilename: string,
    directorySelection: DirectorySelection
  ): { newFilename: string; newFilePath: string; newRelativePath: string } {
    const baseName = path.parse(originalFilename).name;
    const extension = path.parse(originalFilename).ext;
    let counter = 1;

    while (true) {
      const newFilename = `${baseName}-${counter}${extension}`;
      const newFilePath = path.join(directorySelection.selectedPath, newFilename);
      const newRelativePath = path.join(directorySelection.relativePath, newFilename);

      if (!fs.existsSync(newFilePath)) {
        this.context.logger.info(`File conflict resolved: using ${newFilename}`);
        return { newFilename, newFilePath, newRelativePath };
      }

      counter++;
      if (counter > 100) {
        throw new Error('Unable to resolve file naming conflict');
      }
    }
  }

  /**
   * Save content to file
   */
  private async saveContentToFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, 'utf8');
    this.context.logger.info(`Content saved to: ${filePath}`);
  }

  /**
   * Calculate content metadata
   */
  private calculateContentMetadata(content: string): {
    wordCount: number;
    sections: string[];
    estimatedReadTime: number;
  } {
    // Word count (rough estimate)
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Extract sections (headings)
    const headingMatches = content.match(/^#+\s+(.+)$/gm) || [];
    const sections = headingMatches.map(heading => heading.replace(/^#+\s+/, ''));
    
    // Estimated read time (average 200 words per minute)
    const estimatedReadTime = Math.ceil(wordCount / 200);

    return {
      wordCount,
      sections,
      estimatedReadTime
    };
  }

  /**
   * Open the created file in VS Code editor
   */
  public async openCreatedFile(filePath: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      this.context.logger.info(`Opened created file in editor: ${filePath}`);
    } catch (error) {
      this.context.logger.error('Failed to open created file:', error);
      // Show file in explorer as fallback
      await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(filePath));
    }
  }
}
