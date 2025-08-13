import { ExtensionContext } from '../types/ExtensionContext';
import { ProcessedContent, ChatRequest, ChatResponse } from '../models/InputModels';
import { PromptService } from './PromptService';
import { CopilotIntegrationService } from './index';

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  promptId: string;
  dependsOn?: string[];
  outputKey: string;
  required: boolean;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  targetAudience: string;
  documentType: string;
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  goal: string;
  processedContents: ProcessedContent[];
  stepOutputs: Map<string, string>;
  currentStep: number;
  totalSteps: number;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  success: boolean;
  finalOutput?: string;
  stepResults: Map<string, string>;
  errors?: string[];
  executionTime: number;
}

/**
 * Service for orchestrating deterministic documentation workflows
 */
export class WorkflowOrchestratorService {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private promptService: PromptService;

  constructor(
    private context: ExtensionContext,
    private copilotService: CopilotIntegrationService
  ) {
    this.promptService = new PromptService(context);
    this.initializeWorkflows();
  }

  /**
   * Initialize predefined workflows
   */
  private initializeWorkflows(): void {
    // Technical Documentation Workflow
    const techDocWorkflow: WorkflowDefinition = {
      id: 'technical-documentation',
      name: 'Technical Documentation Creation',
      description: 'Complete workflow for creating comprehensive technical documentation',
      targetAudience: 'developers, technical writers, end users',
      documentType: 'technical documentation',
      steps: [
        {
          id: 'analyze',
          name: 'Content Analysis',
          description: 'Analyze source content and extract key information',
          promptId: 'technical-writing/analyze-content',
          outputKey: 'analysis_results',
          required: true
        },
        {
          id: 'outline',
          name: 'Create Outline',
          description: 'Create structured documentation outline',
          promptId: 'technical-writing/create-outline',
          dependsOn: ['analyze'],
          outputKey: 'document_outline',
          required: true
        },
        {
          id: 'write-intro',
          name: 'Write Introduction',
          description: 'Write introduction section',
          promptId: 'technical-writing/write-section',
          dependsOn: ['outline'],
          outputKey: 'introduction_section',
          required: true
        },
        {
          id: 'write-main',
          name: 'Write Main Content',
          description: 'Write main documentation sections',
          promptId: 'technical-writing/write-section',
          dependsOn: ['write-intro'],
          outputKey: 'main_content',
          required: true
        },
        {
          id: 'review',
          name: 'Technical Review',
          description: 'Review content for accuracy and completeness',
          promptId: 'validation/review-accuracy',
          dependsOn: ['write-main'],
          outputKey: 'review_results',
          required: true
        },
        {
          id: 'finalize',
          name: 'Finalize Document',
          description: 'Apply final formatting and prepare for publication',
          promptId: 'formatting/finalize-document',
          dependsOn: ['review'],
          outputKey: 'final_document',
          required: true
        }
      ]
    };

    this.workflows.set(techDocWorkflow.id, techDocWorkflow);
    this.context.logger.info(`Initialized ${this.workflows.size} workflows`);
  }

