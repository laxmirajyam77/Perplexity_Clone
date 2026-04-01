// script.js
document.addEventListener("DOMContentLoaded", () => {
    const mainInput = document.querySelector('.main-input');
    const chatHistory = document.getElementById('chatHistory');
    const welcomeContainer = document.querySelector('.welcome-container');
    const suggestionsContainer = document.querySelector('.suggestions-container');
    const inputControls = document.querySelector('.input-controls');
    
    // Configure marked to use highlight.js or prism
    marked.setOptions({
        highlight: function(code, lang) {
            if (Prism.languages[lang]) {
                return Prism.highlight(code, Prism.languages[lang], lang);
            }
            return code;
        },
        breaks: true,
        gfm: true
    });

    if(mainInput) {
        mainInput.focus();
    }

    // Function to append message to the chat UI
    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message');
        
        if (sender === 'user') {
            msgDiv.classList.add('message-user');
            msgDiv.textContent = text;
        } else {
            msgDiv.classList.add('message-ai');
            // Use marked for high-quality markdown rendering
            msgDiv.innerHTML = marked.parse(text);
            
            // Trigger Prism highlighting for any code blocks
            msgDiv.querySelectorAll('pre code').forEach((block) => {
                Prism.highlightElement(block);
            });
        }
        
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Function to show typing indicator
    function showLoader() {
        const loaderDiv = document.createElement('div');
        loaderDiv.classList.add('loader', 'message-ai', 'message');
        loaderDiv.id = 'typingLoader';
        loaderDiv.innerHTML = `
            <div class="loader-dot"></div>
            <div class="loader-dot"></div>
            <div class="loader-dot"></div>
        `;
        chatHistory.appendChild(loaderDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Function to remove typing indicator
    function removeLoader() {
        const loader = document.getElementById('typingLoader');
        if (loader) {
            loader.remove();
        }
    }

    // Main function to handle sending a message
    async function sendMessage(text) {
        if (!text) return;

        // Hide welcome and suggestions on first message
        if (!chatHistory.classList.contains('active-chat')) {
            welcomeContainer.style.display = 'none';
            suggestionsContainer.style.display = 'none';
            chatHistory.classList.remove('hidden');
            chatHistory.classList.add('active-chat');
        }

        // Add User Message
        appendMessage(text, 'user');
        
        // Show Loader
        showLoader();

        try {
            // Send API Request to Flask backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            
            removeLoader();

            if (response.ok) {
                appendMessage(data.response, 'ai');
            } else {
                appendMessage('Sorry, an error occurred while connecting to the server: ' + (data.error || 'Unknown error'), 'ai');
            }
        } catch (error) {
            console.error('Error:', error);
            removeLoader();
            appendMessage('Failed to connect to the Seekonix backend.', 'ai');
        }
    }

    // Handle File Upload
    const uploadBtn = document.getElementById('uploadBtn');
    const pdfUpload = document.getElementById('pdfUpload');
    const fileIndicator = document.getElementById('fileIndicator');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const removeFileBtn = document.getElementById('removeFileBtn');
    
    if(uploadBtn && pdfUpload) {
        uploadBtn.addEventListener('click', () => {
            pdfUpload.click();
        });

        pdfUpload.addEventListener('change', async function() {
            if(this.files && this.files[0]) {
                const file = this.files[0];
                
                // Show uploading UI state
                fileIndicator.classList.remove('hidden');
                fileNameDisplay.textContent = 'Uploading...';
                
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if(response.ok) {
                        fileNameDisplay.textContent = file.name;
                    } else {
                        fileNameDisplay.textContent = 'Upload failed';
                        console.error(result.error);
                    }
                } catch (error) {
                    fileNameDisplay.textContent = 'Upload error';
                    console.error('Upload Error:', error);
                }
            }
        });
    }

    if(removeFileBtn) {
        removeFileBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/clear', { method: 'POST' });
                if(response.ok) {
                    fileIndicator.classList.add('hidden');
                    pdfUpload.value = ''; // clear input
                }
            } catch (error) {
                console.error('Clear Context Error:', error);
            }
        });
    }

    // New Chat Functionality
    const editBtn = document.querySelector('.edit-btn');
    if(editBtn) {
        editBtn.addEventListener('click', async () => {
            // Clear UI
            chatHistory.innerHTML = '';
            chatHistory.classList.add('hidden');
            chatHistory.classList.remove('active-chat');
            welcomeContainer.style.display = 'block';
            suggestionsContainer.style.display = 'flex';
            
            // Clear Backend Context
            try {
                await fetch('/api/clear', { method: 'POST' });
                fileIndicator.classList.add('hidden');
                pdfUpload.value = '';
            } catch(e) { console.error(e); }
            
            mainInput.value = '';
            mainInput.focus();
        });
    }

    // Send on Enter
    mainInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const val = this.value.trim();
            if(val) {
                sendMessage(val);
                this.value = ''; 
            }
        }
    });

    // Send on suggestion pill click
    const pills = document.querySelectorAll('.suggestion-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            // Simplified logic: get the text content and trim
            const final = pill.innerText.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/, '').trim(); 
            mainInput.value = final;
            mainInput.focus();
        });
    });
});
