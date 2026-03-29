let uploadedImage = null;
let variableCounter = 0; // Unique ID for each variable row

const TEMPLATE_KEY = "templates";
const VARIABLES_KEY = "variables";

// --- IMAGE UPLOAD ---
document.getElementById("imageInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) uploadedImage = URL.createObjectURL(file);
});

// --- VARIABLES MANAGEMENT ---
function addVariableField(key = "", value = "") {
    const container = document.getElementById("variablesContainer");
    const rowId = `variable-${variableCounter++}`;

    const div = document.createElement("div");
    div.id = rowId;
    div.className = "border-b border-gray-300 pb-2 mb-2";

    div.innerHTML = `
        <div class="flex flex-col md:flex-row gap-2 md:items-center">
            <input placeholder="Key" class="key p-2 border rounded w-full md:w-1/3" value="${key}">
            <input placeholder="Value" class="value p-2 border rounded w-full md:w-1/3" value="${value}">
            <div class="flex gap-2 mt-2 md:mt-0">
                <button onclick="saveSingleVariable('${rowId}')" class="bg-green-500 text-white px-4 py-2 rounded text-sm w-full md:w-auto">Save</button>
                <button onclick="deleteVariable('${rowId}')" class="bg-red-500 text-white px-4 py-2 rounded text-sm w-full md:w-auto">Delete</button>
            </div>
        </div>
    `;
    container.appendChild(div);
}

function saveSingleVariable(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const key = row.querySelector(".key").value.trim();
    const value = row.querySelector(".value").value.trim();
    if (!key) return alert("Key is required!");

    const saved = JSON.parse(localStorage.getItem(VARIABLES_KEY) || "{}");
    saved[key] = value;
    localStorage.setItem(VARIABLES_KEY, JSON.stringify(saved));

    alert(`Variable "${key}" saved!`);
}

function deleteVariable(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const key = row.querySelector(".key").value.trim();
    if (key) {
        const saved = JSON.parse(localStorage.getItem(VARIABLES_KEY) || "{}");
        if (saved[key]) {
            delete saved[key];
            localStorage.setItem(VARIABLES_KEY, JSON.stringify(saved));
        }
    }
    row.remove();
}

function loadSavedVariables() {
    const saved = JSON.parse(localStorage.getItem(VARIABLES_KEY) || "{}");
    for (const key in saved) addVariableField(key, saved[key]);
    if (!Object.keys(saved).length) addVariableField();
}

function getVariables() {
    const vars = {};
    document.querySelectorAll("#variablesContainer > div").forEach((row) => {
        const key = row.querySelector(".key").value.trim();
        const value = row.querySelector(".value").value.trim();
        if (key) vars[key] = value;
    });
    return vars;
}

function applyVariables(template, vars) {
    let results = [template];

    // Filter only variables that exist in the template
    const filteredKeys = Object.keys(vars).filter(key =>
        template.includes(`{${key}}`)
    );

    filteredKeys.forEach((key) => {
        const values = vars[key].split(",").map(v => v.trim());

        const newResults = [];

        results.forEach((msg) => {
            values.forEach((val) => {
                newResults.push(msg.replaceAll(`{${key}}`, val));
            });
        });

        results = newResults;
    });

    return results;
}

// --- GENERATE CARD ---
function generateCard() {
    const message = document.getElementById("messageInput").value.trim();
    if (!uploadedImage || !message) return alert("Image and Message are required!");

    const output = document.getElementById("output");
    output.innerHTML = "";

    const vars = getVariables();
    const finalMessages = applyVariables(message, vars);

    finalMessages.forEach((finalMessage) => {
        prepareCard(uploadedImage, finalMessage);
    });

}

function prepareCard(image, message) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;

    img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // App name watermark
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText("GreetShare", canvas.width - 10, canvas.height - 10);

        const dataUrl = canvas.toDataURL();

        const output = document.getElementById("output");
        const card = document.createElement("div");
        card.className = "bg-white p-4 rounded-xl shadow";

        card.innerHTML = `
            <img src="${dataUrl}" class="rounded mb-2">
            <p>${message}</p>
            <div class="flex gap-2 mt-2">
                <a href="${dataUrl}" download="card.png" class="flex-1 bg-green-500 text-white text-center py-1 rounded">Download</a>
                <button onclick="shareImage('${dataUrl}', \`${message}\`)" class="flex-1 bg-blue-500 text-white py-1 rounded">Share</button>
            </div>
        `;
        output.appendChild(card);
    };
}

