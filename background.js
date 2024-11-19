// background.js
let currentState = {
  action: null,
  text: null,
  isProcessing: false,
  timestamp: Date.now(),
};

// Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, text, type } = message;

  if (type === "GET_STATE") {
    sendResponse(currentState);
    return true;
  }

  if (
    action === "summarize" ||
    action === "translate" ||
    action === "simplify" ||
    action === "insight"
  ) {
    if (!sender.tab) {
      getCurrentTab().then((tab) => {
        if (tab) {
          handleAction(action, text, tab.id);
        }
      });
    } else {
      handleAction(action, text, sender.tab.id);
    }
    return true;
  }
});

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function handleAction(action, text, tabId) {
  try {
    // Update state before processing
    currentState = {
      action,
      text,
      isProcessing: true,
      timestamp: Date.now(),
    };

    // Show processing state in extension icon
    await chrome.action.setBadgeText({ text: "..." });
    await chrome.action.setBadgeBackgroundColor({ color: "#1E88E5" });

    // Send initial processing state to popup
    try {
      await chrome.runtime.sendMessage({
        type: "PROCESSING_STARTED",
        action: action,
      });
    } catch (e) {
      console.log("Popup not ready for initial state");
    }

    let responseText = "";

    // Get selected text if none provided
    if (!text) {
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId },
          function: () => window.getSelection().toString(),
        });
        text = result;
        currentState.text = text;
      } catch (e) {
        console.error("Failed to get selected text:", e);
        throw new Error("Please select some text first");
      }
    }

    if (!text) {
      throw new Error("Please select some text first");
    }

    // Process the text based on action
    switch (action) {
      case "summarize":
        responseText = await callSummarizationAPI(text);
        break;
      case "translate":
        responseText = await callTranslationAPI(text);
        break;
      case "simplify":
        responseText = await callSimplifyAPI(text);
        break;
      case "insight":
        responseText = await callInsightAPI(text);
        break;
    }

    // Clear processing state
    await chrome.action.setBadgeText({ text: "" });

    // Update state with result
    currentState = {
      action: null,
      text: null,
      isProcessing: false,
      result: responseText,
      timestamp: Date.now(),
    };

    // Send result to popup
    try {
      await chrome.runtime.sendMessage({
        type: "API_RESPONSE",
        data: responseText,
      });
    } catch (e) {
      console.log("Popup not available for response");
    }
  } catch (error) {
    console.error("Error in handleAction:", error);
    const errorMsg = error.message || "Error processing request";

    // Clear processing state
    await chrome.action.setBadgeText({ text: "" });

    // Update state with error
    currentState = {
      action: null,
      text: null,
      isProcessing: false,
      error: errorMsg,
      timestamp: Date.now(),
    };

    // Send error to popup
    try {
      await chrome.runtime.sendMessage({
        type: "API_ERROR",
        error: errorMsg,
      });
    } catch (e) {
      console.log("Popup not available for error");
    }
  }
}

// API Functions
async function callLLM(questionsPrompt) {
  try {
    const session = await ai.languageModel.create({
      systemPrompt: `You are a helpful assistant that helps people to understand the content by summarizing it, translate it, and simplify it.`,
    });
    const response = await session.prompt(questionsPrompt);
    return response;
  } catch (error) {
    throw new Error("Error connecting to LLM: " + error.message);
  }
}

async function callSummarizationAPI(text) {
  const questionsPrompt = `Based on the following content, Summarize it in simple words: ${text}`;
  return await callLLM(questionsPrompt);
}

async function callTranslationAPI(text) {
  const questionsPrompt = `Translate the following text to English to Spanish: ${text}`;
  return await callLLM(questionsPrompt);
}

async function callSimplifyAPI(text) {
  const questionsPrompt = `Simplify the following text to make it easier to understand: ${text}`;
  return await callLLM(questionsPrompt);
}

async function callInsightAPI(text) {
  const questionsPrompt = `Analyze the following text and provide key insights and observations: ${text}`;
  return await callLLM(questionsPrompt);
}

// Context Menu Setup
chrome.runtime.onInstalled.addListener(() => {
  const menuItems = [
    { id: "summarize", title: "Summarize Text" },
    { id: "translate", title: "Translate Text" },
    { id: "simplify", title: "Simplify Text" },
    { id: "insight", title: "Ask Insight" },
  ];

  menuItems.forEach((item) => {
    chrome.contextMenus.create({
      id: item.id,
      title: item.title,
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const validActions = ["summarize", "translate", "simplify", "insight"];
  if (validActions.includes(info.menuItemId)) {
    handleAction(info.menuItemId, info.selectionText, tab.id);
  }
});
