import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';
import { ProcessedContent, ChatRequest, ChatResponse, InputFile } from '../models/InputModels';
import { ContentPattern } from '../models/ContentPattern';
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
import { ChatParticipantService } from './ChatParticipantService';
import { ContentPatternService } from './ContentPatternService';
import { InputHandlerService } from './InputHandlerService';

/**
 * Copilot-driven orchestration workflow
 */
export interface CopilotWorkflowRequest {
  goal: string;
  inputs: InputFile[];
  audience?: string;
  contentType?: string;
}

/**
 * Directory analysis result from Copilot
 */
export interface CopilotDirectoryAnalysis {
  selectedDirectory: string;
  reasoning: string;
  confidence: number;
  existingFiles: string[];
  repositoryContext: string;
  contentClassification?: string;
}

/**
 * Content strategy decision from Copilot
 */
export interface CopilotContentStrategy {
  action: 'create' | 'update';
  targetFile?: string; // For updates
  contentPattern: string; // Pattern ID
  reasoning: string;
  existingContentSummary?: string;
}

/**
 * Final content creation result
 */
export interface CopilotContentResult {
  success: boolean;
  filePath?: string;
  content?: string;
  action: 'created' | 'updated';
  pattern: string;
  error?: string;
}

/**
 * Copilot-driven orchestration service that uses AI for all major decisions
 */
export class CopilotOrchestrationService {
  private chatParticipant: ChatParticipantService;
  private patternService: ContentPatternService;
  private inputHandler: InputHandlerService;

  constructor(private context: ExtensionContext) {
    this.chatParticipant = new ChatParticipantService(context);
    this.patternService = new ContentPatternService(context);
    this.inputHandler = new InputHandlerService(context);
  }

