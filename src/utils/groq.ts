import RNFS from 'react-native-fs';
import Groq from 'groq-sdk';
import {GROQ_API_KEY} from '@env';
console.log('proces');

const groq = new Groq({apiKey: GROQ_API_KEY});

export interface TranscriptionOptions {
  audioPath: string;
  prompt?: string;
  language?: string;
  temperature?: number;
}

export async function transcribeAudio({
  audioPath,
  prompt = '',
  language = 'en',
  temperature = 0.0,
}: TranscriptionOptions) {
  try {
    // Create form data
    const formData = new FormData();

    // Add the audio file
    formData.append('file', {
      uri: `file://${audioPath}`,
      type: 'audio/mp3',
      name: 'audio.mp3',
    });

    // Add other parameters
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');
    if (prompt) formData.append('prompt', prompt);
    if (language) formData.append('language', language);
    if (temperature !== undefined)
      formData.append('temperature', temperature.toString());

    // Make the API request
    const response = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          Accept: 'application/json',
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Transcription error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}
