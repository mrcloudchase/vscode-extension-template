import { Octokit } from '@octokit/rest';
import { BaseService } from './BaseService';
import { ProcessingResult, InputFile, InputType, ProcessedContent, GitHubPRInfo } from '../models/InputModels';
import * as vscode from 'vscode';

/**
 * Service for fetching GitHub Pull Request information
 */
export class GitHubService extends BaseService {
  private octokit: Octokit;

  constructor(context: any) {
    super(context);
    this.octokit = new Octokit({
      auth: this.getGitHubToken(),
    });
  }



  async process(input: InputFile): Promise<ProcessingResult> {
    try {
      this.validateInput(input);
      this.log(`Processing GitHub PR: ${input.uri}`);

      const prInfo = this.parseGitHubUrl(input.uri);
      if (!prInfo) {
        throw new Error('Invalid GitHub PR URL');
      }

      // Fetch PR details
      const { data: pr } = await this.octokit.pulls.get({
        owner: prInfo.owner,
        repo: prInfo.repo,
        pull_number: prInfo.prNumber,
      });

      // Fetch PR diff
      const { data: diff } = await this.octokit.pulls.get({
        owner: prInfo.owner,
        repo: prInfo.repo,
        pull_number: prInfo.prNumber,
        mediaType: {
          format: 'diff',
        },
      });

      // Fetch PR comments
      const { data: comments } = await this.octokit.issues.listComments({
        owner: prInfo.owner,
        repo: prInfo.repo,
        issue_number: prInfo.prNumber,
      });

      // Fetch review comments
      const { data: reviewComments } = await this.octokit.pulls.listReviewComments({
        owner: prInfo.owner,
        repo: prInfo.repo,
        pull_number: prInfo.prNumber,
      });

      // Compile all text content
      const text = this.compilePRContent(pr, diff as unknown as string, comments, reviewComments);

      const processedContent: ProcessedContent = {
        source: `GitHub PR #${prInfo.prNumber} - ${pr.title}`,
        type: InputType.GITHUB_PR,
        text: text,
        metadata: {
          owner: prInfo.owner,
          repo: prInfo.repo,
          prNumber: prInfo.prNumber,
          title: pr.title,
          state: pr.state,
          author: pr.user?.login,
          created: pr.created_at,
          updated: pr.updated_at,
          merged: pr.merged,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changed_files,
        },
      };

      return {
        success: true,
        content: processedContent,
      };
    } catch (error) {
      this.logError(`Failed to process GitHub PR: ${input.uri}`, error);
      return {
        success: false,
        error: `Failed to process GitHub PR: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Parse GitHub URL to extract owner, repo, and PR number
   */
  private parseGitHubUrl(url: string): GitHubPRInfo | null {
    // Handle various GitHub URL formats
    // https://github.com/owner/repo/pull/123
    // github.com/owner/repo/pull/123
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        prNumber: parseInt(match[3]),
      };
    }
    return null;
  }

  /**
   * Compile PR content into a single text
   */
  private compilePRContent(pr: any, diff: string, comments: any[], reviewComments: any[]): string {
    const sections: string[] = [];

    // PR Title and Description
    sections.push(`# Pull Request #${pr.number}: ${pr.title}\n`);
    sections.push(`**Author:** ${pr.user?.login || 'Unknown'}`);
    sections.push(`**State:** ${pr.state}`);
    sections.push(`**Created:** ${pr.created_at}`);
    sections.push(`**Updated:** ${pr.updated_at}`);
    
    if (pr.body) {
      sections.push(`\n## Description\n${pr.body}`);
    }

    // Statistics
    sections.push(`\n## Statistics`);
    sections.push(`- **Files Changed:** ${pr.changed_files}`);
    sections.push(`- **Additions:** +${pr.additions}`);
    sections.push(`- **Deletions:** -${pr.deletions}`);

    // Comments
    if (comments.length > 0) {
      sections.push(`\n## Comments (${comments.length})`);
      comments.forEach(comment => {
        sections.push(`\n**${comment.user?.login}** (${comment.created_at}):`);
        sections.push(comment.body || '');
      });
    }

    // Review Comments
    if (reviewComments.length > 0) {
      sections.push(`\n## Review Comments (${reviewComments.length})`);
      reviewComments.forEach(comment => {
        sections.push(`\n**${comment.user?.login}** on \`${comment.path}\`:`);
        sections.push(comment.body || '');
      });
    }

    // Diff (truncate if too large)
    sections.push(`\n## Diff`);
    if (diff.length > 50000) {
      sections.push(diff.substring(0, 50000) + '\n... [Diff truncated due to size]');
    } else {
      sections.push(diff);
    }

    return sections.join('\n');
  }

  /**
   * Get GitHub token from VS Code settings or environment
   */
  private getGitHubToken(): string | undefined {
    // Try to get from VS Code configuration
    const config = vscode.workspace.getConfiguration('vscode-webview-extension');
    const token = config.get<string>('githubToken');
    
    if (token) {
      return token;
    }

    // Try environment variable
    return process.env.GITHUB_TOKEN;
  }

  /**
   * Fetch PR files
   */
  async fetchPRFiles(prInfo: GitHubPRInfo): Promise<any[]> {
    try {
      const { data: files } = await this.octokit.pulls.listFiles({
        owner: prInfo.owner,
        repo: prInfo.repo,
        pull_number: prInfo.prNumber,
      });
      return files;
    } catch (error) {
      this.logError('Failed to fetch PR files', error);
      return [];
    }
  }
}
