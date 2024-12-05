const apiKey = 'AIzaSyBgIXy5opjM6qz97W64XU9Nn3mFenX2hsg';

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

// Initialize the app
function initializeApp() {
    setupEventListeners();
    resetApp();
}

// Setup event listeners
function setupEventListeners() {
    const diaryInput = document.getElementById('diaryInput');
    const diaryForm = document.getElementById('diaryForm');
    const chatInput = document.getElementById('chatInput');
    const chatSubmit = document.getElementById('chatSubmit');

    if (diaryInput) {
        diaryInput.addEventListener('input', handleTextInput);
    }

    if (diaryForm) {
        diaryForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await analyzeDiaryEntry();
        });
    }

    if (chatSubmit) {
        chatSubmit.addEventListener('click', async () => {
            await handleChatSubmission();
        });
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                document.getElementById('chatSubmit').click();
            }
        });
    }
}

// Enable/disable Analyze button based on input
function handleTextInput() {
    const diaryInput = document.getElementById("diaryInput");
    const analyzeBtn = document.getElementById("analyzeBtn");

    if (diaryInput && analyzeBtn) {
        analyzeBtn.disabled = diaryInput.value.trim() === '';
    }
}

// Analyze diary entry and display results
async function analyzeDiaryEntry() {
    const diaryInput = document.getElementById("diaryInput");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const resultDiv = document.getElementById("result");

    analyzeBtn.disabled = true;
    resultDiv.innerHTML = `<p><i class="fas fa-spinner fa-spin"></i> Analyzing your entry...</p>`;
    resultDiv.style.display = "block";

    const diaryText = diaryInput.value;

    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: `Analyze the following diary entry and provide personalized advice on personal growth and healthier habits, do not use any advancement, only plain text no use of ** or bolding, I REPEAT DO NOT USE ** FOR ANYTHING because my website cannot render it, do not use ** in the headings and just provide plain text, maybe add supportive things which make it look better. Do not give a huge paragraph, get to the point the text is here : "${diaryText}"`
                    }
                ]
            }
        ]
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            displayInsights(data);
        } else {
            const errorData = await response.json();
            displayError(`API Error: ${errorData.error.message}`);
        }
    } catch (error) {
        console.error("Fetch error:", error);
        displayError("Unable to analyze your entry. Please try again later.");
    } finally {
        analyzeBtn.disabled = false;
    }
}

// Display insights in a readable format
// Formatting AI Responses
function displayInsights(data) {
    const resultDiv = document.getElementById("result");
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    const insights = parseAIResponse(responseText); // Breaks text into actionable steps

    resultDiv.innerHTML = `
        <div class="result-card">
            <h5><i class="fas fa-lightbulb"></i> Insights & Suggestions</h5>
            <ul>
                ${insights.map(insight => `<li><i class="fas fa-check-circle"></i>${insight}</li>`).join("")}
            </ul>
        </div>
    `;
    resultDiv.style.display = "block";
}

function parseAIResponse(responseText) {
    return responseText.split(/[\r\n]+/).map(line => line.trim()).filter(line => line);
}


// Format AI response into a list of suggestions
function formatResponseAsList(responseText) {
    const suggestions = responseText.split('.').filter(s => s.trim());
    return suggestions.map(s => `<li>${s}</li>`).join('');
}

// Handle Chat with AI submission
async function handleChatSubmission() {
    const chatInput = document.getElementById('chatInput');
    const chatHistory = document.getElementById('chatHistory');
    const userMessage = chatInput.value.trim();

    if (!userMessage) return;

    // Display user message in the chat
    chatHistory.innerHTML += `<p><strong>You:</strong> ${userMessage}</p>`;
    chatInput.value = '';

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    { parts: [{ text: userMessage }] }
                ]
            })
        });

        if (response.ok) {
            const data = await response.json();
            const botResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            chatHistory.innerHTML += `<p><strong>AI:</strong> ${botResponse}</p>`;
            chatHistory.scrollTop = chatHistory.scrollHeight;
        } else {
            chatHistory.innerHTML += `<p><strong>AI:</strong> Sorry, I couldn't understand your question.</p>`;
        }
    } catch (error) {
        chatHistory.innerHTML += `<p><strong>AI:</strong> An error occurred. Please try again.</p>`;
    }
}

// Display error message
function displayError(message) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = `
        <div class="error-card">
            <h5><i class="fas fa-exclamation-circle"></i> Error</h5>
            <p>${message}</p>
        </div>
    `;
}
