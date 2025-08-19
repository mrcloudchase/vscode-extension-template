import * as vscode from 'vscode';
import { ExtensionContext } from '../../types/ExtensionContext';
import { PromptService } from '../PromptService';
import { ContentPatternService } from '../content/ContentPatternService';
import {
  DirectorySelectionSchema,
  ContentStrategySchema,
  PatternSelectionSchema,
  ContentGenerationSchema,
} from '../../models/OrchestrationModels';


/**
 * Executes individual workflow steps using Language Model API
 * Single responsibility: Individual step execution with AI
 */
export class WorkflowStepExecutor {
  constructor(
    private context: ExtensionContext,
    private promptService: PromptService,
    private patternService: ContentPatternService
  ) {}

  /**
   * Step 1: Directory Selection using Language Model with built-in workspace tools
   */
  public async executeDirectorySelection(
    contentRequest: string,
    request: vscode.ChatRequest,
    token: vscode.CancellationToken
  ): Promise<DirectorySelectionSchema> {
    const workspaceName = vscode.workspace.workspaceFolders?.[0]?.name || 'workspace';
    
    const prompt = this.promptService.renderPrompt('orchestration/01-directory-selection', {
      content_request: contentRequest,
      workspaceName: workspaceName,
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);

    let responseText = '';
    this.context.logger.info('Directory selection: Starting stream processing...');
    for await (const fragment of response.text) {
      responseText += fragment;
    }
    this.context.logger.info(
      `Directory selection: Stream complete, received ${responseText.length} characters`
    );

    return this.extractJSON<DirectorySelectionSchema>(responseText);
  }

  /**
   * Step 2: Content Strategy using Language Model
   */
  public async executeContentStrategy(
    contentRequest: string,
    directoryData: DirectorySelectionSchema,
    existingContent: string[],
    request: vscode.ChatRequest,
    token: vscode.CancellationToken
  ): Promise<ContentStrategySchema> {
    const prompt = this.promptService.renderPrompt('orchestration/02-content-strategy', {
      contentRequest: contentRequest,
      selectedDirectory: directoryData.selectedDirectory,
      existingFiles: JSON.stringify(existingContent),
      directoryPurpose: directoryData.directoryPurpose,
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);

    let responseText = '';
    this.context.logger.info('Content strategy: Starting stream processing...');
    for await (const fragment of response.text) {
      responseText += fragment;
    }
    this.context.logger.info(
      `Content strategy: Stream complete, received ${responseText.length} characters`
    );

    return this.extractJSON<ContentStrategySchema>(responseText);
  }

  /**
   * Step 3: Pattern Selection using Language Model
   */
  public async executePatternSelection(
    contentRequest: string,
    strategyData: ContentStrategySchema,
    request: vscode.ChatRequest,
    token: vscode.CancellationToken
  ): Promise<PatternSelectionSchema> {
    const availablePatterns = this.patternService.getAvailablePatterns();

    const prompt = this.promptService.renderPrompt('orchestration/03-pattern-selection', {
      contentRequest: contentRequest,
      contentStrategy: JSON.stringify(strategyData),
      availablePatterns: JSON.stringify(availablePatterns, null, 2),
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);

    let responseText = '';
    this.context.logger.info('Pattern selection: Starting stream processing...');
    for await (const fragment of response.text) {
      responseText += fragment;
    }
    this.context.logger.info(
      `Pattern selection: Stream complete, received ${responseText.length} characters`
    );

    return this.extractJSON<PatternSelectionSchema>(responseText);
  }

  /**
   * Step 4: Content Generation using Language Model
   */
  public async executeContentGeneration(
    contentRequest: string,
    directoryData: DirectorySelectionSchema,
    strategyData: ContentStrategySchema,
    patternData: PatternSelectionSchema,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<ContentGenerationSchema> {
    const selectedPattern = this.patternService.getPatternById(patternData.patternId);
    if (!selectedPattern) {
      throw new Error(`Pattern not found: ${patternData.patternId}`);
    }

    const prompt = this.promptService.renderPrompt('orchestration/04-content-generation', {
      contentRequest: contentRequest,
      selectedDirectory: directoryData.selectedDirectory,
      contentStrategy: JSON.stringify(strategyData),
      patternSelection: JSON.stringify(patternData),
      contentPattern: JSON.stringify(selectedPattern, null, 2),
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);

    let responseText = '';
    this.context.logger.info('Content generation: Starting stream processing...');
    for await (const fragment of response.text) {
      responseText += fragment;
      // Stream progress to user
      if (fragment.includes('```') || fragment.includes('#')) {
        stream.markdown('📝 ');
      }
    }
    this.context.logger.info(
      `Content generation: Stream complete, received ${responseText.length} characters`
    );

    return this.extractJSON<ContentGenerationSchema>(responseText);
  }

  /**
   * Step 5: Content Update using Language Model
   */
  public async executeContentUpdate(
    contentRequest: string,
    targetFile: string,
    currentContent: string,
    strategyData: ContentStrategySchema,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<ContentGenerationSchema> {
    const prompt = this.promptService.renderPrompt('orchestration/05-content-update', {
      contentRequest: contentRequest,
      targetFilename: targetFile,
      currentContent: currentContent,
      contentStrategy: JSON.stringify(strategyData),
    });

    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const response = await request.model.sendRequest(messages, {}, token);

    let responseText = '';
    this.context.logger.info('Content update: Starting stream processing...');
    for await (const fragment of response.text) {
      responseText += fragment;
      // Stream progress to user
      if (fragment.includes('```') || fragment.includes('#')) {
        stream.markdown('📝 ');
      }
    }
    this.context.logger.info(
      `Content update: Stream complete, received ${responseText.length} characters`
    );

    return this.extractJSON<ContentGenerationSchema>(responseText);
  }

  /**
   * Helper: Extract JSON from LLM response
   */
  private extractJSON<T>(responseText: string): T {
    try {
      // Look for JSON blocks in the response
      const jsonMatch =
        responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonText) as T;
    } catch (error) {
      this.context.logger.error('Failed to extract JSON from response:', responseText);
      throw new Error(
        `Invalid JSON response: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
