// Simplified webview script for AI Content Developer
(function () {
  // Get VS Code API
  const vscode = acquireVsCodeApi();

  // State management
  let state = {
    theme: 'light',
    contentGoal: '',
    inputs: [],
  };

  // Message types enum (matching the extension)
  const MessageType = {
    // From extension to webview
    UPDATE_CONTENT: 'updateContent',
    UPDATE_THEME: 'updateTheme',
    UPDATE_CONFIG: 'updateConfig',
    SHOW_MESSAGE: 'showMessage',
    GENERATION_STATUS: 'generationStatus',
    GENERATION_COMPLETE: 'generationComplete',

    // From webview to extension
    LOG_MESSAGE: 'logMessage',
    READY: 'ready',
    GENERATE_CONTENT: 'generateContent',
    SELECT_FILES: 'selectFiles',
  };

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
    setupEventListeners();

    // Notify extension that webview is ready
    sendMessage({
      type: MessageType.READY,
    });
  });

  /**
   * Initialize the webview
   */
  function initialize() {
    // Restore previous state if available
    const previousState = vscode.getState();
    if (previousState) {
      state = { ...state, ...previousState };
      updateUI();
    }

    log('info', 'Webview initialized');
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Content goal input
    const contentGoalInput = document.getElementById('contentGoal');
    if (contentGoalInput) {
      contentGoalInput.addEventListener('input', (e) => {
        state.contentGoal = e.target.value;
        vscode.setState(state);
      });
    }

    // Select files button
    const selectFilesBtn = document.getElementById('selectFiles');
    if (selectFilesBtn) {
      selectFilesBtn.addEventListener('click', () => {
        sendMessage({
          type: MessageType.SELECT_FILES,
        });
      });
    }

    // Generate content button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        if (!state.contentGoal.trim()) {
          showMessage('Please describe what content you want to create.', 'warning');
          return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';

        sendMessage({
          type: MessageType.GENERATE_CONTENT,
          payload: {
            contentGoal: state.contentGoal,
            inputs: state.inputs,
          },
        });
      });
    }

    // Listen for messages from the extension
    window.addEventListener('message', handleMessage);
  }

  /**
   * Handle messages from the extension
   */
  function handleMessage(event) {
    const message = event.data;

    log('debug', 'Received message:', message);

    switch (message.type) {
      case MessageType.UPDATE_THEME:
        handleUpdateTheme(message.payload);
        break;

      case MessageType.UPDATE_CONFIG:
        handleUpdateConfig(message.payload);
        break;

      case MessageType.SHOW_MESSAGE:
        handleShowMessage(message.payload);
        break;

      case MessageType.GENERATION_STATUS:
        handleGenerationStatus(message.payload);
        break;

      case MessageType.GENERATION_COMPLETE:
        handleGenerationComplete(message.payload);
        break;

      case MessageType.UPDATE_CONTENT:
        handleUpdateContent(message.payload);
        break;

      default:
        log('warn', 'Unknown message type:', message.type);
    }
  }

  /**
   * Handle theme updates
   */
  function handleUpdateTheme(payload) {
    state.theme = payload.theme;
    document.body.className = `theme-${payload.theme}`;
    vscode.setState(state);
  }

  /**
   * Handle configuration updates
   */
  function handleUpdateConfig(payload) {
    // Handle configuration changes if needed
    log('info', 'Configuration updated:', payload);
  }

  /**
   * Handle show message
   */
  function handleShowMessage(payload) {
    showMessage(payload.text, payload.type);
  }

  /**
   * Handle generation status updates
   */
  function handleGenerationStatus(payload) {
    updateStatus(`${payload.step}: ${payload.message}`, 'info');
  }

  /**
   * Handle generation completion
   */
  function handleGenerationComplete(payload) {
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Content';
    }

    if (payload.success) {
      updateStatus(`✅ ${payload.message}`, 'success');
      showMessage(`Content generated successfully: ${payload.result?.filename}`, 'info');
    } else {
      updateStatus(`❌ ${payload.message}`, 'error');
      showMessage(`Generation failed: ${payload.error}`, 'error');
    }
  }

  /**
   * Handle content updates (file selection)
   */
  function handleUpdateContent(payload) {
    if (payload.files) {
      state.inputs = payload.files;
      vscode.setState(state);
      updateFilesList();
    }
  }

  /**
   * Update the files list display
   */
  function updateFilesList() {
    const filesContainer = document.getElementById('selectedFiles');
    if (!filesContainer) return;

    if (state.inputs.length === 0) {
      filesContainer.innerHTML = '<p>No files selected</p>';
      return;
    }

    const filesList = state.inputs
      .map(
        (file) =>
          `<div class="file-item">
                <span class="file-name">${file.name}</span>
                <span class="file-type">${file.type}</span>
            </div>`
      )
      .join('');

    filesContainer.innerHTML = `
            <div class="files-list">
                ${filesList}
            </div>
        `;
  }

  /**
   * Update UI with current state
   */
  function updateUI() {
    const contentGoalInput = document.getElementById('contentGoal');
    if (contentGoalInput) {
      contentGoalInput.value = state.contentGoal;
    }

    updateFilesList();

    // Apply theme
    document.body.className = `theme-${state.theme}`;
  }

  /**
   * Show a message to the user
   */
  function showMessage(text, type = 'info') {
    // Simple status update
    updateStatus(text, type);

    // Log to console as well
    console.log(`[${type.toUpperCase()}] ${text}`);
  }

  /**
   * Update status display
   */
  function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;

      // Clear status after 5 seconds for non-error messages
      if (type !== 'error') {
        setTimeout(() => {
          statusElement.textContent = '';
          statusElement.className = 'status';
        }, 5000);
      }
    }
  }

  /**
   * Send message to extension
   */
  function sendMessage(message) {
    log('debug', 'Sending message:', message);
    vscode.postMessage(message);
  }

  /**
   * Log function
   */
  function log(level, message, data) {
    const logMessage = {
      type: MessageType.LOG_MESSAGE,
      payload: { level, text: message, data },
    };
    vscode.postMessage(logMessage);
  }
})();
