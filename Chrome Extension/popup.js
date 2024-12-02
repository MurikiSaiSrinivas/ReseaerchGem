// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const buttons = ["summarize", "translate", "simplify", "save"];
  const statusDiv = document.getElementById("status");
  const resultDiv = document.getElementById("result");

  // First thing: check if there's any ongoing processing
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (state.isProcessing) {
      showLoading(state.action);
    } else if (state.result) {
      displayResult(state.result);
    } else if (state.error) {
      showError(state.error);
    }
  });

  function showLoading(action) {
    // Disable all buttons
    buttons.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) button.disabled = true;
    });

    // Show loading status
    statusDiv.className = "loading";
    statusDiv.innerHTML = `
        <div class="loading-spinner"></div>
        ${getActionMessage(action)}...
      `;
    statusDiv.style.display = "block";

    // Clear previous result
    resultDiv.textContent = "Processing your request...";
  }

  function hideLoading() {
    // Enable all buttons
    buttons.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) button.disabled = false;
    });

    // Hide status
    statusDiv.style.display = "none";
  }

  function getActionMessage(action) {
    switch (action) {
      case "summarize":
        return "Summarizing text";
      case "translate":
        return "Translating text";
      case "simplify":
        return "Simplifying text";
      case "save":
        return "Login and Save the Text";
      default:
        return "Processing";
    }
  }

  function showError(error) {
    statusDiv.className = "error";
    statusDiv.textContent = error;
    statusDiv.style.display = "block";

    resultDiv.textContent = "Error occurred. Please try again.";
    resultDiv.style.color = "red";

    // Enable all buttons
    buttons.forEach((buttonId) => {
      const button = document.getElementById(buttonId);
      if (button) button.disabled = false;
    });

    // Hide error after 3 seconds
    setTimeout(() => {
      statusDiv.style.display = "none";
      resultDiv.textContent =
        "Select text on the page and click any button above";
      resultDiv.style.color = "black";
    }, 3000);
  }

  function displayResult(text) {
    hideLoading();
    resultDiv.style.color = "black";
    resultDiv.innerHTML = convertMarkdown(text);
  }

  // Add click handlers for all buttons
  buttons.forEach((buttonId) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener("click", async () => {
        showLoading(buttonId);
        console.log("Button Clicked")
        // Send message to background script
        chrome.runtime.sendMessage({
          action: buttonId,
          text: null, // background script will get selected text
        });
      });
    }
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "API_RESPONSE") {
      displayResult(message.data);
    } else if (message.type === "API_ERROR") {
      showError(message.error);
    }
  });

  // Check if any text is selected on page load
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: () => window.getSelection().toString(),
      });

      if (!result) {
        resultDiv.textContent =
          "Select text on the page and click any button above";
      }
    } catch (e) {
      console.error("Failed to get selected text:", e);
    }
  });
});

function convertMarkdown(text) {
  if (!text) return "";

  // Process the text in specific order
  return (
    text
      // Headers
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Code blocks
      .replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>")
      // Inline code
      .replace(/`(.*?)`/g, "<code>$1</code>")
      // Lists
      .replace(/^\s*[-*+]\s+(.*$)/gm, "<li>$1</li>")
      // Wrap adjacent list items in ul
      .replace(/(<li>.*<\/li>)\n(?=<li>)/g, "$1")
      .replace(/(?<!<\/ul>|<\/ol>)(<li>.*<\/li>)(?!\n<li>)/g, "<ul>$1</ul>")
      // Line breaks
      .replace(/\n/g, "<br />")
  );
}
