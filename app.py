import os
from flask import Flask, request, jsonify, send_from_directory
from google import genai
from google.genai import types
import PyPDF2

app = Flask(__name__, static_url_path='', static_folder='.', template_folder='.')

# Global store for the PDF text (simple RAG context)
current_pdf_context = ""
current_pdf_filename = ""

# Initialize Google GenAI Client
# NOTE: In a production app, the API key should be an environment variable.
API_KEY = "AIzaSyDUx-go0CnN2vrrJcqqCTJr4O2yt2HaIUk"
client = genai.Client(api_key=API_KEY)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/upload', methods=['POST'])
def upload_pdf():
    global current_pdf_context
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and file.filename.endswith('.pdf'):
        try:
            reader = PyPDF2.PdfReader(file)
            extracted_text = ""
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
            
            # Save the extracted text into our global context
            current_pdf_context = extracted_text.strip()
            current_pdf_filename = file.filename
            return jsonify({"message": "File processed successfully", "filename": file.filename})
        except Exception as e:
            return jsonify({"error": f"Failed to read PDF: {str(e)}"}), 500
    else:
        return jsonify({"error": "File must be a PDF"}), 400

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    if not data or 'message' not in data:
        return jsonify({"error": "No message provided"}), 400
    
    user_message = data['message']
    
    try:
        global current_pdf_context
        
        # Simple RAG: Prepend context if a PDF is loaded
        prompt = user_message
        if current_pdf_context:
            prompt = f"Context Material (from {current_pdf_filename}):\n{current_pdf_context}\n\nUser Question:\n{user_message}"
            
        # Try models available in this environment (April 2026)
        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
        last_error = None
        
        for model_id in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_id,
                    contents=prompt,
                )
                return jsonify({"response": response.text})
            except Exception as e:
                last_error = str(e)
                print(f"Model {model_id} failed: {last_error}")
                continue
                
        return jsonify({"error": f"All models failed. Last error: {last_error}"}), 500
        
    except Exception as e:
        print(f"Error calling Gemini API: {str(e)}")
        return jsonify({"error": f"Failed to generate response: {str(e)}"}), 500

@app.route('/api/clear', methods=['POST'])
def clear_context():
    global current_pdf_context, current_pdf_filename
    current_pdf_context = ""
    current_pdf_filename = ""
    return jsonify({"message": "Context cleared"})

if __name__ == '__main__':
    # Running on 5001 to avoid conflicts with 5000 which may be occupied
    app.run(host='0.0.0.0', port=5001, debug=True)
