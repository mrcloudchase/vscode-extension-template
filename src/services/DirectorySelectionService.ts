import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';
import { RepositoryStructure } from './RepositoryContextService';
import { ProcessedContent, ChatRequest, ChatResponse } from '../models/InputModels';

/**
 * Directory selection result
 */
export interface DirectorySelection {
  selectedPath: string;
  relativePath: string;
  reasoning: string;
  confidence: number;
  isNewDirectory: boolean;
  suggestedFilename?: string;
}

/**
 * Service for selecting optimal directory placement using Copilot analysis
 */
export class DirectorySelectionService {
  constructor(private context: ExtensionContext) {}

  /**
   * Use Copilot to analyze repository and select optimal directory for new content
   */
  public async selectOptimalDirectory(
    contentRequest: string,
    processedInputs: ProcessedContent[],
    repositoryStructure: RepositoryStructure,
    copilotService: any // CopilotIntegrationService
  ): Promise<DirectorySelection> {
    this.context.logger.info('Using Copilot to select optimal directory placement...');

    // Prepare analysis prompt
    const analysisPrompt = this.createDirectoryAnalysisPrompt(
      contentRequest,
      processedInputs,
      repositoryStructure
    );

    // Send to Copilot for analysis
    const chatRequest: ChatRequest = {
      goal: analysisPrompt,
      inputs: [],
      processedContents: processedInputs
    };

    const response = await copilotService.sendToCopilot(chatRequest);
    
    // Parse Copilot's response
    return this.parseDirectorySelection(response, repositoryStructure);
  }

  /**
   * Create comprehensive prompt for directory analysis
   */
  private createDirectoryAnalysisPrompt(
    contentRequest: string,
    processedInputs: ProcessedContent[],
    repositoryStructure: RepositoryStructure
  ): string {
    const inputsSummary = this.summarizeProcessedInputs(processedInputs);
    const structureSummary = this.getStructureForAnalysis(repositoryStructure);

    return `# Directory Selection for New Content Creation

## Content Request
${contentRequest}

## Source Materials Summary
${inputsSummary}

## Repository Structure Analysis
${structureSummary}

## Task
You are an expert technical documentation architect. Based on the content request and source materials, analyze this repository structure and determine the OPTIMAL directory placement for new documentation.

## Selection Criteria
Consider these factors in your analysis:

1. **Content Type Alignment**: Where does this type of content typically belong?
2. **Existing Structure**: Follow established patterns in the repository
3. **Logical Organization**: Ensure content is discoverable and well-organized
4. **Documentation Conventions**: Respect common documentation structures
5. **Audience and Purpose**: Consider who will use this content and how

## Response Format
Provide your analysis in the following JSON format:

\`\`\`json
{
  "selectedPath": "relative/path/to/directory",
  "reasoning": "Detailed explanation of why this location is optimal",
  "confidence": 0.95,
  "isNewDirectory": false,
  "suggestedFilename": "suggested-filename.md",
  "alternatives": [
    {
      "path": "alternative/path",
      "reason": "Why this could also work",
      "confidence": 0.75
    }
  ]
}
\`\`\`

## Guidelines
- **selectedPath**: Use forward slashes, relative to repository root
- **reasoning**: Provide specific justification based on repository analysis
- **confidence**: Scale of 0.0 to 1.0 indicating certainty
- **isNewDirectory**: true if the directory doesn't exist and should be created
- **suggestedFilename**: Appropriate filename following project conventions
- **alternatives**: Up to 2 alternative locations with reasoning

## Important Notes
- If no obvious documentation structure exists, suggest creating one
- Consider both current content and future scalability
- Respect any existing naming conventions (kebab-case, camelCase, etc.)
- Factor in the specific content type and complexity
- Ensure the location makes sense for the target audience

Analyze the repository carefully and provide your expert recommendation.`;
  }

  /**
   * Summarize processed inputs for analysis
   */
  private summarizeProcessedInputs(processedInputs: ProcessedContent[]): string {
    if (processedInputs.length === 0) {
      return 'No source materials provided.';
    }

    const summary = processedInputs.map((input, index) => {
      const preview = input.text.substring(0, 200) + (input.text.length > 200 ? '...' : '');
      return `**Source ${index + 1}**: ${input.source} (${input.type})\n${preview}`;
    }).join('\n\n');

    return `Total sources: ${processedInputs.length}\n\n${summary}`;
  }

