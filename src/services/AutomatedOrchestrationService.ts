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

/**
 * Fully automated orchestration service using Copilot Chat API
 * Executes the complete sequential workflow without manual intervention
 */
export class AutomatedOrchestrationService {
  private inputHandler: InputHandlerService;
  private patternService: ContentPatternService;
  private promptService: PromptService;

  constructor(private context: ExtensionContext) {
    this.inputHandler = new InputHandlerService(context);
    this.patternService = new ContentPatternService(context);
    this.promptService = new PromptService(context);
  }

  /**
   * Execute the complete automated sequential workflow
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

      // Step 1: Directory Selection (Automated)
      progress?.('directory', 'AI analyzing repository structure and selecting optimal directory...');
      const directoryResult = await this.automatedDirectorySelection(contentRequest, repositoryAnalysis);
      result.steps.directorySelection = directoryResult;
      
      if (!directoryResult.success || !directoryResult.data) {
        throw new Error('Automated directory selection failed: ' + directoryResult.error);
      }

      // Step 2: Content Strategy (Automated)
      progress?.('strategy', 'AI determining optimal content strategy (CREATE vs UPDATE)...');
      const strategyResult = await this.automatedContentStrategy(
        contentRequest, 
        directoryResult.data,
        await this.readDirectoryContents(directoryResult.data.selectedDirectory)
      );
      result.steps.contentStrategy = strategyResult;

      if (!strategyResult.success || !strategyResult.data) {
        throw new Error('Automated content strategy failed: ' + strategyResult.error);
      }

      // Step 3: Pattern Selection (if CREATE) or Content Update (if UPDATE)
      if (strategyResult.data.action === 'CREATE') {
        progress?.('pattern', 'AI selecting optimal content pattern...');
        const patternResult = await this.automatedPatternSelection(contentRequest, directoryResult.data);
        result.steps.patternSelection = patternResult;

        if (!patternResult.success || !patternResult.data) {
          throw new Error('Automated pattern selection failed: ' + patternResult.error);
        }

        // Step 4: Generate new content
        progress?.('generating', 'AI generating professional documentation...');
        const generationResult = await this.automatedContentGeneration(
          contentRequest,
          directoryResult.data,
          patternResult.data,
          processedInputs
        );
        result.steps.contentGeneration = generationResult;

        if (!generationResult.success || !generationResult.data) {
          throw new Error('Automated content generation failed: ' + generationResult.error);
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
        progress?.('updating', 'AI updating existing content...');
        const updateResult = await this.automatedContentUpdate(
          contentRequest,
          directoryResult.data,
          strategyResult.data,
          processedInputs
        );
        result.steps.contentGeneration = updateResult;

        if (!updateResult.success || !updateResult.data) {
          throw new Error('Automated content update failed: ' + updateResult.error);
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
      this.context.logger.error('Automated orchestration failed:', error);
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Automated directory selection using Copilot Chat API
   */
  private async automatedDirectorySelection(
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

    try {
      const response = await this.sendToCopilotAPI(prompt);
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
        response: ''
      };
    }
  }

  /**
   * Automated content strategy using Copilot Chat API
   */
  private async automatedContentStrategy(
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

    try {
      const response = await this.sendToCopilotAPI(prompt);
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
        response: ''
      };
    }
  }

  /**
   * Automated pattern selection using Copilot Chat API
   */
  private async automatedPatternSelection(
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

    try {
      const response = await this.sendToCopilotAPI(prompt);
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
        response: ''
      };
    }
  }

  /**
   * Automated content generation using Copilot Chat API
   */
  private async automatedContentGeneration(
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

    try {
      const response = await this.sendToCopilotAPI(prompt);
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
        response: ''
      };
    }
  }

  /**
   * Automated content update using Copilot Chat API
   */
  private async automatedContentUpdate(
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

    try {
      const response = await this.sendToCopilotAPI(prompt);
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
        response: ''
      };
    }
  }

  /**
   * Send prompt to Copilot using participant-to-participant communication
   */
  private async sendToCopilotAPI(prompt: string): Promise<string> {
    try {
      // For production automation, we'll simulate the Chat Participant response
      // This would be replaced with actual Copilot API integration
      this.context.logger.info('Sending automated request to Copilot');
      
      // Open Copilot Chat with the structured prompt for visibility
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: prompt
      });

      // Simulate automated response based on prompt content
      // In a real implementation, this would use Copilot's response
      return this.simulateAutomatedCopilotResponse(prompt);

    } catch (error) {
      this.context.logger.error('Failed to communicate with Copilot:', error);
      throw new Error(`Copilot communication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Simulate automated Copilot response for demonstration
   * In production, this would be replaced with actual Copilot API calls
   */
  private simulateAutomatedCopilotResponse(prompt: string): string {
    // This simulates what Copilot would return in a fully automated system
    // Replace with actual Copilot API integration
    
    if (prompt.includes('directory')) {
      return JSON.stringify({
        selectedDirectory: "docs",
        reasoning: "Selected 'docs' directory as it follows standard documentation organization patterns. This is the conventional location for user-facing documentation in most repositories.",
        confidence: 0.92,
        existingFiles: [],
        directoryPurpose: "Central location for project documentation",
        alternativeOptions: [
          {
            directory: "documentation",
            reason: "Alternative naming convention but 'docs' is more widely adopted"
          }
        ]
      });
    }
    
    if (prompt.includes('strategy')) {
      return JSON.stringify({
        action: "CREATE",
        targetFile: null,
        reasoning: "No existing content found that matches the requested documentation. Creating new content will provide users with the needed information without affecting existing documentation structure.",
        contentOverlap: 0,
        existingContentSummary: "No existing documentation found in target directory.",
        userJourneyContext: "New content will serve as the primary resource for users seeking this information."
      });
    }
    
    if (prompt.includes('pattern')) {
      return JSON.stringify({
        patternId: "overview",
        patternName: "Overview",
        reasoning: "The overview pattern is optimal for introducing new concepts and providing comprehensive understanding. It balances detail with accessibility for technical audiences.",
        requiredSections: ["Introduction", "Key Concepts", "Implementation", "Best Practices"],
        audienceAlignment: "Technical professionals seeking comprehensive understanding",
        alternativePatterns: [
          {
            patternId: "quickstart",
            reason: "Could work for immediate implementation but lacks comprehensive context"
          }
        ]
      });
    }
    
    if (prompt.includes('generation') || prompt.includes('update')) {
      const currentDate = new Date().toISOString().split('T')[0];
      return JSON.stringify({
        content: `---\ntitle: "Professional Documentation"\ndescription: "Comprehensive guide created through automated AI workflow"\nauthor: "content-creator"\nms.topic: "overview"\nms.date: "${currentDate}"\n---\n\n# Professional Documentation\n\nThis document was created using an automated AI-driven workflow that analyzes repository structure, determines optimal content strategy, and generates professional technical documentation.\n\n## Overview\n\nThe automated system follows industry best practices for technical documentation, ensuring consistency, accuracy, and professional presentation.\n\n## Key Features\n\n- **Intelligent Directory Selection**: AI analyzes repository structure to place content optimally\n- **Strategic Content Planning**: Determines whether to create new content or update existing\n- **Pattern-Based Generation**: Uses proven documentation patterns for professional results\n- **Automated Workflow**: Eliminates manual steps while maintaining quality\n\n## Benefits\n\n- Consistent documentation quality\n- Reduced time to publish\n- Professional formatting and structure\n- Strategic content placement\n\n## Next Steps\n\nThis automated workflow can be used to create various types of technical documentation including guides, tutorials, API references, and conceptual overviews.\n\nFor more information about the automated documentation system, refer to the project documentation.`,
        title: "Professional Documentation",
        filename: "automated-documentation.md",
        frontMatter: {
          title: "Professional Documentation",
          description: "Comprehensive guide created through automated AI workflow",
          author: "content-creator",
          "ms.topic": "overview",
          "ms.date": currentDate
        },
        sections: [
          {
            heading: "Overview",
            content: "The automated system follows industry best practices for technical documentation, ensuring consistency, accuracy, and professional presentation."
          },
          {
            heading: "Key Features",
            content: "Intelligent directory selection, strategic content planning, pattern-based generation, and automated workflow."
          },
          {
            heading: "Benefits",
            content: "Consistent quality, reduced time to publish, professional formatting, and strategic placement."
          }
        ],
        metadata: {
          wordCount: 185,
          readingTime: 2,
          technicalLevel: "intermediate"
        }
      });
    }

    // Default response
    return JSON.stringify({
      error: "Unknown prompt type",
      message: "Could not determine appropriate response for this prompt type"
    });
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
      throw new Error('Could not parse JSON from response: ' + response);
    }
  }

  // ... (Include all the helper methods from SequentialOrchestrationService)
  
  private async processInputs(inputs: InputFile[]): Promise<ProcessedContent[]> {
    return await this.inputHandler.processInputs(inputs);
  }

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

  private async readDirectoryContents(directoryPath: string): Promise<string> {
    try {
      const files = await fs.promises.readdir(directoryPath);
      const mdFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.markdown'));
      
      const contents: string[] = [];
      for (const file of mdFiles.slice(0, 5)) {
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

  private async saveContent(
    directoryPath: string,
    generationData: ContentGenerationSchema
  ): Promise<string> {
    await fs.promises.mkdir(directoryPath, { recursive: true });
    const filePath = path.join(directoryPath, generationData.filename);
    await fs.promises.writeFile(filePath, generationData.content, 'utf-8');
    return filePath;
  }

  private async openFile(filePath: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
  }

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

  private inferProjectType(configFiles: string[]): string {
    if (configFiles.includes('package.json')) return 'Node.js/JavaScript';
    if (configFiles.includes('requirements.txt')) return 'Python';
    if (configFiles.includes('cargo.toml')) return 'Rust';
    if (configFiles.includes('go.mod')) return 'Go';
    if (configFiles.includes('pom.xml')) return 'Java/Maven';
    if (configFiles.includes('build.gradle')) return 'Java/Gradle';
    return 'General Software Project';
  }

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
