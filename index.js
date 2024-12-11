const apiKey = 'AIzaSyB2rYYcVdfLcoN3Gwc-dd96YY4R5Gj1dqs';

document.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

// Initialize the application
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

// Handle image selection and display preview
function handleImageSelection() {
    const imageInput = document.getElementById("imageInput");
    const filePathInput = document.querySelector(".file-path");
    const scanBtn = document.getElementById("scanBtn");

    if (imageInput?.files.length > 0) {
        const fileName = imageInput.files[0].name;
        filePathInput.value = fileName;
        displayImage(imageInput.files[0]);
        scanBtn.disabled = false;
    } else {
        filePathInput.value = '';
        scanBtn.disabled = true;
    }
}

// Display the selected image preview
function displayImage(file) {
    const imagePreview = document.getElementById("imagePreview");
    if (!imagePreview) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        imagePreview.innerHTML = `<img src="${event.target.result}" alt="Uploaded Image" class="preview-image" />`;
    };
    reader.readAsDataURL(file);
}

// Convert the image file to Base64
async function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.onerror = (error) => {
            console.error("Error converting image to Base64:", error);
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}

// Main process: send the image for analysis
async function initiateScanProcess() {
    const scanBtn = document.getElementById("scanBtn");
    const resultDiv = document.getElementById("result");
    const imageInput = document.getElementById("imageInput");

    if (!imageInput?.files.length) {
        alert("Please upload an image.");
        return;
    }

    scanBtn.disabled = true;
    resultDiv.innerHTML = "<p class='loading'>Processing image, please wait...</p>";

    const file = imageInput.files[0];
    let base64Image;

    try {
        base64Image = await convertToBase64(file);
    } catch (error) {
        displayError("Failed to process the image. Please try again.");
        console.error("Base64 Conversion Error:", error);
        scanBtn.disabled = false;
        return;
    }

    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: "You are an AI healthcare assistant specializing in dermatology. Analyze the uploaded image and return a response in JSON format with the fields: {\"diseaseName\":\"Detected disease name\",\"type\":\"Disease categorization\",\"confidenceLevel\":\"Confidence level (%)\",\"symptoms\":[\"Symptom list\"],\"yearlyCases\":\"Estimated yearly cases\",\"likelyCause\":\"Probable cause\"}"
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
            console.error("API Response Error:", errorData);
            displayError(`Error: ${errorData.error?.message || "Unknown error occurred."}`);
        }
    } catch (error) {
        console.error("Network or API Request Error:", error);
        displayError("An error occurred while processing the image. Please try again.");
    } finally {
        scanBtn.disabled = false;
    }
}

// Display analysis results
function displayAnalysisResult(data) {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    try {
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
        const analysis = JSON.parse(responseText);

        const diseaseInfo = {
            name: analysis.diseaseName || "No Disease Detected",
            type: analysis.type || "Not Available",
            confidenceLevel: analysis.confidenceLevel || "Not Available",
            symptoms: analysis.symptoms?.join(", ") || "Not Available",
            yearlyCases: analysis.yearlyCases || "Unknown",
            cause: analysis.likelyCause || "Not Available"
        };

        resultDiv.innerHTML = `
            <div class="result-card">
                <h5><i class="fas fa-notes-medical"></i> Analysis Result</h5>
                <p><strong>Disease Name:</strong> ${diseaseInfo.name}</p>
                <p><strong>Type:</strong> ${diseaseInfo.type}</p>
                <p><strong>Confidence Level:</strong> ${diseaseInfo.confidenceLevel}</p>
                <p><strong>Symptoms:</strong> ${diseaseInfo.symptoms}</p>
                <p><strong>Yearly Cases:</strong> ${diseaseInfo.yearlyCases}</p>
                <p><strong>Likely Cause:</strong> ${diseaseInfo.cause}</p>
            </div>
        `;
    } catch (error) {
        console.error("Error Parsing Analysis Result:", error);
        displayError("Error processing AI response. Please try again.");
    }
}

// Display error messages
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

// Reset the application
function resetApp() {
    const uploadForm = document.getElementById("uploadForm");
    const imagePreview = document.getElementById("imagePreview");
    const resultDiv = document.getElementById("result");
    const scanBtn = document.getElementById("scanBtn");

    uploadForm?.reset();
    if (imagePreview) imagePreview.innerHTML = '';
    if (resultDiv) resultDiv.innerHTML = '';
    if (scanBtn) scanBtn.disabled = true;
}
