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

    // Suggestion chips
    const suggestionChips = document.querySelectorAll('.suggestion-chip');
    suggestionChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const suggestion = chip.getAttribute('data-suggestion');
        if (suggestion && contentGoalInput) {
          contentGoalInput.value = suggestion;
          state.contentGoal = suggestion;
          vscode.setState(state);

          // Add visual feedback
          chip.style.transform = 'scale(0.95)';
          setTimeout(() => {
            chip.style.transform = 'scale(1)';
          }, 150);
        }
      });
    });

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
    let statusMessage = payload.message;
    let statusType = 'info';

    // Enhanced status messages based on step
    switch (payload.step) {
      case 'processing':
        statusMessage = '📁 Processing input files...';
        break;
      case 'pattern':
        statusMessage = '🎯 Selecting optimal documentation pattern...';
        break;
      case 'generating':
        statusMessage = '✨ Generating professional documentation...';
        break;
      case 'saving':
        statusMessage = '💾 Saving to docs folder...';
        break;
      default:
        statusMessage = payload.message;
    }

    updateStatus(statusMessage, statusType);

    // Update workflow step indicators
    updateWorkflowProgress(payload.step);
  }

  /**
   * Update workflow progress indicators
   */
  function updateWorkflowProgress(currentStep) {
    const steps = document.querySelectorAll('.workflow-step');
    steps.forEach((step, index) => {
      const stepNumber = step.querySelector('.step-number');
      if (stepNumber) {
        stepNumber.classList.remove('active', 'completed');

        if (currentStep === 'pattern' && index === 0) {
          stepNumber.classList.add('active');
        } else if (currentStep === 'generating' && index === 1) {
          stepNumber.classList.add('active');
        } else if (currentStep === 'saving' && index === 1) {
          stepNumber.classList.add('completed');
        }
      }
    });
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
      filesContainer.innerHTML = `
         <div class="placeholder-content">
           <span class="codicon codicon-cloud-upload"></span>
           <p class="placeholder-text">Drop files here or click "Add Files"</p>
           <p class="placeholder-subtext">Supports: MD, PDF, Word, PowerPoint, Text files</p>
         </div>
       `;
      return;
    }

    const filesList = state.inputs
      .map((file, index) => {
        const fileIcon = getFileIcon(file.type);
        return `
           <div class="file-item" data-index="${index}">
             <div class="file-info">
               <span class="file-icon codicon codicon-${fileIcon}"></span>
               <div class="file-details">
                 <span class="file-name">${file.name}</span>
                 <span class="file-path">${file.type.toUpperCase()}</span>
               </div>
             </div>
             <div class="file-actions">
               <span class="file-type-badge">${file.type}</span>
               <button class="remove-file-btn" onclick="removeFile(${index})" title="Remove file">
                            <span class="codicon codicon-close"></span>
                        </button>
             </div>
                    </div>
                `;
      })
      .join('');

    filesContainer.innerHTML = `
       <div class="files-list">
         <div class="files-header">
           <span class="files-count">${state.inputs.length} file${state.inputs.length !== 1 ? 's' : ''} selected</span>
         </div>
         ${filesList}
       </div>
     `;
  }

  /**
   * Get appropriate icon for file type
   */
  function getFileIcon(type) {
    const iconMap = {
      markdown: 'markdown',
      word: 'file-text',
      pdf: 'file-pdf',
      powerpoint: 'file-media',
      text: 'file-code',
      image: 'file-media',
      file: 'file',
    };
    return iconMap[type] || 'file';
  }

  /**
   * Remove file from list
   */
  window.removeFile = function (index) {
    state.inputs.splice(index, 1);
    vscode.setState(state);
    updateFilesList();

    // Add removal animation
    const fileItem = document.querySelector(`[data-index="${index}"]`);
    if (fileItem) {
      fileItem.style.animation = 'slideOutRight 0.3s ease-out';
    }
  };

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
    const statusText = statusElement?.querySelector('.status-text');
    const statusIcon = statusElement?.querySelector('.status-icon');
    const progressBar = statusElement?.querySelector('.progress-bar');

    if (statusElement && statusText) {
      statusText.textContent = message;
      statusElement.className = `status-display ${type}`;

      // Update icon based on type
      if (statusIcon) {
        let iconClass = 'codicon-info';
        if (type === 'success') iconClass = 'codicon-check';
        else if (type === 'error') iconClass = 'codicon-error';
        else if (type === 'warning') iconClass = 'codicon-warning';

        statusIcon.className = `status-icon codicon ${iconClass}`;
      }

      // Show progress animation for processing states
      if (progressBar) {
        if (type === 'info' && message.includes('...')) {
          progressBar.style.animation = 'progress 2s infinite linear';
        } else {
          progressBar.style.animation = 'none';
        }
      }

      // Clear status after 5 seconds for non-error messages
      if (type !== 'error') {
        setTimeout(() => {
          statusText.textContent = '';
          statusElement.className = 'status-display';
          if (progressBar) progressBar.style.animation = 'none';
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
