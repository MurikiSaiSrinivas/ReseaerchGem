// background.js
console.log("Setup started")
//firebase Setup
// import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
// import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
// import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyD6OGbliDq-a8aCNRf3h8sU0MzE6Ut6uzw",
  authDomain: "researchgem-73bfb.firebaseapp.com",
  projectId: "researchgem-73bfb",
  storageBucket: "researchgem-73bfb.firebasestorage.app",
  messagingSenderId: "529146279176",
  appId: "1:529146279176:web:85ce4df1c4b0a5c2e8e8bd",
  measurementId: "G-4388MYD25M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider()
//firebase setup & intialization completes here

let currentState = {
  action: null,
  text: null,
  isProcessing: false,
  user: null,
  timestamp: Date.now(),
};

// Global user variable to track authentication state
let currentUser = null;

// Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, text, type } = message;

  if (type === "GET_STATE") {
    sendResponse(currentState);
    return true;
  }

  if (action === "save") {
    // Trigger Google Sign-In and save process
    signInAndSaveText(text)
      .then((savedItem) => {
        // Update state with saved item details
        currentState = {
          ...currentState,
          action: null,
          isProcessing: false,
          result: "Text saved successfully!",
        };

        // Send success message to popup
        chrome.runtime.sendMessage({
          type: "API_RESPONSE",
          data: "Text saved successfully!"
        });
      })
      .catch((error) => {
        // Handle errors
        currentState = {
          ...currentState,
          action: null,
          isProcessing: false,
          error: error.message,
        };

        // Send error to popup
        chrome.runtime.sendMessage({
          type: "API_ERROR",
          error: error.message
        });
      });

    return true;
  }

  if (
    action === "summarize" ||
    action === "translate" ||
    action === "simplify"
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

// Firebase Authentication and Save Function
async function signInAndSaveText(text) {
  try {
    // If no user is currently signed in, trigger sign-in
    if (!currentUser) {
      const result = await signInWithPopup(auth, provider);
      currentUser = result.user;

      // Update current state with user info
      currentState.user = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName
      };
    }

    // Check if text is empty
    if (!text) {
      throw new Error("No text selected to save");
    }

    // Check if this exact text is already saved for this user
    const existingQuery = query(
      collection(db, "savedTexts"),
      where("userId", "==", currentUser.uid),
      where("text", "==", text)
    );
    const existingDocs = await getDocs(existingQuery);

    if (!existingDocs.empty) {
      throw new Error("This text has already been saved");
    }

    // Save text to Firestore
    const savedItem = await addDoc(collection(db, "savedTexts"), {
      text: text,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      savedAt: new Date(),
      metadata: {
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL
      }
    });

    return savedItem;
  } catch (error) {
    console.error("Error in save process:", error);
    throw error;
  }
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
      case "save":
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

// async function callInsightAPI(text) {
//   const questionsPrompt = `Analyze the following text and provide key insights and observations: ${text}`;
//   return await callLLM(questionsPrompt);
// }

// Context Menu Setup
chrome.runtime.onInstalled.addListener(() => {
  const menuItems = [
    { id: "summarize", title: "Summarize Text" },
    { id: "translate", title: "Translate Text" },
    { id: "simplify", title: "Simplify Text" },
    { id: "save", title: "Save Text" },
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
  const validActions = ["summarize", "translate", "simplify", "save"];
  if (validActions.includes(info.menuItemId)) {
    if (info.menuItemId = "save") {
      signInAndSaveText(info.selectionText)
    }
    else {
      handleAction(info.menuItemId, info.selectionText, tab.id);
    }
  }
});
