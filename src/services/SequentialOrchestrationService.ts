import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from '../types/ExtensionContext';
import { InputFile, ProcessedContent } from '../models/InputModels';
import { 
  ContentRequestSchema,
  DirectorySelectionSchema,
  ContentStrategySchema,
  PatternSelectionSchema,
  ContentGenerationSchema,
  RepositoryAnalysisSchema,
  WorkflowStepResult,
  OrchestrationResult
} from '../models/OrchestrationModels';
import { ContentPattern } from '../models/ContentPattern';
import { InputHandlerService } from './InputHandlerService';
import { ContentPatternService } from './ContentPatternService';
import { PromptService } from './PromptService';
import { ChatParticipantService } from './ChatParticipantService';

/**
 * Sequential orchestration service with deterministic schemas
 * Each step sends a separate prompt to Copilot with structured output
 */
export class SequentialOrchestrationService {
  private inputHandler: InputHandlerService;
  private patternService: ContentPatternService;
  private promptService: PromptService;
  private chatParticipant: ChatParticipantService;

  constructor(private context: ExtensionContext) {
    this.inputHandler = new InputHandlerService(context);
    this.patternService = new ContentPatternService(context);
    this.promptService = new PromptService(context);
    this.chatParticipant = new ChatParticipantService(context);
  }

