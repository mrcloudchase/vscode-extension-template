// Simplified webview script for AI Content Developer
(function () {
  // Get VS Code API
  const vscode = acquireVsCodeApi();

  // State management
  let state = {
    theme: 'light',
    contentGoal: '',
    inputs: [],
    monitorExpanded: false,
    promptCount: 0,
    responseCount: 0,
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
    MODEL_INPUT: 'modelInput',
    MODEL_OUTPUT: 'modelOutput',

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

    // Add URL button
    const addUrlBtn = document.getElementById('addUrl');
    if (addUrlBtn) {
      addUrlBtn.addEventListener('click', () => {
        showUrlInput();
      });
    }

    // URL input handlers
    const confirmUrlBtn = document.getElementById('confirmUrl');
    const cancelUrlBtn = document.getElementById('cancelUrl');
    const urlField = document.getElementById('urlField');

    if (confirmUrlBtn) {
      confirmUrlBtn.addEventListener('click', () => {
        addUrlToInputs();
      });
    }

    if (cancelUrlBtn) {
      cancelUrlBtn.addEventListener('click', () => {
        hideUrlInput();
      });
    }

    if (urlField) {
      urlField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          addUrlToInputs();
        } else if (e.key === 'Escape') {
          hideUrlInput();
        }
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

    // Monitor toggle button
    const toggleMonitorBtn = document.getElementById('toggleMonitor');
    if (toggleMonitorBtn) {
      toggleMonitorBtn.addEventListener('click', () => {
        toggleMonitor();
      });
    }

    // Monitor control buttons
    const clearMonitorBtn = document.getElementById('clearMonitor');
    const exportMonitorBtn = document.getElementById('exportMonitor');

    if (clearMonitorBtn) {
      clearMonitorBtn.addEventListener('click', () => {
        clearMonitor();
      });
    }

    if (exportMonitorBtn) {
      exportMonitorBtn.addEventListener('click', () => {
        exportMonitorData();
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

      case MessageType.MODEL_INPUT:
        handleModelInput(message.payload);
        break;

      case MessageType.MODEL_OUTPUT:
        handleModelOutput(message.payload);
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
      if (payload.append) {
        // Append new files to existing inputs
        const existingUris = new Set(state.inputs.map((input) => input.uri));
        const newFiles = payload.files.filter((file) => !existingUris.has(file.uri));

        if (newFiles.length > 0) {
          state.inputs.push(...newFiles);
          showMessage(
            `Added ${newFiles.length} file${newFiles.length !== 1 ? 's' : ''}`,
            'success'
          );
        } else {
          showMessage('Files already selected', 'warning');
        }
      } else {
        // Replace all inputs (fallback)
        state.inputs = payload.files;
      }

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
      url: 'globe',
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
   * Show URL input section
   */
  function showUrlInput() {
    const urlSection = document.getElementById('urlInput');
    const urlField = document.getElementById('urlField');

    if (urlSection) {
      urlSection.classList.remove('hidden');
      if (urlField) {
        urlField.focus();
      }
    }
  }

  /**
   * Hide URL input section
   */
  function hideUrlInput() {
    const urlSection = document.getElementById('urlInput');
    const urlField = document.getElementById('urlField');

    if (urlSection) {
      urlSection.classList.add('hidden');
      if (urlField) {
        urlField.value = '';
      }
    }
  }

  /**
   * Add URL to inputs list
   */
  function addUrlToInputs() {
    const urlField = document.getElementById('urlField');

    if (urlField && urlField.value.trim()) {
      const url = urlField.value.trim();

      // Basic URL validation
      try {
        new URL(url);
      } catch (error) {
        showMessage('Please enter a valid URL', 'warning');
        return;
      }

      // Create friendly display name for URL
      let displayName = url;
      try {
        const urlObj = new URL(url);
        displayName = urlObj.hostname + urlObj.pathname;
        if (displayName.length > 50) {
          displayName = displayName.substring(0, 47) + '...';
        }
      } catch (e) {
        // Use full URL if parsing fails
      }

      // Add to inputs
      const urlInput = {
        id: Date.now().toString(),
        name: displayName,
        type: 'url',
        uri: url,
      };

      state.inputs.push(urlInput);
      vscode.setState(state);
      updateFilesList();
      hideUrlInput();

      showMessage(`URL added: ${url}`, 'success');
    } else {
      showMessage('Please enter a URL', 'warning');
    }
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

  // Monitor Functions

  /**
   * Handle model input (prompt) messages
   */
  function handleModelInput(payload) {
    state.promptCount++;
    updateMessageCount('inputCount', state.promptCount);

    const promptsContainer = document.getElementById('promptsContainer');
    if (promptsContainer) {
      // Remove empty state if present
      const emptyState = promptsContainer.querySelector('.empty-state');
      if (emptyState) {
        emptyState.remove();
      }

      const messageItem = createMessageItem({
        type: 'input',
        step: payload.step || 'Unknown',
        content: payload.content || payload.prompt,
        timestamp: new Date().toLocaleTimeString(),
      });

      promptsContainer.appendChild(messageItem);
      promptsContainer.scrollTop = promptsContainer.scrollHeight;
    }
  }

  /**
   * Handle model output (response) messages
   */
  function handleModelOutput(payload) {
    state.responseCount++;
    updateMessageCount('outputCount', state.responseCount);

    const responsesContainer = document.getElementById('responsesContainer');
    if (responsesContainer) {
      // Remove empty state if present
      const emptyState = responsesContainer.querySelector('.empty-state');
      if (emptyState) {
        emptyState.remove();
      }

      const messageItem = createMessageItem({
        type: 'output',
        step: payload.step || 'Unknown',
        content: payload.content || payload.response,
        timestamp: new Date().toLocaleTimeString(),
      });

      responsesContainer.appendChild(messageItem);
      responsesContainer.scrollTop = responsesContainer.scrollHeight;
    }
  }

  /**
   * Create a message item element
   */
  function createMessageItem({ type, step, content, timestamp }) {
    const messageItem = document.createElement('div');
    messageItem.className = 'message-item';

    messageItem.innerHTML = `
       <div class="message-header">
         <span class="message-timestamp">${timestamp}</span>
         <span class="message-step">Step: ${step}</span>
       </div>
       <div class="message-content ${type === 'output' ? 'response' : ''}">${escapeHtml(content)}</div>
       <div class="message-actions">
         <button class="copy-btn" onclick="copyToClipboard(this)" title="Copy content">
           <span class="codicon codicon-copy"></span>
         </button>
       </div>
     `;

    return messageItem;
  }

  /**
   * Toggle monitor visibility
   */
  function toggleMonitor() {
    const monitorContent = document.getElementById('monitorContent');
    const toggleBtn = document.getElementById('toggleMonitor');
    const controls = document.querySelector('.monitor-controls');

    if (monitorContent && toggleBtn) {
      const isHidden = monitorContent.classList.contains('hidden');

      if (isHidden) {
        monitorContent.classList.remove('hidden');
        toggleBtn.classList.add('expanded');
        if (controls) controls.classList.remove('hidden');
        state.monitorExpanded = true;
      } else {
        monitorContent.classList.add('hidden');
        toggleBtn.classList.remove('expanded');
        if (controls) controls.classList.add('hidden');
        state.monitorExpanded = false;
      }

      vscode.setState(state);
    }
  }

  /**
   * Clear monitor content
   */
  function clearMonitor() {
    const promptsContainer = document.getElementById('promptsContainer');
    const responsesContainer = document.getElementById('responsesContainer');

    if (promptsContainer) {
      promptsContainer.innerHTML = `
         <div class="empty-state">
           <span class="codicon codicon-comment-discussion"></span>
           <p>No prompts sent yet</p>
         </div>
       `;
    }

    if (responsesContainer) {
      responsesContainer.innerHTML = `
         <div class="empty-state">
           <span class="codicon codicon-robot"></span>
           <p>No responses received yet</p>
         </div>
       `;
    }

    state.promptCount = 0;
    state.responseCount = 0;
    updateMessageCount('inputCount', 0);
    updateMessageCount('outputCount', 0);
    vscode.setState(state);

    showMessage('Monitor cleared', 'success');
  }

  /**
   * Export monitor data
   */
  function exportMonitorData() {
    const promptsContainer = document.getElementById('promptsContainer');
    const responsesContainer = document.getElementById('responsesContainer');

    const prompts = Array.from(promptsContainer?.querySelectorAll('.message-item') || []).map(
      (item) => ({
        timestamp: item.querySelector('.message-timestamp')?.textContent,
        step: item.querySelector('.message-step')?.textContent,
        content: item.querySelector('.message-content')?.textContent,
      })
    );

    const responses = Array.from(responsesContainer?.querySelectorAll('.message-item') || []).map(
      (item) => ({
        timestamp: item.querySelector('.message-timestamp')?.textContent,
        step: item.querySelector('.message-step')?.textContent,
        content: item.querySelector('.message-content')?.textContent,
      })
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      prompts,
      responses,
    };

    // Create download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-monitor-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showMessage('Monitor data exported', 'success');
  }

  /**
   * Update message count display
   */
  function updateMessageCount(elementId, count) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = count;
    }
  }

  /**
   * Copy content to clipboard
   */
  window.copyToClipboard = function (button) {
    const messageContent = button.closest('.message-item')?.querySelector('.message-content');
    if (messageContent) {
      const text = messageContent.textContent;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showMessage('Copied to clipboard', 'success');
        })
        .catch(() => {
          showMessage('Failed to copy', 'error');
        });
    }
  };

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