// --- SHARE IMAGE ---
async function shareImage(dataUrl, text) {
    const file = dataURLtoFile(dataUrl, "card.png");
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
}

function dataURLtoFile(dataurl, filename) {
    const [header, base64] = dataurl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const u8arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) u8arr[i] = binary.charCodeAt(i);
    return new File([u8arr], filename, { type: mime });
}

// --- TEMPLATES ---
// --- SAVE TEMPLATE ---
function saveTemplate() {
    const templateName = document.getElementById("templateName").value.trim();
    const message = document.getElementById("messageInput").value.trim();
    if (!templateName || !message || !uploadedImage)
        return alert("Template Name, Message, and Image are required!");

    const vars = getVariables();
    const savedTemplates = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "[]");
    savedTemplates.push({ name: templateName, message, image: uploadedImage, variables: vars });
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(savedTemplates));
    loadTemplateDropdown();
}

function loadTemplateDropdown() {
    const select = document.getElementById("templateSelect");
    const templates = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "[]");
    select.innerHTML = '<option value="">Select Template</option>';
    templates.forEach((t, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = t.name;
        select.appendChild(opt);
    });
}

// --- LOAD TEMPLATE ---
function loadTemplate() {
    const index = document.getElementById("templateSelect").value;
    const templates = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "[]");
    if (!templates[index]) return;

    const t = templates[index];
    document.getElementById("messageInput").value = t.message;
    uploadedImage = t.image;

    const container = document.getElementById("variablesContainer");
    container.innerHTML = "";
    for (const key in t.variables) addVariableField(key, t.variables[key]);
}

// --- DELETE TEMPLATE ---
function deleteTemplate() {
    const select = document.getElementById("templateSelect");
    const index = select.value;
    if (!index) return alert("Please select a template to delete!");

    const templates = JSON.parse(localStorage.getItem("templates") || "[]");
    const templateName = templates[index].name;

    // Remove the selected template
    templates.splice(index, 1);
    localStorage.setItem("templates", JSON.stringify(templates));

    // Update dropdown and clear message/variables if deleted template was loaded
    loadTemplateDropdown();
    document.getElementById("messageInput").value = "";
    document.getElementById("variablesContainer").innerHTML = "";
    alert(`Template "${templateName}" deleted!`);
}

// --- INIT ---
loadTemplateDropdown();
loadSavedVariables();

// --- PWA INSTALL LOGIC ---
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
const shareBtn = document.getElementById('shareBtn');

console.log("PWA: Checking secure context...", window.isSecureContext ? "YES ✅" : "NO ❌ (PWA requires HTTPS or localhost)");
console.log("PWA: Checking service worker compatibility...", ('serviceWorker' in navigator) ? "YES ✅" : "NO ❌");

window.addEventListener('beforeinstallprompt', (e) => {
    console.log("PWA: 'beforeinstallprompt' event fired! 🚀");
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.classList.add('block', 'mx-auto', 'my-4'); // Make it block/centered
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            console.warn("PWA: No install prompt available. Make sure the 'beforeinstallprompt' event has fired.");
            return;
        }
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA: User response to the install prompt: ${outcome}`);
        // We've used the prompt, and can't use it again, throw it away
        deferredPrompt = null;
        // Hide the install button
        installBtn.classList.add('hidden');
    });
}

if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
        const shareData = {
            title: "GreetShare",
            text: "Create personalized greeting cards easily 🎉",
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData)
                .then(() => console.log("Shared successfully"))
                .catch((error) => console.log("Error sharing:", error));
        } else {
            // Fallback: copy link
            navigator.clipboard.writeText(shareData.url)
                .then(() => alert("Link copied to clipboard!"))
                .catch(() => alert("Failed to copy link"));
        }
    });
}

window.addEventListener('appinstalled', (event) => {
    console.log('PWA: 👍', 'App has been installed locally.');
    // Clear the deferredPrompt so it can be garbage collected
    deferredPrompt = null;
    if (installBtn) installBtn.classList.add('hidden');
});

// Manual Troubleshooting: Run this in console to force show the button for layout testing
window.testInstallBtn = () => {
    console.log("PWA: Force showing the install button for UI testing...");
    if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.classList.add('block', 'mx-auto', 'my-4');
    }
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('PWA: Service Worker registered successfully ✅', reg);
                // Check if SW is controlling the page
                if (navigator.serviceWorker.controller) {
                    console.log('PWA: Page is currently being controlled by service worker.');
                }
            })
            .catch(err => console.error('PWA: Service Worker registration failed ❌', err));
    });
}