chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    let selectedText = window.getSelection().toString().trim();
    if (selectedText) {
        chrome.runtime.sendMessage({ action: request.action, text: selectedText });
    } else {
        alert("Please select some text first.");
    }
});