  /**
   * Get structured repository information for analysis
   */
  private getStructureForAnalysis(repositoryStructure: RepositoryStructure): string {
    const analysis = [];

    // Project type indicators
    const projectType = this.detectProjectType(repositoryStructure);
    analysis.push(`**Detected Project Type**: ${projectType}`);

    // Documentation directories
    if (repositoryStructure.documentationDirectories.length > 0) {
      analysis.push(`\n**Existing Documentation Directories**:`);
      repositoryStructure.documentationDirectories.forEach(dir => {
        const relativePath = path.relative(repositoryStructure.rootPath, dir);
        analysis.push(`  - ${relativePath}/`);
      });
    } else {
      analysis.push(`\n**Documentation Structure**: No clear documentation directories found`);
    }

    // Markdown files organization
    if (repositoryStructure.markdownFiles.length > 0) {
      analysis.push(`\n**Existing Markdown Files** (${repositoryStructure.markdownFiles.length} total):`);
      
      // Group by directory
      const filesByDir = this.groupFilesByDirectory(repositoryStructure.markdownFiles, repositoryStructure.rootPath);
      Object.entries(filesByDir).forEach(([dir, files]) => {
        analysis.push(`  ${dir}/:`);
        files.slice(0, 5).forEach(file => {
          analysis.push(`    - ${file}`);
        });
        if (files.length > 5) {
          analysis.push(`    ... and ${files.length - 5} more`);
        }
      });
    }

    // Top-level structure
    analysis.push(`\n**Repository Structure**:`);
    if (repositoryStructure.structure.children) {
      repositoryStructure.structure.children
        .filter(child => child.type === 'directory')
        .slice(0, 10)
        .forEach(child => {
          const docIndicator = child.isDocumentationRelated ? ' 📚' : '';
          analysis.push(`  📁 ${child.name}/${docIndicator}`);
        });
    }

    return analysis.join('\n');
  }

  /**
   * Detect project type based on configuration files
   */
  private detectProjectType(repositoryStructure: RepositoryStructure): string {
    const configFiles = repositoryStructure.configFiles.map(f => path.basename(f));
    
    if (configFiles.includes('package.json')) return 'Node.js/JavaScript';
    if (configFiles.includes('requirements.txt')) return 'Python';
    if (configFiles.includes('Cargo.toml')) return 'Rust';
    if (configFiles.includes('go.mod')) return 'Go';
    if (configFiles.includes('pom.xml')) return 'Java (Maven)';
    if (configFiles.includes('build.gradle')) return 'Java (Gradle)';
    if (configFiles.includes('composer.json')) return 'PHP';
    if (configFiles.includes('angular.json')) return 'Angular';
    if (configFiles.includes('next.config.js')) return 'Next.js';
    if (configFiles.includes('gatsby-config.js')) return 'Gatsby';
    if (configFiles.includes('nuxt.config.js')) return 'Nuxt.js';
    
    return 'Unknown/Generic';
  }

  /**
   * Group markdown files by their containing directory
   */
  private groupFilesByDirectory(markdownFiles: string[], rootPath: string): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    markdownFiles.forEach(filePath => {
      const relativePath = path.relative(rootPath, filePath);
      const dirPath = path.dirname(relativePath);
      const fileName = path.basename(relativePath);
      
      const displayDir = dirPath === '.' ? '(root)' : dirPath;
      
      if (!grouped[displayDir]) {
        grouped[displayDir] = [];
      }
      grouped[displayDir].push(fileName);
    });

    return grouped;
  }

  /**
   * Parse Copilot's directory selection response
   */
  private parseDirectorySelection(
    response: ChatResponse,
    repositoryStructure: RepositoryStructure
  ): DirectorySelection {
    try {
      // Extract JSON from response
      const jsonMatch = response.response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Copilot response');
      }

      const parsedResponse = JSON.parse(jsonMatch[1]);
      
      // Validate required fields
      if (!parsedResponse.selectedPath || !parsedResponse.reasoning) {
        throw new Error('Invalid response format from Copilot');
      }

      // Convert to absolute path
      const absolutePath = path.join(repositoryStructure.rootPath, parsedResponse.selectedPath);
      
      return {
        selectedPath: absolutePath,
        relativePath: parsedResponse.selectedPath,
        reasoning: parsedResponse.reasoning,
        confidence: parsedResponse.confidence || 0.8,
        isNewDirectory: parsedResponse.isNewDirectory || false,
        suggestedFilename: parsedResponse.suggestedFilename
      };

    } catch (error) {
      this.context.logger.error('Failed to parse directory selection response:', error);
      
      // Fallback: use docs directory or create one
      return this.getFallbackSelection(repositoryStructure);
    }
  }

  /**
   * Provide fallback directory selection if Copilot analysis fails
   */
  private getFallbackSelection(repositoryStructure: RepositoryStructure): DirectorySelection {
    // Try to find existing docs directory
    const docsDir = repositoryStructure.documentationDirectories.find(dir => 
      path.basename(dir).toLowerCase().includes('docs')
    );

    if (docsDir) {
      return {
        selectedPath: docsDir,
        relativePath: path.relative(repositoryStructure.rootPath, docsDir),
        reasoning: 'Fallback selection: Using existing documentation directory',
        confidence: 0.6,
        isNewDirectory: false,
        suggestedFilename: 'new-content.md'
      };
    }

    // Create docs directory as fallback
    const fallbackPath = path.join(repositoryStructure.rootPath, 'docs');
    return {
      selectedPath: fallbackPath,
      relativePath: 'docs',
      reasoning: 'Fallback selection: Creating new docs directory for documentation',
      confidence: 0.5,
      isNewDirectory: true,
      suggestedFilename: 'new-content.md'
    };
  }
}
