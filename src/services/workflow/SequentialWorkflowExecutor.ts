import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from '../../types/ExtensionContext';
import { WorkflowContextManager, WorkflowContext } from '../WorkflowContextManager';

import { WorkflowStepExecutor } from './WorkflowStepExecutor';
import { FileOperations } from './FileOperations';
import { PromptService } from '../PromptService';
import { ContentPatternService } from '../content/ContentPatternService';
import {
  DirectorySelectionSchema,
  ContentStrategySchema,
  PatternSelectionSchema,
  OrchestrationResult,
} from '../../models/OrchestrationModels';

/**
 * Coordinates the sequential AI workflow execution
 * Single responsibility: Workflow coordination and orchestration
 */
export class SequentialWorkflowExecutor {
  private stepExecutor: WorkflowStepExecutor;
  private fileOperations: FileOperations;

  constructor(
    private context: ExtensionContext,
    private contextManager: WorkflowContextManager
  ) {
    this.stepExecutor = new WorkflowStepExecutor(
      context,
      new PromptService(context),
      new ContentPatternService(context)
    );
    this.fileOperations = new FileOperations(context);
  }

  /**
   * Execute the complete sequential workflow
   */
  public async execute(
    contentRequest: string,
    workflowContext: WorkflowContext | null,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<OrchestrationResult> {
    try {
      // Step 1: Directory Selection (AI explores workspace using built-in tools)
      stream.progress('📁 Selecting optimal directory...');
      const directoryData = await this.stepExecutor.executeDirectorySelection(
        contentRequest,
        request,
        token
      );

      stream.markdown(`📁 **Selected Directory:** \`${directoryData.selectedDirectory}\`\n`);
      stream.markdown(`💡 **Reasoning:** ${directoryData.reasoning}\n\n`);

      // Step 2: Read Directory Contents
      const existingContent = await this.fileOperations.readDirectoryContents(
        directoryData.selectedDirectory
      );

      // Step 3: Content Strategy
      stream.progress('🎯 Determining content strategy...');
      const strategyData = await this.stepExecutor.executeContentStrategy(
        contentRequest,
        directoryData,
        existingContent,
        request,
        token
      );

      stream.markdown(`📋 **Strategy:** ${strategyData.action}\n`);
      stream.markdown(`💭 **Reasoning:** ${strategyData.reasoning}\n\n`);

      // Execute appropriate workflow path
      if (strategyData.action === 'CREATE') {
        return await this.executeCreateWorkflow(
          contentRequest,
          directoryData,
          strategyData,
          request,
          stream,
          token
        );
      } else {
        return await this.executeUpdateWorkflow(
          contentRequest,
          directoryData,
          strategyData,
          existingContent,
          request,
          stream,
          token
        );
      }
    } catch (error) {
      this.context.logger.error('Sequential workflow failed:', error);
      return {
        success: false,
        action: 'CREATED',
        steps: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute CREATE workflow path
   */
  private async executeCreateWorkflow(
    contentRequest: string,
    directoryData: DirectorySelectionSchema,
    strategyData: ContentStrategySchema,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<OrchestrationResult> {
    // Step 4: Pattern Selection
    stream.progress('🎨 Selecting content pattern...');
    const patternData = await this.stepExecutor.executePatternSelection(
      contentRequest,
      strategyData,
      request,
      token
    );

    stream.markdown(`🎨 **Content Pattern:** ${patternData.patternName}\n`);
    stream.markdown(`📝 **Pattern Purpose:** ${patternData.reasoning}\n\n`);

    // Step 5: Content Generation
    stream.progress('✍️ Generating new content...');
    const generationData = await this.stepExecutor.executeContentGeneration(
      contentRequest,
      directoryData,
      strategyData,
      patternData,
      request,
      stream,
      token
    );

    // Write the file
    const filePath = await this.fileOperations.writeFile(
      directoryData.selectedDirectory,
      generationData.filename,
      generationData.content
    );

    return {
      success: true,
      action: 'CREATED',
      filePath: filePath,
      steps: {
        directorySelection: { success: true, data: directoryData, prompt: '', response: '' },
        contentStrategy: { success: true, data: strategyData, prompt: '', response: '' },
        patternSelection: { success: true, data: patternData, prompt: '', response: '' },
        contentGeneration: { success: true, data: generationData, prompt: '', response: '' },
      },
    };
  }

  /**
   * Execute UPDATE workflow path
   */
  private async executeUpdateWorkflow(
    contentRequest: string,
    directoryData: DirectorySelectionSchema,
    strategyData: ContentStrategySchema,
    existingContent: string[],
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<OrchestrationResult> {
    // Step 4: Content Update
    stream.progress('📝 Updating existing content...');

    const targetFile = strategyData.targetFile!;
    const currentContent = await this.fileOperations.readFile(
      path.join(directoryData.selectedDirectory, targetFile)
    );

    const updateData = await this.stepExecutor.executeContentUpdate(
      contentRequest,
      targetFile,
      currentContent,
      strategyData,
      request,
      stream,
      token
    );

    // Write the updated file
    const filePath = await this.fileOperations.writeFile(
      directoryData.selectedDirectory,
      updateData.filename,
      updateData.content
    );

    return {
      success: true,
      action: 'UPDATED',
      filePath: filePath,
      steps: {
        directorySelection: { success: true, data: directoryData, prompt: '', response: '' },
        contentStrategy: { success: true, data: strategyData, prompt: '', response: '' },
        contentGeneration: { success: true, data: updateData, prompt: '', response: '' },
      },
    };
  }
}