  /**
   * Execute the complete sequential workflow
   */
  public async executeWorkflow(
    goal: string,
    inputs: InputFile[],
    options?: {
      audience?: string;
      contentType?: string;
      onProgress?: (step: string, message: string) => void;
    }
  ): Promise<OrchestrationResult> {
    const progress = options?.onProgress;
    const result: OrchestrationResult = {
      success: false,
      action: 'CREATED',
      steps: {}
    };

    try {
      // Step 0: Process inputs and prepare content request
      progress?.('preparing', 'Processing input materials...');
      const processedInputs = await this.processInputs(inputs);
      const contentRequest = this.createContentRequest(goal, processedInputs, options);
      const repositoryAnalysis = await this.analyzeRepository();

      // Step 1: Directory Selection
      progress?.('directory', 'Selecting optimal directory with Copilot...');
      const directoryResult = await this.selectDirectory(contentRequest, repositoryAnalysis);
      result.steps.directorySelection = directoryResult;
      
      if (!directoryResult.success || !directoryResult.data) {
        throw new Error('Directory selection failed: ' + directoryResult.error);
      }

      // Step 2: Content Strategy (CREATE vs UPDATE)
      progress?.('strategy', 'Determining content strategy with Copilot...');
      const strategyResult = await this.determineStrategy(
        contentRequest, 
        directoryResult.data,
        await this.readDirectoryContents(directoryResult.data.selectedDirectory)
      );
      result.steps.contentStrategy = strategyResult;

      if (!strategyResult.success || !strategyResult.data) {
        throw new Error('Content strategy failed: ' + strategyResult.error);
      }

      // Step 3: Pattern Selection (if CREATE) or Content Update (if UPDATE)
      if (strategyResult.data.action === 'CREATE') {
        progress?.('pattern', 'Selecting content pattern with Copilot...');
        const patternResult = await this.selectPattern(contentRequest, directoryResult.data);
        result.steps.patternSelection = patternResult;

        if (!patternResult.success || !patternResult.data) {
          throw new Error('Pattern selection failed: ' + patternResult.error);
        }

        // Step 4: Generate new content
        progress?.('generating', 'Generating content with Copilot...');
        const generationResult = await this.generateContent(
          contentRequest,
          directoryResult.data,
          patternResult.data,
          processedInputs
        );
        result.steps.contentGeneration = generationResult;

        if (!generationResult.success || !generationResult.data) {
          throw new Error('Content generation failed: ' + generationResult.error);
        }

        // Save the generated content
        const filePath = await this.saveContent(
          directoryResult.data.selectedDirectory,
          generationResult.data
        );
        
        result.success = true;
        result.filePath = filePath;
        result.action = 'CREATED';

      } else {
        // UPDATE existing content
        progress?.('updating', 'Updating content with Copilot...');
        const updateResult = await this.updateContent(
          contentRequest,
          directoryResult.data,
          strategyResult.data,
          processedInputs
        );
        result.steps.contentGeneration = updateResult;

        if (!updateResult.success || !updateResult.data) {
          throw new Error('Content update failed: ' + updateResult.error);
        }

        // Save the updated content
        const filePath = path.join(
          directoryResult.data.selectedDirectory,
          strategyResult.data.targetFile!
        );
        await fs.promises.writeFile(filePath, updateResult.data.content, 'utf-8');
        
        result.success = true;
        result.filePath = filePath;
        result.action = 'UPDATED';
      }

      // Open the file
      progress?.('opening', 'Opening created/updated file...');
      if (result.filePath) {
        await this.openFile(result.filePath);
      }

      progress?.('complete', `Content ${result.action.toLowerCase()} successfully!`);
      return result;

    } catch (error) {
      this.context.logger.error('Orchestration failed:', error);
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Step 1: Select directory using Copilot
   */
  private async selectDirectory(
    contentRequest: ContentRequestSchema,
    repositoryAnalysis: RepositoryAnalysisSchema
  ): Promise<WorkflowStepResult<DirectorySelectionSchema>> {
    const promptTemplate = await this.promptService.getPrompt('orchestration/01-directory-selection');
    if (!promptTemplate) {
      throw new Error('Directory selection prompt not found');
    }
    
    const prompt = this.promptService.renderPrompt(promptTemplate.content, {
      content_request: JSON.stringify(contentRequest, null, 2),
      repository_analysis: JSON.stringify(repositoryAnalysis, null, 2)
    });

    const response = await this.sendToCopilot(prompt);
    
    try {
      const data = this.parseJsonResponse<DirectorySelectionSchema>(response);
      return {
        success: true,
        data,
        prompt,
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        prompt,
        response
      };
    }
  }

  /**
   * Step 2: Determine content strategy using Copilot
   */
  private async determineStrategy(
    contentRequest: ContentRequestSchema,
    directorySelection: DirectorySelectionSchema,
    existingContent: string
  ): Promise<WorkflowStepResult<ContentStrategySchema>> {
    const promptTemplate = await this.promptService.getPrompt('orchestration/02-content-strategy');
    if (!promptTemplate) {
      throw new Error('Content strategy prompt not found');
    }
    
    const prompt = this.promptService.renderPrompt(promptTemplate.content, {
      content_request: JSON.stringify(contentRequest, null, 2),
      selected_directory: JSON.stringify(directorySelection, null, 2),
      existing_content: existingContent
    });

    const response = await this.sendToCopilot(prompt);
    
    try {
      const data = this.parseJsonResponse<ContentStrategySchema>(response);
      return {
        success: true,
        data,
        prompt,
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        prompt,
        response
      };
    }
  }

  /**
   * Step 3: Select content pattern using Copilot
   */
  private async selectPattern(
    contentRequest: ContentRequestSchema,
    directorySelection: DirectorySelectionSchema
  ): Promise<WorkflowStepResult<PatternSelectionSchema>> {
    const promptTemplate = await this.promptService.getPrompt('orchestration/03-pattern-selection');
    if (!promptTemplate) {
      throw new Error('Pattern selection prompt not found');
    }
    const availablePatterns = this.patternService.getAvailablePatterns();
    
    const prompt = this.promptService.renderPrompt(promptTemplate.content, {
      content_request: JSON.stringify(contentRequest, null, 2),
      target_directory: directorySelection.selectedDirectory,
      available_patterns: JSON.stringify(
        availablePatterns.map(p => ({
          id: p.id,
          name: p.name,
          purpose: p.purpose,
          requiredSections: p.requiredSections
        })),
        null,
        2
      )
    });

    const response = await this.sendToCopilot(prompt);
    
    try {
      const data = this.parseJsonResponse<PatternSelectionSchema>(response);
      return {
        success: true,
        data,
        prompt,
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        prompt,
        response
      };
    }
  }

  /**
   * Step 4: Generate content using Copilot
   */
  private async generateContent(
    contentRequest: ContentRequestSchema,
    directorySelection: DirectorySelectionSchema,
    patternSelection: PatternSelectionSchema,
    processedInputs: ProcessedContent[]
  ): Promise<WorkflowStepResult<ContentGenerationSchema>> {
    const promptTemplate = await this.promptService.getPrompt('orchestration/04-content-generation');
    if (!promptTemplate) {
      throw new Error('Content generation prompt not found');
    }
    const pattern = this.patternService.getPatternById(patternSelection.patternId);
    
    const prompt = this.promptService.renderPrompt(promptTemplate.content, {
      content_request: JSON.stringify(contentRequest, null, 2),
      content_pattern: JSON.stringify({
        ...patternSelection,
        template: pattern?.markdownTemplate,
        sectionOrder: pattern?.sectionOrder
      }, null, 2),
      target_location: directorySelection.selectedDirectory,
      source_materials: processedInputs.map(input => 
        `### ${input.source} (${input.type})\n${input.text}`
      ).join('\n\n')
    });

    const response = await this.sendToCopilot(prompt);
    
    try {
      const data = this.parseJsonResponse<ContentGenerationSchema>(response);
      return {
        success: true,
        data,
        prompt,
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        prompt,
        response
      };
    }
  }

  /**
   * Step 4 Alternative: Update existing content using Copilot
   */
  private async updateContent(
    contentRequest: ContentRequestSchema,
    directorySelection: DirectorySelectionSchema,
    contentStrategy: ContentStrategySchema,
    processedInputs: ProcessedContent[]
  ): Promise<WorkflowStepResult<ContentGenerationSchema>> {
    const promptTemplate = await this.promptService.getPrompt('orchestration/05-content-update');
    if (!promptTemplate) {
      throw new Error('Content update prompt not found');
    }
    
    const existingFilePath = path.join(
      directorySelection.selectedDirectory,
      contentStrategy.targetFile!
    );
    const existingContent = await fs.promises.readFile(existingFilePath, 'utf-8');
    
    const prompt = this.promptService.renderPrompt(promptTemplate.content, {
      content_request: JSON.stringify(contentRequest, null, 2),
      existing_content: existingContent,
      new_materials: processedInputs.map(input => 
        `### ${input.source} (${input.type})\n${input.text}`
      ).join('\n\n'),
      update_requirements: JSON.stringify({
        targetFile: contentStrategy.targetFile,
        reasoning: contentStrategy.reasoning,
        userJourneyContext: contentStrategy.userJourneyContext
      }, null, 2)
    });

    const response = await this.sendToCopilot(prompt);
    
    try {
      const data = this.parseJsonResponse<ContentGenerationSchema>(response);
      return {
        success: true,
        data,
        prompt,
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        prompt,
        response
      };
    }
  }

  /**
   * Send prompt to Copilot and get response
   */
  private async sendToCopilot(prompt: string): Promise<string> {
    // Open Copilot chat with the prompt
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: prompt
    });

    // For now, return a placeholder since we can't get direct response
    // In production, this would use the Chat Participant API for bidirectional communication
    return `{
      "error": "Manual intervention required",
      "message": "Please copy the JSON response from Copilot Chat"
    }`;
  }

