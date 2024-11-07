const apiKey = 'AIzaSyBgIXy5opjM6qz97W64XU9Nn3mFenX2hsg';

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

// Initialize the app
function initializeApp() {
    setupEventListeners();
    resetApp();
}

// Setup event listeners for image input and form submission
function setupEventListeners() {
    const imageInput = document.getElementById('imageInput');
    const uploadForm = document.getElementById('uploadForm');

    if (imageInput) {
        imageInput.addEventListener('change', handleImageSelection);
    }

    if (uploadForm) {
        uploadForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await initiateScanProcess();
        });
    }
}

// Handle image selection and show preview
function handleImageSelection() {
    const imageInput = document.getElementById("imageInput");
    const filePathInput = document.querySelector(".file-path");
    const scanBtn = document.getElementById("scanBtn");

    if (imageInput && filePathInput && scanBtn) {
        if (imageInput.files.length > 0) {
            const fileName = imageInput.files[0].name;
            filePathInput.value = fileName;
            displayImage(imageInput.files[0]);
            scanBtn.disabled = false;
        } else {
            filePathInput.value = '';
            scanBtn.disabled = true;
        }
    }
}

// Display selected image preview
function displayImage(file) {
    const imagePreview = document.getElementById("imagePreview");
    if (!imagePreview) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        imagePreview.innerHTML = `<img src="${event.target.result}" alt="Uploaded Image" />`;
    };
    reader.readAsDataURL(file);
}

// Convert image file to Base64
async function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Main process to send image for analysis
async function initiateScanProcess() {
    const scanBtn = document.getElementById("scanBtn");
    const resultDiv = document.getElementById("result");
    const imageInput = document.getElementById("imageInput");

    if (!scanBtn || !resultDiv || !imageInput || imageInput.files.length === 0) {
        alert("Please upload an image.");
        return;
    }

    scanBtn.disabled = true;
    resultDiv.innerHTML = "<p>Processing image, please wait...</p>";

    const file = imageInput.files[0];
    const base64Image = await convertToBase64(file);

    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: `You are an AI healthcare assistant specializing in dermatology. Analyze the uploaded image and return a response in JSON format only with fields:
                        {
                            "diseaseName": "Detected disease name",
                            "type": "Disease categorization (e.g., 'bacterial infection')",
                            "confidenceLevel": "Confidence level as a percentage",
                            "symptoms": ["List of observed symptoms"],
                            "yearlyCases": "Estimated yearly cases",
                            "likelyCause": "Probable cause"
                        }`
                    },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: base64Image
                        }
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
            displayAnalysisResult(data);
        } else {
            const errorData = await response.json();
            console.error("Error response:", errorData);
            displayError(`Error: ${errorData.error.message}`);
        }
    } catch (error) {
        console.error("Fetch error:", error);
        displayError("Error analyzing the image. Please try again.");
    }
}

// Display analysis result
function displayAnalysisResult(data) {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    try {
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        const analysis = JSON.parse(responseText);

        const diseaseInfo = {
            name: analysis.diseaseName || "No Disease Detected",
            type: analysis.type || "Not Available",
            confidenceLevel: analysis.confidenceLevel || "Not Available",
            symptoms: Array.isArray(analysis.symptoms) && analysis.symptoms.length > 0 
                ? analysis.symptoms.join(", ") 
                : "Not Available",
            annualCases: analysis.yearlyCases || "Unknown",
            cause: analysis.likelyCause || "Not Available"
        };

        resultDiv.innerHTML = `
            <div class="result-card">
                <h5><i class="fas fa-notes-medical"></i> Analysis Result</h5>
                <p><strong>Disease Name:</strong> ${diseaseInfo.name}</p>
                <p><strong>Type:</strong> ${diseaseInfo.type}</p>
                <p><strong>Confidence Level:</strong> ${diseaseInfo.confidenceLevel}</p>
                <p><strong>Symptoms:</strong> ${diseaseInfo.symptoms}</p>
                <p><strong>Yearly Cases:</strong> ${diseaseInfo.annualCases}</p>
                <p><strong>Likely Cause:</strong> ${diseaseInfo.cause}</p>
            </div>
        `;
    } catch (error) {
        console.error("Parsing error:", error);
        displayError("There was an error processing the AI response format. Please try again.");
    }
}

// Display error message
function displayError(message) {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    resultDiv.innerHTML = `
        <div class="error-card">
            <h5><i class="fas fa-exclamation-triangle"></i> Error</h5>
            <p>${message}</p>
        </div>
    `;
}

// Reset the application for a new scan
function resetApp() {
    const uploadForm = document.getElementById("uploadForm");
    const imagePreview = document.getElementById("imagePreview");
    const resultDiv = document.getElementById("result");
    const scanBtn = document.getElementById("scanBtn");

    if (uploadForm) uploadForm.reset();
    if (imagePreview) imagePreview.innerHTML = '';
    if (resultDiv) resultDiv.innerHTML = '';
    if (scanBtn) scanBtn.disabled = true;
}
