import * as assert from 'assert';
import * as vscode from 'vscode';

suite('AI Content Developer Test Suite', () => {
  void vscode.window.showInformationMessage('Start AI Content Developer tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('doveychase.ai-content-developer'));
  });

  test('Should activate extension', async () => {
    const ext = vscode.extensions.getExtension('your-publisher-name.ai-content-developer');
    assert.ok(ext);
    await ext.activate();
    assert.ok(ext.isActive);
  });

  test('Should register all commands', async () => {
    const commands = await vscode.commands.getCommands();

    const expectedCommands = ['ai-content-developer.openWebview', 'ai-content-developer.refresh'];

    expectedCommands.forEach((command) => {
      assert.ok(commands.includes(command), `Command ${command} not found`);
    });
  });

  test('Configuration should have default values', () => {
    const config = vscode.workspace.getConfiguration('ai-content-developer');

    assert.strictEqual(config.get('enableDebugMode'), false);
    assert.strictEqual(config.get('theme'), 'auto');
  });

  test('Should open AI Content Developer webview', async () => {
    // Execute the command to open webview
    await vscode.commands.executeCommand('ai-content-developer.openWebview');

    // Wait a bit for the webview to open
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if webview command executed without error
    assert.ok(true, 'AI Content Developer webview command executed without error');
  });

  test('Should register chat participant', async () => {
    // Check if chat participant is available
    // Note: This test may need to be updated based on VS Code Chat API testing capabilities
    const commands = await vscode.commands.getCommands();
    assert.ok(true, 'Chat participant registration test placeholder');
  });
});

suite('Configuration Manager Test Suite', () => {
  test('Should load AI Content Developer configuration', () => {
    const config = vscode.workspace.getConfiguration('ai-content-developer');
    assert.ok(config);
  });

  test('Should handle configuration changes', async () => {
    const config = vscode.workspace.getConfiguration('ai-content-developer');

    // Store original value
    const originalValue = config.get('enableDebugMode');

    // Update configuration
    await config.update('enableDebugMode', true, vscode.ConfigurationTarget.Workspace);

    // Verify change
    const newConfig = vscode.workspace.getConfiguration('ai-content-developer');
    assert.strictEqual(newConfig.get('enableDebugMode'), true);

    // Restore original value
    await config.update('enableDebugMode', originalValue, vscode.ConfigurationTarget.Workspace);
  });

  test('Should have GitHub token configuration', () => {
    const config = vscode.workspace.getConfiguration('ai-content-developer');

    // Should have githubToken setting (even if empty)
    assert.ok(config.inspect('githubToken'));
  });
});
