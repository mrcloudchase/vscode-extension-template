import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  ExtensionContext,
  ContentRequest,
  PatternSelection,
  GeneratedContent,
} from '../types/ExtensionContext';
import { InputProcessor } from './InputProcessor';

/**
 * Main content generation service using simplified 2-step workflow
 */
export class ContentGenerator {
  private inputProcessor: InputProcessor;
  private contentStandards: any;

  constructor(private context: ExtensionContext) {
    this.inputProcessor = new InputProcessor(context);
    this.loadContentStandards();
  }

  /**
   * Load content standards from JSON file
   */
  private loadContentStandards(): void {
    try {
      const standardsPath = path.join(
        this.context.vscodeContext.extensionPath,
        'content-standards.json'
      );

      if (fs.existsSync(standardsPath)) {
        const content = fs.readFileSync(standardsPath, 'utf8');
        this.contentStandards = JSON.parse(content);
        this.context.logger.info('Content standards loaded successfully');
      } else {
        this.context.logger.warn('Content standards file not found');
        this.contentStandards = { contentTypes: [] };
      }
    } catch (error) {
      this.context.logger.error('Failed to load content standards', error);
      this.contentStandards = { contentTypes: [] };
    }
  }

  /**
   * Generate content using 2-step workflow
   */
  public async generateContent(
    request: ContentRequest,
    onProgress?: (step: string, message: string) => void
  ): Promise<GeneratedContent> {
    this.context.logger.info(`Starting content generation: ${request.contentGoal}`);

    try {
      // Step 1: Process input files
      onProgress?.('processing', 'Processing input files...');
      const processedInputs = await this.inputProcessor.processInputs(request.inputs);

      // Step 2: Select pattern using Copilot
      onProgress?.('pattern', 'Selecting content pattern...');
      const patternSelection = await this.selectPattern(request, processedInputs);

      // Step 3: Generate content using Copilot
      onProgress?.('generating', 'Generating content...');
      const generatedContent = await this.generateContentWithPattern(
        request,
        processedInputs,
        patternSelection
      );

      // Step 4: Save to default location
      onProgress?.('saving', 'Saving generated content...');
      await this.saveContent(generatedContent);

      this.context.logger.info('Content generation completed successfully');
      return generatedContent;
    } catch (error) {
      this.context.logger.error('Content generation failed', error);
      throw error;
    }
  }

  /**
   * Step 1: Select appropriate content pattern
   */
  private async selectPattern(
    request: ContentRequest,
    processedInputs: string
  ): Promise<PatternSelection> {
    const prompt = this.buildPatternSelectionPrompt(request, processedInputs);
    const result = await this.callLanguageModel(prompt);

    try {
      return JSON.parse(result) as PatternSelection;
    } catch (error) {
      throw new Error(`Failed to parse pattern selection result: ${error}`);
    }
  }

  /**
   * Step 2: Generate content with selected pattern
   */
  private async generateContentWithPattern(
    request: ContentRequest,
    processedInputs: string,
    patternSelection: PatternSelection
  ): Promise<GeneratedContent> {
    const prompt = this.buildContentGenerationPrompt(request, processedInputs, patternSelection);
    const result = await this.callLanguageModel(prompt);

    try {
      return JSON.parse(result) as GeneratedContent;
    } catch (error) {
      throw new Error(`Failed to parse content generation result: ${error}`);
    }
  }