  /**
   * Execute complete Copilot-driven workflow
   */
  public async executeWorkflow(
    request: CopilotWorkflowRequest,
    onProgress?: (step: string, message: string) => void
  ): Promise<CopilotContentResult> {
    try {
      onProgress?.('analyzing', 'Processing input materials...');
      
      // Step 1: Process all input materials
      const processedInputs = await this.processInputs(request.inputs);
      
      onProgress?.('repository', 'Analyzing repository structure...');
      
      // Step 2: Get repository context
      const repositoryStructure = await this.getRepositoryStructure();
      
      onProgress?.('directory', 'Asking Copilot to select optimal directory...');
      
      // Step 3: Let Copilot select the working directory
      const directoryAnalysis = await this.getCopilotDirectorySelection(
        request, 
        processedInputs, 
        repositoryStructure
      );
      
      onProgress?.('strategy', 'Copilot analyzing existing content and strategy...');
      
      // Step 4: Let Copilot analyze directory and decide create vs update
      const contentStrategy = await this.getCopilotContentStrategy(
        request,
        processedInputs,
        directoryAnalysis
      );
      
      onProgress?.('generating', `Copilot ${contentStrategy.action}ing content...`);
      
      // Step 5: Execute the content creation/update based on Copilot's decision
      const result = await this.executeCopilotContentAction(
        request,
        processedInputs,
        directoryAnalysis,
        contentStrategy
      );
      
      onProgress?.('opening', 'Opening created/updated file...');
      
      // Step 6: Open the result file
      if (result.success && result.filePath) {
        await this.openFile(result.filePath);
      }
      
      onProgress?.('complete', `Content ${result.action} successfully!`);
      
      return result;
      
    } catch (error) {
      this.context.logger.error('Copilot workflow failed:', error);
      return {
        success: false,
        action: 'created',
        pattern: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Process input files
   */
  private async processInputs(inputs: InputFile[]): Promise<ProcessedContent[]> {
    const processedContents: ProcessedContent[] = [];
    
    for (const input of inputs) {
      try {
        const result = await this.inputHandler.processInputs([input]);
        if (result.length > 0) {
          processedContents.push(result[0]);
        }
      } catch (error) {
        this.context.logger.warn(`Failed to process input ${input.name}:`, error);
      }
    }
    
    return processedContents;
  }

  /**
   * Step 3: Get Copilot's directory selection
   */
  private async getCopilotDirectorySelection(
    request: CopilotWorkflowRequest,
    processedInputs: ProcessedContent[],
    repositoryStructure: RepositoryStructure
  ): Promise<CopilotDirectoryAnalysis> {
    const prompt = this.createDirectorySelectionPrompt(request, processedInputs, repositoryStructure);
    
    const chatRequest: ChatRequest = {
      goal: prompt,
      inputs: [],
      processedContents: []
    };

    const response = await this.chatParticipant.sendToCopilotChat(chatRequest);
    return this.parseDirectoryAnalysis(response, repositoryStructure);
  }

  /**
   * Step 4: Get Copilot's content strategy (create vs update)
   */
  private async getCopilotContentStrategy(
    request: CopilotWorkflowRequest,
    processedInputs: ProcessedContent[],
    directoryAnalysis: CopilotDirectoryAnalysis
  ): Promise<CopilotContentStrategy> {
    // Get existing files in the selected directory
    const existingContent = await this.getExistingDirectoryContent(directoryAnalysis.selectedDirectory);
    
    const prompt = this.createContentStrategyPrompt(
      request, 
      processedInputs, 
      directoryAnalysis, 
      existingContent
    );
    
    const chatRequest: ChatRequest = {
      goal: prompt,
      inputs: [],
      processedContents: processedInputs
    };

    const response = await this.chatParticipant.sendToCopilotChat(chatRequest);
    return this.parseContentStrategy(response);
  }

  /**
   * Step 5: Execute content creation/update based on Copilot's decision
   */
  private async executeCopilotContentAction(
    request: CopilotWorkflowRequest,
    processedInputs: ProcessedContent[],
    directoryAnalysis: CopilotDirectoryAnalysis,
    contentStrategy: CopilotContentStrategy
  ): Promise<CopilotContentResult> {
    const pattern = this.patternService.getPatternById(contentStrategy.contentPattern);
    if (!pattern) {
      throw new Error(`Content pattern not found: ${contentStrategy.contentPattern}`);
    }

    if (contentStrategy.action === 'update') {
      return await this.updateExistingContent(
        request,
        processedInputs,
        directoryAnalysis,
        contentStrategy,
        pattern
      );
    } else {
      return await this.createNewContent(
        request,
        processedInputs,
        directoryAnalysis,
        contentStrategy,
        pattern
      );
    }
  }

  /**
   * Create directory selection prompt for Copilot
   */
  private createDirectorySelectionPrompt(
    request: CopilotWorkflowRequest,
    processedInputs: ProcessedContent[],
    repositoryStructure: RepositoryStructure
  ): string {
    // Analyze content themes from input materials
    const contentThemes = this.extractContentThemes(processedInputs);
    const technicalLevel = this.assessTechnicalLevel(processedInputs, request.audience);
    
    return `# Technical Documentation Directory Analysis

You are a senior technical documentation specialist analyzing a repository to determine the optimal placement for new documentation content.

## Content Analysis
**Primary Goal**: ${request.goal}
**Target Audience**: ${request.audience || 'technical professionals'}
**Content Type**: ${request.contentType || 'documentation'}

**Content Themes Identified**:
${contentThemes.map(theme => `- ${theme}`).join('\n')}

**Technical Level**: ${technicalLevel}

## Source Materials Analysis
${processedInputs.map((content, i) => {
  const preview = content.text.substring(0, 200).replace(/\n/g, ' ');
  return `### ${i + 1}. ${content.source} (${content.type})
**Content Preview**: ${preview}...
**Key Topics**: ${this.extractKeyTopics(content.text)}`;
}).join('\n\n')}

## Repository Structure Analysis
**Root Path**: ${repositoryStructure.rootPath}
**Project Type**: ${this.inferProjectType(repositoryStructure)}

**Documentation Structure**:
${repositoryStructure.documentationDirectories.map(dir => `- \`${dir}\` - ${this.analyzeDirectoryPurpose(dir)}`).join('\n')}

**Existing Markdown Files**: ${repositoryStructure.markdownFiles.length} files
**Configuration Files**: ${repositoryStructure.configFiles.join(', ')}

## Documentation Specialist Analysis Required

### 1. Repository Organization Assessment
Analyze the existing documentation structure to understand:
- Information architecture patterns
- Audience segmentation (developer vs user docs)
- Content categorization approach
- Naming conventions and hierarchy

### 2. Content Classification
Based on the goal and source materials, classify this content as:
- **API Documentation** (endpoints, authentication, integration)
- **User Guides** (how-to instructions for end users)
- **Developer Documentation** (technical implementation guides)
- **Reference Materials** (specifications, configurations)
- **Tutorials** (step-by-step learning paths)
- **Overview/Conceptual** (architecture, design decisions)

### 3. Logical Placement Analysis
Consider documentation best practices:
- **Proximity**: Place near related existing content
- **Discoverability**: Ensure users can find it logically
- **Maintainability**: Consider who will update this content
- **User Journey**: Where would users expect to find this?

### 4. Directory Selection Criteria
Evaluate each potential directory based on:
- **Semantic fit**: Content topic alignment
- **Audience alignment**: Target user match
- **Structural consistency**: Follows established patterns
- **Future scalability**: Room for related content growth

## Required Response Format
Provide your professional analysis in JSON format:

\`\`\`json
{
  "selectedDirectory": "exact/relative/path",
  "reasoning": "Detailed technical documentation specialist reasoning explaining the choice based on information architecture, user needs, and content strategy",
  "confidence": 0.95,
  "contentClassification": "primary content category",
  "existingFiles": ["relevant files in or near selected directory"],
  "repositoryContext": "how this fits the overall documentation strategy",
  "alternativeOptions": [
    {
      "directory": "alternative/path",
      "reason": "why this was considered but not selected"
    }
  ],
  "documentationStrategy": "how this content supports the overall documentation goals"
}
\`\`\`

Analyze this systematically as a professional technical documentation specialist would, considering information architecture, user experience, and content strategy principles.`;
  }

  /**
   * Create content strategy prompt for Copilot
   */
  private createContentStrategyPrompt(
    request: CopilotWorkflowRequest,
    processedInputs: ProcessedContent[],
    directoryAnalysis: CopilotDirectoryAnalysis,
    existingContent: { [filename: string]: string }
  ): string {
    const availablePatterns = this.patternService.getAvailablePatterns()
      .map(p => `### ${p.id}: ${p.name}
**Purpose**: ${p.purpose}
**Best For**: ${this.getPatternUseCase(p)}
**Required Sections**: ${p.requiredSections.join(', ')}
**Structure**: ${p.sectionOrder.map(s => s.name).join(' → ')}`).join('\n\n');

    const existingFiles = Object.keys(existingContent);
    const contentAnalysis = this.analyzeExistingContent(existingContent, request.goal);

    return `# Technical Documentation Strategy Analysis

You are a senior technical documentation specialist making strategic decisions about content creation and organization.

## Content Requirements Analysis
**Primary Goal**: ${request.goal}
**Target Directory**: ${directoryAnalysis.selectedDirectory}
**Directory Selection Reasoning**: ${directoryAnalysis.reasoning}
**Content Classification**: ${directoryAnalysis.contentClassification || 'To be determined'}

## Source Materials Evaluation
${processedInputs.map((content, i) => {
  const keyInfo = this.extractStructuredInfo(content);
  return `### ${i + 1}. ${content.source} (${content.type})
**Content Type**: ${keyInfo.type}
**Technical Depth**: ${keyInfo.depth}
**Primary Topics**: ${keyInfo.topics}
**Audience Indicators**: ${keyInfo.audienceLevel}
**Key Information**:
${content.text.substring(0, 400).replace(/\n/g, '\n  ')}...`;
}).join('\n\n')}

## Existing Content Analysis
${existingFiles.length > 0 ? contentAnalysis : 'No existing content files in target directory.'}

## Content Pattern Assessment

You must evaluate each pattern systematically based on the content goal and source materials:

${availablePatterns}

## Strategic Decision Framework

### 1. CREATE vs UPDATE Analysis
Evaluate systematically:

**CREATE New Content When**:
- No existing content covers the same topic scope
- Content serves a distinctly different audience
- Information represents a new product/feature area
- Existing content would become too complex if merged

**UPDATE Existing Content When**:
- Content significantly overlaps with existing material (>60% topic overlap)
- New information enhances/corrects existing documentation
- Content serves the same primary audience and use case
- Update maintains coherent user experience

### 2. Content Pattern Selection Criteria
Choose pattern based on **user intent and content nature**:

- **Overview**: User needs high-level understanding of service/product
- **Concept**: User needs deep technical understanding of how something works
- **Quickstart**: User needs immediate, working result (< 10 minutes)
- **How-to**: User has specific task to accomplish with flexibility
- **Tutorial**: User needs guided, step-by-step learning experience

### 3. Professional Assessment Required
Analyze like a documentation specialist:
- **User Journey**: Where does this fit in user's learning/implementation path?
- **Information Architecture**: How does this serve the overall doc strategy?
- **Content Lifecycle**: Who will maintain this? How often will it change?
- **Cross-References**: What other content will link to/from this?

## Required Strategic Response

Provide your professional documentation strategy decision:

\`\`\`json
{
  "action": "create|update",
  "targetFile": "specific-filename.md (if updating existing)",
  "contentPattern": "exact-pattern-id",
  "reasoning": "Comprehensive technical documentation specialist reasoning covering: user intent analysis, content gap assessment, pattern selection rationale, and strategic fit within documentation ecosystem",
  "contentOverlapAnalysis": "detailed analysis of overlap with existing content",
  "userJourneyContext": "where this content fits in user's learning/implementation journey",
  "patternJustification": "why this specific pattern best serves the user intent and content nature",
  "maintenanceConsiderations": "who will maintain this content and update frequency",
  "existingContentImpact": "how this affects or enhances existing documentation"
}
\`\`\`

Make this decision based on professional documentation strategy principles, not random selection. Consider user experience, information architecture, and long-term maintainability.`;
  }

  /**
   * Get existing content in directory
   */
  private async getExistingDirectoryContent(directoryPath: string): Promise<{ [filename: string]: string }> {
    const content: { [filename: string]: string } = {};
    
    try {
      const fullPath = path.resolve(directoryPath);
      if (!fs.existsSync(fullPath)) {
        return content;
      }

      const files = fs.readdirSync(fullPath)
        .filter(file => file.endsWith('.md') || file.endsWith('.txt'))
        .slice(0, 10); // Limit to 10 files for performance

      for (const file of files) {
        const filePath = path.join(fullPath, file);
        try {
          content[file] = fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
          this.context.logger.warn(`Failed to read ${file}:`, error);
        }
      }
    } catch (error) {
      this.context.logger.warn('Failed to read directory content:', error);
    }

    return content;
  }

  /**
   * Parse Copilot's directory analysis response
   */
  private parseDirectoryAnalysis(
    response: ChatResponse, 
    repositoryStructure: RepositoryStructure
  ): CopilotDirectoryAnalysis {
    try {
      const jsonMatch = response.response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          selectedDirectory: parsed.selectedDirectory || './docs',
          reasoning: parsed.reasoning || 'Default selection',
          confidence: parsed.confidence || 0.7,
          existingFiles: parsed.existingFiles || [],
          repositoryContext: parsed.repositoryContext || 'Documentation placement'
        };
      }
    } catch (error) {
      this.context.logger.warn('Failed to parse directory analysis:', error);
    }