  /**
   * Parse JSON response from Copilot
   */
  private parseJsonResponse<T>(response: string): T {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to parse the entire response as JSON
    try {
      return JSON.parse(response);
    } catch (error) {
      // Try to find JSON object in the response
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      throw new Error('Could not parse JSON from response');
    }
  }

  /**
   * Process input files
   */
  private async processInputs(inputs: InputFile[]): Promise<ProcessedContent[]> {
    return await this.inputHandler.processInputs(inputs);
  }

  /**
   * Create content request schema
   */
  private createContentRequest(
    goal: string,
    processedInputs: ProcessedContent[],
    options?: { audience?: string; contentType?: string }
  ): ContentRequestSchema {
    return {
      goal,
      audience: options?.audience || 'technical professionals',
      contentType: options?.contentType || 'documentation',
      inputMaterials: processedInputs.map(input => ({
        source: input.source,
        type: input.type,
        preview: input.text.substring(0, 200)
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze repository structure
   */
  private async analyzeRepository(): Promise<RepositoryAnalysisSchema> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder found');
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const markdownFiles = await vscode.workspace.findFiles('**/*.{md,markdown}', '**/node_modules/**', 100);
    const docDirs = await this.findDocumentationDirectories(rootPath);
    const configFiles = await this.findConfigFiles(rootPath);

    return {
      rootPath,
      projectType: this.inferProjectType(configFiles),
      documentationDirs: docDirs,
      markdownFileCount: markdownFiles.length,
      configFiles,
      organizationPattern: this.inferOrganizationPattern(docDirs, markdownFiles.length)
    };
  }

  /**
   * Read directory contents
   */
  private async readDirectoryContents(directoryPath: string): Promise<string> {
    try {
      const files = await fs.promises.readdir(directoryPath);
      const mdFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.markdown'));
      
      const contents: string[] = [];
      for (const file of mdFiles.slice(0, 5)) { // Limit to 5 files
        const filePath = path.join(directoryPath, file);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        contents.push(`### ${file}\n${content.substring(0, 500)}...\n`);
      }
      
      return contents.length > 0 
        ? contents.join('\n---\n')
        : 'No existing markdown files in directory';
    } catch (error) {
      return 'Directory does not exist yet';
    }
  }

  /**
   * Save generated content to file
   */
  private async saveContent(
    directoryPath: string,
    generationData: ContentGenerationSchema
  ): Promise<string> {
    // Ensure directory exists
    await fs.promises.mkdir(directoryPath, { recursive: true });
    
    // Create file path
    const filePath = path.join(directoryPath, generationData.filename);
    
    // Write content
    await fs.promises.writeFile(filePath, generationData.content, 'utf-8');
    
    return filePath;
  }

  /**
   * Open file in editor
   */
  private async openFile(filePath: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
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
          docDirs.push(dirName);
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
      'pom.xml', 'build.gradle', 'README.md'
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

  /**
   * Infer project type from config files
   */
  private inferProjectType(configFiles: string[]): string {
    if (configFiles.includes('package.json')) return 'Node.js/JavaScript';
    if (configFiles.includes('requirements.txt')) return 'Python';
    if (configFiles.includes('cargo.toml')) return 'Rust';
    if (configFiles.includes('go.mod')) return 'Go';
    if (configFiles.includes('pom.xml')) return 'Java/Maven';
    if (configFiles.includes('build.gradle')) return 'Java/Gradle';
    return 'General Software Project';
  }

  /**
   * Infer organization pattern
   */
  private inferOrganizationPattern(docDirs: string[], mdFileCount: number): string {
    if (docDirs.includes('docs') && mdFileCount > 10) {
      return 'Centralized documentation in docs/';
    }
    if (docDirs.includes('api') && docDirs.includes('guide')) {
      return 'Segmented by type (api/, guide/)';
    }
    if (mdFileCount > 5 && docDirs.length === 0) {
      return 'Distributed documentation in project root';
    }
    return 'Minimal documentation structure';
  }
}