  /**
   * Build pattern selection prompt
   */
  private buildPatternSelectionPrompt(request: ContentRequest, processedInputs: string): string {
    // Load the actual prompt template
    const promptPath = path.join(
      this.context.vscodeContext.extensionPath,
      'src',
      'prompts',
      'orchestration',
      '03-pattern-selection.md'
    );

    let promptTemplate = '';
    try {
      promptTemplate = fs.readFileSync(promptPath, 'utf8');
    } catch (error) {
      this.context.logger.error('Failed to load pattern selection prompt', error);
      throw new Error('Pattern selection prompt not found');
    }

    // Extract only essential pattern information for selection
    const patternOptions = this.contentStandards.contentTypes.map((type: any) => ({
      id: type.id,
      name: type.name,
      purpose: type.purpose,
      description: type.description,
    }));

    // Replace template variables
    let prompt = promptTemplate;
    prompt = prompt.replace(/\{\{CONTENT_REQUEST\}\}/g, request.contentGoal);
    prompt = prompt.replace(/\{\{INPUT_MATERIALS\}\}/g, processedInputs);
    prompt = prompt.replace(/\{\{CONTENT_STANDARDS\}\}/g, JSON.stringify(patternOptions, null, 2));

    return prompt;
  }

  /**
   * Build content generation prompt
   */
  private buildContentGenerationPrompt(
    request: ContentRequest,
    processedInputs: string,
    patternSelection: PatternSelection
  ): string {
    // Load the actual prompt template
    const promptPath = path.join(
      this.context.vscodeContext.extensionPath,
      'src',
      'prompts',
      'orchestration',
      '04-content-generation.md'
    );

    let promptTemplate = '';
    try {
      promptTemplate = fs.readFileSync(promptPath, 'utf8');
    } catch (error) {
      this.context.logger.error('Failed to load content generation prompt', error);
      throw new Error('Content generation prompt not found');
    }

    const selectedPattern = this.contentStandards.contentTypes.find(
      (type: any) => type.id === patternSelection.patternId
    );

    if (!selectedPattern) {
      throw new Error(
        `Selected pattern '${patternSelection.patternId}' not found in content standards`
      );
    }

    // Replace template variables with optimized context
    let prompt = promptTemplate;
    prompt = prompt.replace(/\{\{CONTENT_REQUEST\}\}/g, request.contentGoal);

    // Pass input materials directly
    prompt = prompt.replace(/\{\{INPUT_MATERIALS\}\}/g, processedInputs);

    // Pass markdown template separately for clear visibility
    prompt = prompt.replace(/\{\{MARKDOWN_TEMPLATE\}\}/g, selectedPattern.markdownTemplate);

    // Pass content standards separately for clarity
    prompt = prompt.replace(
      /\{\{CORE_GUIDELINES\}\}/g,
      JSON.stringify(this.contentStandards.coreGuidelines, null, 2)
    );
    prompt = prompt.replace(
      /\{\{CUSTOMER_INTENT\}\}/g,
      JSON.stringify(this.contentStandards.customerIntent, null, 2)
    );
    prompt = prompt.replace(
      /\{\{FORMATTING_ELEMENTS\}\}/g,
      JSON.stringify(this.contentStandards.formattingElements, null, 2)
    );

    return prompt;
  }

  /**
   * Call Copilot language model
   */
  private async callLanguageModel(prompt: string): Promise<string> {
    try {
      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4',
      });

      if (models.length === 0) {
        throw new Error('No Copilot model available');
      }

      const messages = [vscode.LanguageModelChatMessage.User(prompt)];
      const response = await models[0].sendRequest(messages, {});

      let result = '';
      for await (const fragment of response.text) {
        result += fragment;
      }

      return result.trim();
    } catch (error) {
      throw new Error(`Language model call failed: ${error}`);
    }
  }

  /**
   * Save generated content to default location
   */
  private async saveContent(content: GeneratedContent): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder open');
    }

    const docsFolder = path.join(workspaceFolders[0].uri.fsPath, 'docs');

    // Create directory if it doesn't exist
    if (!fs.existsSync(docsFolder)) {
      fs.mkdirSync(docsFolder, { recursive: true });
    }

    const filePath = path.join(docsFolder, content.filename);
    fs.writeFileSync(filePath, content.content, 'utf8');

    this.context.logger.info(`Content saved to: ${filePath}`);

    // Open the generated file
    const uri = vscode.Uri.file(filePath);
    await vscode.window.showTextDocument(uri);

    return filePath;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Clean up if needed
  }
}