    // Fallback
    return {
      selectedDirectory: './docs',
      reasoning: 'Fallback to docs directory',
      confidence: 0.5,
      existingFiles: [],
      repositoryContext: 'Default documentation location'
    };
  }

  /**
   * Parse Copilot's content strategy response
   */
  private parseContentStrategy(response: ChatResponse): CopilotContentStrategy {
    try {
      const jsonMatch = response.response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          action: parsed.action === 'update' ? 'update' : 'create',
          targetFile: parsed.targetFile,
          contentPattern: parsed.contentPattern || 'technical-guide',
          reasoning: parsed.reasoning || 'Content strategy decision',
          existingContentSummary: parsed.existingContentSummary
        };
      }
    } catch (error) {
      this.context.logger.warn('Failed to parse content strategy:', error);
    }

    // Fallback
    return {
      action: 'create',
      contentPattern: 'technical-guide',
      reasoning: 'Fallback to create new content'
    };
  }

  /**
   * Create new content
   */
  private async createNewContent(
    request: CopilotWorkflowRequest,
    processedInputs: ProcessedContent[],
    directoryAnalysis: CopilotDirectoryAnalysis,
    contentStrategy: CopilotContentStrategy,
    pattern: ContentPattern
  ): Promise<CopilotContentResult> {
    const createPrompt = `# Create New Content

## Content Request
**Goal**: ${request.goal}
**Pattern**: ${pattern.name} - ${pattern.purpose}
**Target Directory**: ${directoryAnalysis.selectedDirectory}

## Content Pattern Requirements
**Required Sections**: ${pattern.requiredSections.join(', ')}
**Section Order**: ${pattern.sectionOrder.map(s => `${s.position}. ${s.name}`).join(', ')}

## Source Materials
${processedInputs.map((content, i) => `### ${i + 1}. ${content.source}\n${content.text}`).join('\n\n')}

## Instructions
Create professional technical documentation following the ${pattern.name} pattern. Include all required sections in the correct order. Use the source materials to inform the content, ensuring accuracy and completeness.

Generate complete, ready-to-publish Markdown content.`;

    const chatRequest: ChatRequest = {
      goal: createPrompt,
      inputs: [],
      processedContents: processedInputs
    };

    const response = await this.chatParticipant.sendToCopilotChat(chatRequest);
    
    // Generate filename and save
    const filename = this.generateFilename(request.goal, pattern);
    const filePath = path.join(directoryAnalysis.selectedDirectory, filename);
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    
    // Save content
    await fs.promises.writeFile(filePath, response.response, 'utf-8');
    
    return {
      success: true,
      filePath,
      content: response.response,
      action: 'created',
      pattern: pattern.id
    };
  }

  /**
   * Update existing content
   */
  private async updateExistingContent(
    request: CopilotWorkflowRequest,
    processedInputs: ProcessedContent[],
    directoryAnalysis: CopilotDirectoryAnalysis,
    contentStrategy: CopilotContentStrategy,
    pattern: ContentPattern
  ): Promise<CopilotContentResult> {
    if (!contentStrategy.targetFile) {
      throw new Error('Target file not specified for update');
    }

    const targetPath = path.join(directoryAnalysis.selectedDirectory, contentStrategy.targetFile);
    const existingContent = fs.readFileSync(targetPath, 'utf-8');

    const updatePrompt = `# Update Existing Content

## Content Request
**Goal**: ${request.goal}
**Pattern**: ${pattern.name} - ${pattern.purpose}
**Target File**: ${contentStrategy.targetFile}

## Existing Content
\`\`\`markdown
${existingContent}
\`\`\`

## New Source Materials  
${processedInputs.map((content, i) => `### ${i + 1}. ${content.source}\n${content.text}`).join('\n\n')}

## Instructions
Update the existing content by incorporating the new source materials. Maintain the ${pattern.name} pattern structure and ensure all required sections are present. Preserve existing valuable content while enhancing with new information.

Generate the complete updated Markdown content.`;

    const chatRequest: ChatRequest = {
      goal: updatePrompt,
      inputs: [],
      processedContents: processedInputs
    };

    const response = await this.chatParticipant.sendToCopilotChat(chatRequest);
    
    // Save updated content
    await fs.promises.writeFile(targetPath, response.response, 'utf-8');
    
    return {
      success: true,
      filePath: targetPath,
      content: response.response,
      action: 'updated',
      pattern: pattern.id
    };
  }

  /**
   * Generate filename from goal and pattern
   */
  private generateFilename(goal: string, pattern: ContentPattern): string {
    const baseFileName = goal
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    const patternPrefix = pattern.id === 'quickstart' ? 'quickstart-' : '';
    return `${patternPrefix}${baseFileName}.md`;
  }

  /**
   * Open created/updated file
   */
  private async openFile(filePath: string): Promise<void> {
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      this.context.logger.warn('Failed to open file:', error);
    }
  }

  /**
   * Extract content themes from processed inputs
   */
  private extractContentThemes(processedInputs: ProcessedContent[]): string[] {
    const themes: string[] = [];
    
    processedInputs.forEach(content => {
      const text = content.text.toLowerCase();
      
      // Technical themes
      if (text.includes('api') || text.includes('endpoint')) themes.push('API Documentation');
      if (text.includes('authentication') || text.includes('auth')) themes.push('Authentication');
      if (text.includes('tutorial') || text.includes('step by step')) themes.push('Tutorial Content');
      if (text.includes('guide') || text.includes('how to')) themes.push('Instructional Guide');
      if (text.includes('reference') || text.includes('specification')) themes.push('Reference Material');
      if (text.includes('install') || text.includes('setup')) themes.push('Setup/Installation');
      if (text.includes('config') || text.includes('configuration')) themes.push('Configuration');
      if (text.includes('troubleshoot') || text.includes('error')) themes.push('Troubleshooting');
    });
    
    return [...new Set(themes)]; // Remove duplicates
  }

  /**
   * Assess technical level from content and audience
   */
  private assessTechnicalLevel(processedInputs: ProcessedContent[], audience?: string): string {
    const audienceLevel = audience?.toLowerCase() || '';
    
    if (audienceLevel.includes('beginner') || audienceLevel.includes('new')) return 'Beginner';
    if (audienceLevel.includes('advanced') || audienceLevel.includes('expert')) return 'Advanced';
    if (audienceLevel.includes('developer') || audienceLevel.includes('technical')) return 'Technical Professional';
    
    // Analyze content complexity
    const complexityIndicators = processedInputs.reduce((score, content) => {
      const text = content.text.toLowerCase();
      if (text.includes('code') || text.includes('function')) score += 2;
      if (text.includes('implementation') || text.includes('architecture')) score += 2;
      if (text.includes('configure') || text.includes('setup')) score += 1;
      if (text.includes('example') || text.includes('tutorial')) score -= 1;
      return score;
    }, 0);
    
    if (complexityIndicators > 3) return 'Advanced Technical';
    if (complexityIndicators > 0) return 'Intermediate Technical';
    return 'Beginner Friendly';
  }

  /**
   * Extract key topics from content
   */
  private extractKeyTopics(text: string): string {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Common technical topics
    const topicPatterns = {
      'API': /\bapi\b|\bendpoint\b|\brequest\b|\bresponse\b/,
      'Authentication': /\bauth\b|\blogin\b|\btoken\b|\bcredential\b/,
      'Configuration': /\bconfig\b|\bsetting\b|\bparameter\b|\boption\b/,
      'Installation': /\binstall\b|\bsetup\b|\bdownload\b|\bdeploy\b/,
      'Development': /\bcode\b|\bfunction\b|\bmethod\b|\bclass\b/,
      'Integration': /\bintegrat\b|\bconnect\b|\blink\b|\bimport\b/,
      'Security': /\bsecur\b|\bpermission\b|\baccess\b|\bprivate\b/,
      'Testing': /\btest\b|\bvalidat\b|\bverif\b|\bdebug\b/
    };
    
    Object.entries(topicPatterns).forEach(([topic, pattern]) => {
      if (pattern.test(lowerText)) topics.push(topic);
    });
    
    return topics.slice(0, 5).join(', ') || 'General Documentation';
  }

  /**
   * Infer project type from repository structure
   */
  private inferProjectType(repositoryStructure: RepositoryStructure): string {
    const files = repositoryStructure.configFiles.join(' ').toLowerCase();
    const markdownFiles = repositoryStructure.markdownFiles.join(' ').toLowerCase();
    
    if (files.includes('package.json')) return 'Node.js/JavaScript Project';
    if (files.includes('requirements.txt') || files.includes('setup.py')) return 'Python Project';
    if (files.includes('cargo.toml')) return 'Rust Project';
    if (files.includes('go.mod')) return 'Go Project';
    if (files.includes('pom.xml') || files.includes('build.gradle')) return 'Java Project';
    if (markdownFiles.includes('readme') || markdownFiles.includes('docs')) return 'Documentation Project';
    
    return 'Software Project';
  }

  /**
   * Analyze directory purpose from path
   */
  private analyzeDirectoryPurpose(dirPath: string): string {
    const path = dirPath.toLowerCase();
    
    if (path.includes('api')) return 'API documentation and references';
    if (path.includes('guide')) return 'User guides and tutorials';
    if (path.includes('doc')) return 'General documentation';
    if (path.includes('tutorial')) return 'Step-by-step tutorials';
    if (path.includes('reference')) return 'Reference materials';
    if (path.includes('example')) return 'Code examples and samples';
    if (path.includes('getting-started') || path.includes('quickstart')) return 'Getting started guides';
    
    return 'Documentation directory';
  }

  /**
   * Get pattern use case description
   */
  private getPatternUseCase(pattern: any): string {
    const useCases: Record<string, string> = {
      'overview': 'Service introductions, feature comparisons, high-level explanations',
      'concept': 'Deep technical understanding, architectural explanations, how things work',
      'quickstart': 'Fast results under 10 minutes, immediate value for users',
      'howto': 'Task-oriented instructions with flexibility and options',
      'tutorial': 'Guided learning experiences with specific scenarios',
      'technical-guide': 'Comprehensive implementation and configuration guides',
      'api-docs': 'API references, integration guides, developer resources'
    };
    
    return useCases[pattern.id] || 'General technical documentation';
  }

  /**
   * Analyze existing content for strategic decisions
   */
  private analyzeExistingContent(existingContent: { [filename: string]: string }, goal: string): string {
    const analysis: string[] = [];
    
    Object.entries(existingContent).forEach(([filename, content]) => {
      const contentPreview = content.substring(0, 300);
      const topics = this.extractKeyTopics(content);
      const contentType = this.classifyContentType(content);
      
      analysis.push(`**${filename}**:
- Content Type: ${contentType}
- Key Topics: ${topics}
- Content Preview: ${contentPreview.replace(/\n/g, ' ')}...
- Relevance to Goal: ${this.assessRelevanceToGoal(content, goal)}`);
    });
    
    return analysis.join('\n\n');
  }

  /**
   * Extract structured information from content
   */
  private extractStructuredInfo(content: ProcessedContent): any {
    const text = content.text;
    const lowerText = text.toLowerCase();
    
    return {
      type: this.classifyContentType(text),
      depth: this.assessContentDepth(text),
      topics: this.extractKeyTopics(text),
      audienceLevel: this.inferAudienceLevel(text)
    };
  }

  /**
   * Classify content type
   */
  private classifyContentType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('api') && lowerText.includes('endpoint')) return 'API Documentation';
    if (lowerText.includes('tutorial') || lowerText.includes('step')) return 'Tutorial';
    if (lowerText.includes('guide') || lowerText.includes('how to')) return 'Guide';
    if (lowerText.includes('reference') || lowerText.includes('spec')) return 'Reference';
    if (lowerText.includes('overview') || lowerText.includes('introduction')) return 'Overview';
    if (lowerText.includes('concept') || lowerText.includes('architecture')) return 'Conceptual';
    
    return 'General Documentation';
  }

  /**
   * Assess content depth
   */
  private assessContentDepth(text: string): string {
    const technicalTerms = (text.match(/\b(function|method|class|interface|implementation|architecture|algorithm)\b/gi) || []).length;
    const codeBlocks = (text.match(/```|`[^`]+`/g) || []).length;
    const complexity = technicalTerms + codeBlocks;
    
    if (complexity > 10) return 'Deep Technical';
    if (complexity > 5) return 'Moderate Technical';
    return 'Introductory';
  }

  /**
   * Infer audience level from content
   */
  private inferAudienceLevel(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('beginner') || lowerText.includes('introduction')) return 'Beginner';
    if (lowerText.includes('advanced') || lowerText.includes('expert')) return 'Advanced';
    if (lowerText.includes('developer') || lowerText.includes('technical')) return 'Technical Professional';
    
    return 'General Audience';
  }

  /**
   * Assess relevance to goal
   */
  private assessRelevanceToGoal(content: string, goal: string): string {
    const goalWords = goal.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const overlap = goalWords.filter(word => 
      word.length > 3 && contentWords.some(cWord => cWord.includes(word))
    ).length;
    
    const relevanceScore = overlap / goalWords.length;
    
    if (relevanceScore > 0.6) return 'High - significant topic overlap';
    if (relevanceScore > 0.3) return 'Medium - some topic overlap';
    return 'Low - minimal topic overlap';
  }

  /**
   * Get repository structure for current workspace
   */
  private async getRepositoryStructure(): Promise<RepositoryStructure> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder found');
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    
    return {
      rootPath,
      structure: await this.buildDirectoryTree(rootPath),
      markdownFiles: await this.findMarkdownFiles(rootPath),
      documentationDirectories: await this.findDocumentationDirectories(rootPath),
      configFiles: await this.findConfigFiles(rootPath)
    };
  }

  /**
   * Build directory tree structure
   */
  private async buildDirectoryTree(dirPath: string): Promise<DirectoryNode> {
    const stats = await fs.promises.stat(dirPath);
    const node: DirectoryNode = {
      name: path.basename(dirPath),
      path: dirPath,
      type: stats.isDirectory() ? 'directory' : 'file',
      size: stats.size
    };

    if (stats.isDirectory()) {
      try {
        const entries = await fs.promises.readdir(dirPath);
        node.children = [];
        
        for (const entry of entries.slice(0, 50)) { // Limit for performance
          if (entry.startsWith('.') && !['docs', 'documentation'].includes(entry)) continue;
          
          const entryPath = path.join(dirPath, entry);
          try {
            node.children.push(await this.buildDirectoryTree(entryPath));
          } catch (error) {
            // Skip entries we can't access
          }
        }
      } catch (error) {
        // Can't read directory
      }
    }

    return node;
  }

  /**
   * Find all markdown files in the workspace
   */
  private async findMarkdownFiles(rootPath: string): Promise<string[]> {
    const markdownFiles: string[] = [];
    
    try {
      const files = await vscode.workspace.findFiles('**/*.{md,markdown}', '**/node_modules/**', 100);
      return files.map(file => file.fsPath);
    } catch (error) {
      return markdownFiles;
    }
  }

  /**
   * Find documentation directories
   */
  private async findDocumentationDirectories(rootPath: string): Promise<string[]> {
    const docDirs: string[] = [];
    const commonDocDirs = ['docs', 'documentation', 'doc', 'guide', 'guides', 'api', 'wiki'];
    
    for (const dirName of commonDocDirs) {
      const dirPath = path.join(rootPath, dirName);
      try {
        const stats = await fs.promises.stat(dirPath);
        if (stats.isDirectory()) {
          docDirs.push(dirPath);
        }
      } catch (error) {
        // Directory doesn't exist
      }
    }
    
    return docDirs;
  }

  /**
   * Find configuration files
   */
  private async findConfigFiles(rootPath: string): Promise<string[]> {
    const configFiles: string[] = [];
    const commonConfigFiles = [
      'package.json', 'requirements.txt', 'setup.py', 'cargo.toml', 'go.mod',
      'pom.xml', 'build.gradle', 'README.md', 'README.rst'
    ];
    
    for (const fileName of commonConfigFiles) {
      const filePath = path.join(rootPath, fileName);
      try {
        await fs.promises.stat(filePath);
        configFiles.push(fileName);
      } catch (error) {
        // File doesn't exist
      }
    }
    
    return configFiles;
  }
}
