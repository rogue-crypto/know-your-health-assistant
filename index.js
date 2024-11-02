const apiKey = 'AIzaSyBgIXy5opjM6qz97W64XU9Nn3mFenX2hsg';

// Event listeners for the image selection and form submission
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    resetApp();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('imageInput').addEventListener('change', handleImageSelection);
    document.getElementById('uploadForm').addEventListener("submit", async (event) => {
        event.preventDefault();
        await initiateScanProcess();
    });
}

// Handle image selection and preview
function handleImageSelection() {
    const imageInput = document.getElementById("imageInput");
    const filePathInput = document.querySelector(".file-path");
    const scanBtn = document.getElementById("scanBtn");

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

// Display the selected image in the preview area
function displayImage(file) {
    const imagePreview = document.getElementById("imagePreview");
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

// Main process to initiate image analysis
async function initiateScanProcess() {
    const scanBtn = document.getElementById("scanBtn");
    const progressBar = document.getElementById("progressBar");
    const resultDiv = document.getElementById("result");
    const imageInput = document.getElementById("imageInput");

    if (imageInput.files.length === 0) {
        alert("Please upload an image.");
        return;
    }

    // Show progress and disable button if progressBar exists
    scanBtn.disabled = true;
    if (progressBar) progressBar.style.display = "block";
    resultDiv.innerHTML = "<p>Processing image, please wait...</p>";

    const file = imageInput.files[0];
    const base64Image = await convertToBase64(file);

    const payload = {
        contents: [
            {
                parts: [
                    {
                        text: `You are a healthcare assistant specializing in dermatology. Analyze the uploaded image and provide the following information in strict JSON format only. Do not use any other characters or explanations. 
                        {
                            "diseaseName": "Name of the disease (add an or if there are multiple possible diseases with high confidence level like with vitiligo and pityriasis alba) or 'No visible disease detected'",
                            "type": "Type of the disease or 'Not Available'",
                            "confidenceLevel": "Confidence level in percentage. or 'Not Available'",
                            "symptoms": ["List of symptoms", "or 'Not Available' if none"],
                            "yearlyCases": "How many people get this disease every year according to the internet, if there is a disease you MUST write this.",
                            "likelyCause": "Likely cause for this disease, if you write unkown don't write anything else. or 'Not Available'"
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

        if (progressBar) progressBar.style.display = "none";

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
        if (progressBar) progressBar.style.display = "none";
        displayError("Error analyzing the image. Please try again.");
    }
}

// Display analysis result
function displayAnalysisResult(data) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = '';  // Clear previous results

    try {
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        // Ensure we have valid JSON only (try-catch for extra safety)
        const analysis = JSON.parse(responseText);

        const diseaseInfo = {
            name: analysis.diseaseName || "No Disease Detected",
            type: analysis.type || "Not Available",
            confidenceLevel: analysis.confidenceLevel || "Not Available",
            symptoms: Array.isArray(analysis.symptoms) && analysis.symptoms.length > 0 
                ? analysis.symptoms.join(", ") 
                : "Not Available",
            annualCases: analysis.yearlyCases || "Unkown",
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

// Display an error message in the UI
function displayError(message) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = `
        <div class="error-card">
            <h5><i class="fas fa-exclamation-triangle"></i> Error</h5>
            <p>${message}</p>
        </div>
    `;
}

// Reset the application for a new scan
function resetApp() {
    document.getElementById("uploadForm").reset();
    document.getElementById("imagePreview").innerHTML = '';
    document.getElementById("result").innerHTML = '';
    const progressBar = document.getElementById("progressBar");
    if (progressBar) progressBar.style.display = "none";
    document.getElementById("scanBtn").disabled = true;
}
