// API configuration
const API_KEY = 'AIzaSyBCy_XXLemCxYoaQgaz_YaneyHXWCJgk8k';
const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-vision-latest:generateContent';

document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    resetApp();
});

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

function displayImage(file) {
    const imagePreview = document.getElementById("imagePreview");
    if (!imagePreview) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        imagePreview.innerHTML = `<img src="${event.target.result}" alt="Uploaded Image" class="preview-image" />`;
    };
    reader.readAsDataURL(file);
}

async function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function initiateScanProcess() {
    const scanBtn = document.getElementById("scanBtn");
    const resultDiv = document.getElementById("result");
    const imageInput = document.getElementById("imageInput");

    if (!imageInput.files.length) {
        alert("Please upload an image.");
        return;
    }

    scanBtn.disabled = true;
    resultDiv.innerHTML = "<p>Processing image, please wait...</p>";

    try {
        const base64Image = await convertToBase64(imageInput.files[0]);
        
        const payload = {
            contents: [{
                parts: [{
                    text: `Analyze this image for skin conditions and provide a detailed assessment in this exact JSON format:
                    {
                        "diseaseName": "Name of the condition or 'No visible disease detected'",
                        "type": "Disease classification or 'Not Available'",
                        "confidenceLevel": "Confidence as percentage or 'Not Available'",
                        "symptoms": ["Observed symptoms"],
                        "yearlyCases": "Estimated cases or 'Not Available'",
                        "likelyCause": "Known causes or 'Unknown'"
                    }`
                }, {
                    inline_data: {
                        mime_type: imageInput.files[0].type,
                        data: base64Image
                    }
                }]
            }]
        };

        const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayAnalysisResult(data);

    } catch (error) {
        console.error("Analysis error:", error);
        displayError("Error analyzing the image. Please try again.");
    } finally {
        scanBtn.disabled = false;
    }
}

function displayAnalysisResult(data) {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    try {
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error("Invalid response format");
        }

        // Find the JSON object in the response text
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON found in response");
        }

        const analysis = JSON.parse(jsonMatch[0]);

        const diseaseInfo = {
            name: analysis.diseaseName || "No Disease Detected",
            type: analysis.type || "Not Available",
            confidenceLevel: analysis.confidenceLevel || "Not Available",
            symptoms: Array.isArray(analysis.symptoms) ? analysis.symptoms.join(", ") : "Not Available",
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
        displayError("Error processing the AI response. Please try again.");
    }
}

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
