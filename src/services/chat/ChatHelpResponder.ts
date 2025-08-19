import * as vscode from 'vscode';

/**
 * Handles help responses for the chat participant
 * Single responsibility: Help documentation and user guidance
 */
export class ChatHelpResponder {
  /**
   * Send comprehensive help response to user
   */
  public async sendHelpResponse(stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
    stream.markdown('# 🤖 Content Creator Assistant\n\n');
    stream.markdown(
      'I help create professional technical documentation using AI-driven workflows.\n\n'
    );

    stream.markdown('## ✨ What I Do\n');
    stream.markdown(
      '- 📄 **Smart Content Creation**: Analyze your repository and create contextually appropriate documentation\n'
    );
    stream.markdown(
      '- 🎯 **Intelligent Placement**: Select the optimal directory for your new content\n'
    );
    stream.markdown(
      '- 📋 **Professional Patterns**: Use proven templates (Overview, Quickstart, How-to, Tutorial, Concept)\n'
    );
    stream.markdown(
      '- 🔄 **Content Strategy**: Decide whether to create new content or update existing files\n\n'
    );

    stream.markdown('## 🚀 How to Use\n');
    stream.markdown('Simply describe what content you want to create:\n\n');
    stream.markdown('- `@content-creator Create a getting started guide for new contributors`\n');
    stream.markdown(
      '- `@content-creator I need API documentation for the authentication module`\n'
    );
    stream.markdown(
      '- `@content-creator Write a troubleshooting guide for common deployment issues`\n\n'
    );

    stream.markdown('## 🔄 Workflow Steps\n');
    stream.markdown('1. 📁 **Directory Selection** - AI explores workspace to find the best location for content\n');
    stream.markdown('2. 🎯 **Content Strategy** - Deciding create vs. update approach\n');
    stream.markdown('3. 🎨 **Pattern Selection** - Choosing the right documentation template\n');
    stream.markdown('4. ✍️ **Content Generation** - Creating professional, structured content\n\n');

    stream.button({
      command: 'ai-content-developer.openWebview',
      title: 'Open Full Interface',
      tooltip: 'Open the complete Content Creator interface for file uploads and detailed requests',
    });

    return {};
  }
}
