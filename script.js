// Select DOM elements
const startRecognitionButton = document.getElementById('startRecognition');
const translateButton = document.getElementById('translateText');
const playSpeechButton = document.getElementById('playSpeech');
const saveTextButton = document.getElementById('saveText');
const languageSelect = document.getElementById('language');
const genderSelect = document.getElementById('gender');
const recognizedTextArea = document.getElementById('recognizedText');
const translatedTextArea = document.getElementById('translatedText');
const saveSpeechButton = document.getElementById('saveSpeech');

// Translation should be handled server-side to protect API keys
async function translateText(text, targetLanguage) {
    try {
        const response = await fetch('http://localhost:5000/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                target: targetLanguage
            })
        });
        const data = await response.json();
        return data.translatedText;
    } catch (error) {
        throw new Error('Translation failed: ' + error.message);
    }
}
// Speech recognition setup
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en'; // Default language
recognition.interimResults = false;
let recognizedText = '';
let translatedText = '';

// Start speech recognition
startRecognitionButton.addEventListener('click', () => {
    recognition.lang = languageSelect.value;
    recognition.start();
});

recognition.onresult = (event) => {
    recognizedText = event.results[0][0].transcript;
    recognizedTextArea.value = recognizedText;
};

//recognition.onerror = (event) => {
   // alert('Error recognizing speech: ' + event.error);
//};
recognition.onerror = (event) => {
    // Basic error handling should be more informative and user-friendly
    console.error('Speech Recognition Error:', event);
    const errorMessages = {
        'network': 'Network error occurred. Please check your connection.',
        'no-speech': 'No speech detected. Please try again.',
        'not-allowed': 'Microphone permission denied. Please allow microphone access.',
        'aborted': 'Speech recognition was aborted'
    };
    alert(errorMessages[event.error] || `Error occurred: ${event.error}`);
};

translateButton.addEventListener('click', async () => {
    const targetLanguage = languageSelect.value;
    try {
        translatedText = await translateText(recognizedText, targetLanguage);
        translatedTextArea.value = translatedText;
    } catch (error) {
        alert('Error translating text: ' + error.message);
    }
});
   
// Play speech using Web Speech API
playSpeechButton.addEventListener('click', () => {
    const speech = new SpeechSynthesisUtterance(translatedText || recognizedText);
    speech.lang = languageSelect.value;
    speech.voice = speechSynthesis.getVoices().find(voice =>
        genderSelect.value === 'female' ? voice.name.includes('Female') : voice.name.includes('Male')
    );
    speechSynthesis.speak(speech);
});

// Save recognized text to file
saveTextButton.addEventListener('click', () => {
    const textToSave = translatedText || recognizedText;
    const blob = new Blob([textToSave], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'recognized_text.txt';
    link.click();
});

// save speech recognition data to the server
saveSpeechButton.addEventListener('click', async () => {
    if (!recognizedText?.trim()) {
        alert('No text to save. Please record some speech first.');
        return;
    }

    try {
        const response = await fetch('/save-speech', {
            method: 'POST',
headers: { 
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCSRFToken() || '',
    'Authorization': 'Bearer ' + (window.apiKey || '')
},
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        alert('Speech data saved successfully!');
    } catch (error) {
        console.error('Error saving speech data:', error);
        alert('Failed to save speech data. Please try again.');
    }
});

function getCSRFToken() {
    const tokenMeta = document.querySelector('meta[name="csrf-token"]');
    if (!tokenMeta) {
        console.error('CSRF token meta tag not found');
        return null;
    }
    return tokenMeta.content;
}