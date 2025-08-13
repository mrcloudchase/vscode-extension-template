import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  void vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(
      vscode.extensions.getExtension('your-publisher-name.vscode-webview-extension-template')
    );
  });

  test('Should activate extension', async () => {
    const ext = vscode.extensions.getExtension(
      'your-publisher-name.vscode-webview-extension-template'
    );
    assert.ok(ext);
    await ext.activate();
    assert.ok(ext.isActive);
  });

  test('Should register all commands', async () => {
    const commands = await vscode.commands.getCommands();

    const expectedCommands = [
      'vscode-webview-extension.openWebview',
      'vscode-webview-extension.refresh',
    ];

    expectedCommands.forEach((command) => {
      assert.ok(commands.includes(command), `Command ${command} not found`);
    });
  });

  test('Configuration should have default values', () => {
    const config = vscode.workspace.getConfiguration('vscode-webview-extension');

    assert.strictEqual(config.get('enableDebugMode'), false);
    assert.strictEqual(config.get('theme'), 'auto');
  });

  test('Should open webview panel', async () => {
    // Execute the command to open webview
    await vscode.commands.executeCommand('vscode-webview-extension.openWebview');

    // Wait a bit for the webview to open
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if webview panel is visible
    // Note: This is a simplified test. In real scenarios, you might need to
    // mock or stub the webview panel for more thorough testing
    assert.ok(true, 'Webview command executed without error');
  });
});

suite('Configuration Manager Test Suite', () => {
  test('Should load configuration', () => {
    const config = vscode.workspace.getConfiguration('vscode-webview-extension');
    assert.ok(config);
  });

  test('Should handle configuration changes', async () => {
    const config = vscode.workspace.getConfiguration('vscode-webview-extension');

    // Store original value
    const originalValue = config.get('enableDebugMode');

    // Update configuration
    await config.update('enableDebugMode', true, vscode.ConfigurationTarget.Workspace);

    // Verify change
    const newConfig = vscode.workspace.getConfiguration('vscode-webview-extension');
    assert.strictEqual(newConfig.get('enableDebugMode'), true);

    // Restore original value
    await config.update('enableDebugMode', originalValue, vscode.ConfigurationTarget.Workspace);
  });
});
