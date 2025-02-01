from flask import Flask, render_template, request, jsonify
import speech_recognition as sr
from gtts import gTTS
import os
from flask import url_for
from datetime import datetime
from translate import Translator
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import logging
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Database configuration 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///speech.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False 
db = SQLAlchemy(app)
@app.before_first_request
def initialize_database():
    db.create_all() # Create the database tables

    # Define a model for storing speech recognition results
class SpeechRecognitionResult(db.Model):
    id = db.Column(db.Integer, primary_key=True) 
    text = db.Column(db.String(500), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Create the database and tables
with app.app_context():
    db.create_all()

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
# Speech recognition function
    
def recognize_speech(language='en'):
    recognizer = sr.Recognizer()
    
    try:
        with sr.Microphone() as source:
            logger.info("Adjusting for ambient noise...")
            recognizer.adjust_for_ambient_noise(source)  # Adjust for background noise
            print("Speak now...")
            logger.info("Listening for speech...")
            audio = recognizer.listen(source, timeout=20, phrase_time_limit=200)  # Add time limits
            logger.info(f"Recognizing speech in {language}...")
            text = recognizer.recognize_google(audio, language=language)

            # Store the result in the database 
            result = SpeechRecognitionResult(text=text) 
            db.session.add(result)
            db.session.commit()
            
        return {"success": True, "text": text}
    except sr.UnknownValueError:
        logger.error("Could not understand audio")
        return {"success": False, "error": "Speech not recognized."}
    except sr.RequestError as e:
        logger.error(f"Could not request results; {e}")
        return {"success": False, "error": f"Network error: {e}"}
    except Exception as e:
        logger.exception("Unexpected error during speech recognition")
        return {"success": False, "error": f"An error occurred: {e}"}
   

# Route for the homepage
@app.route('/')
def home():
    return render_template('Speech.html')
# API to process speech recognition
@app.route('/recognize', methods=['POST'])
def recognize():
    data = request.json
    language = data.get('language', 'en')
    response = recognize_speech(language)
    return jsonify(response)
# API to translate text
@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    text = data.get('text', '')
    target_language = data.get('target_language', 'en')
    try:
        translator = Translator()
        translated_text = translator.translate(text, target_language)
        return jsonify({"success": True, "translated_text": translated_text})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
# save speech recognition result to the database 
@app.route('/results')
def results():
    results = SpeechRecognitionResult.query.all()
    return render_template('results.html', results=results)

# Save speech to a file 
@app.route('/save', methods=['POST'])
def save():
    data = request.json
    text = data.get('text', '')
    filename = data.get('filename', 'speech.mp3')
    try:
        tts = gTTS(text=text, lang='en')
        tts.save(filename)
        return jsonify({"success": True, "filename": filename})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
        
if __name__ == '__main__':
    app.run(host="127.0.0.1", port=54132, debug=True)