  /**
   * Execute a workflow with the given inputs
   */
  public async executeWorkflow(
    workflowId: string,
    goal: string,
    processedContents: ProcessedContent[],
    onStepComplete?: (stepId: string, result: string) => void
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.context.logger.info(`Starting workflow: ${workflow.name}`);

    const context: WorkflowContext = {
      goal,
      processedContents,
      stepOutputs: new Map(),
      currentStep: 0,
      totalSteps: workflow.steps.length
    };

    const errors: string[] = [];
    
    try {
      for (const step of workflow.steps) {
        context.currentStep++;
        this.context.logger.info(`Executing step ${context.currentStep}/${context.totalSteps}: ${step.name}`);

        try {
          // Check dependencies
          if (step.dependsOn) {
            for (const dependency of step.dependsOn) {
              if (!context.stepOutputs.has(dependency)) {
                throw new Error(`Dependency not satisfied: ${dependency}`);
              }
            }
          }

          // Execute step
          const stepResult = await this.executeStep(step, context, workflow);
          context.stepOutputs.set(step.id, stepResult);
          
          // Notify callback if provided
          if (onStepComplete) {
            onStepComplete(step.id, stepResult);
          }

          this.context.logger.info(`Completed step: ${step.name}`);
        } catch (error) {
          const errorMsg = `Failed to execute step ${step.name}: ${error instanceof Error ? error.message : String(error)}`;
          this.context.logger.error(errorMsg);
          errors.push(errorMsg);
          
          if (step.required) {
            throw new Error(`Required step failed: ${step.name}`);
          }
        }
      }

      const executionTime = Date.now() - startTime;
      const finalOutput = context.stepOutputs.get('finalize') || 
                         Array.from(context.stepOutputs.values()).join('\n\n---\n\n');

      return {
        success: errors.length === 0,
        finalOutput,
        stepResults: context.stepOutputs,
        errors: errors.length > 0 ? errors : undefined,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMsg = `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`;
      this.context.logger.error(errorMsg);
      
      return {
        success: false,
        stepResults: context.stepOutputs,
        errors: [...errors, errorMsg],
        executionTime
      };
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext,
    workflow: WorkflowDefinition
  ): Promise<string> {
    // Prepare variables for the prompt
    const variables = this.prepareStepVariables(step, context, workflow);
    
    // Render the prompt
    const renderedPrompt = this.promptService.renderPrompt(step.promptId, variables);
    
    // Create chat request
    const chatRequest: ChatRequest = {
      goal: renderedPrompt,
      inputs: [], // Empty since we're passing everything in the prompt
      processedContents: context.processedContents
    };

    // Execute with Copilot
    const response = await this.copilotService.sendToCopilot(chatRequest);
    
    return response.response;
  }

  /**
   * Prepare variables for a workflow step
   */
  private prepareStepVariables(
    step: WorkflowStep,
    context: WorkflowContext,
    workflow: WorkflowDefinition
  ): Record<string, string> {
    const variables: Record<string, string> = {
      goal: context.goal,
      target_audience: workflow.targetAudience,
      document_type: workflow.documentType,
      content: this.combineProcessedContents(context.processedContents),
      content_sources: context.processedContents.map(c => c.source).join(', ')
    };

    // Add step-specific variables
    switch (step.id) {
      case 'analyze':
        // No additional variables needed for analysis
        break;
        
      case 'outline':
        variables.analysis_results = context.stepOutputs.get('analyze') || '';
        break;
        
      case 'write-intro':
      case 'write-main':
        variables.section_title = step.id === 'write-intro' ? 'Introduction' : 'Main Content';
        variables.section_scope = step.description;
        variables.document_outline = context.stepOutputs.get('outline') || '';
        variables.source_content = variables.content;
        variables.writing_guidelines = 'Follow technical writing best practices';
        break;
        
      case 'review':
        variables.section_content = context.stepOutputs.get('write-main') || '';
        variables.source_material = variables.content;
        variables.section_purpose = 'Technical documentation';
        break;
        
      case 'finalize':
        const allContent = Array.from(context.stepOutputs.values()).join('\n\n');
        variables.draft_document = allContent;
        variables.style_guide = 'Standard technical documentation style';
        variables.publication_format = 'Markdown';
        break;
    }

    // Add outputs from previous steps
    context.stepOutputs.forEach((output, stepId) => {
      variables[`${stepId}_output`] = output;
    });

    return variables;
  }

  /**
   * Combine processed contents into a single string
   */
  private combineProcessedContents(contents: ProcessedContent[]): string {
    return contents.map(content => 
      `## Source: ${content.source}\nType: ${content.type}\n\n${content.text}`
    ).join('\n\n---\n\n');
  }

  /**
   * Get available workflows
   */
  public getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get a specific workflow
   */
  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Add a custom workflow
   */
  public addWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    this.context.logger.info(`Added custom workflow: ${workflow.name}`);
  }

  /**
   * Validate workflow definition
   */
  public validateWorkflow(workflow: WorkflowDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for duplicate step IDs
    const stepIds = new Set();
    for (const step of workflow.steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);

      // Check dependencies exist
      if (step.dependsOn) {
        for (const dep of step.dependsOn) {
          if (!stepIds.has(dep)) {
            errors.push(`Step ${step.id} depends on non-existent step: ${dep}`);
          }
        }
      }

      // Check prompt exists
      if (!this.promptService.getPrompt(step.promptId)) {
        errors.push(`Step ${step.id} references non-existent prompt: ${step.promptId}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
