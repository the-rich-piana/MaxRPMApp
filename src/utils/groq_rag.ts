import {ChatGroq} from '@langchain/groq';
// import axios from 'axios';
import {NeonPostgres} from '@langchain/community/vectorstores/neon';
import {OpenAIEmbeddings} from '@langchain/openai';
import loadVectorStore from './nextVectorStore';
import {GROQ_API_KEY, OPENAI_API_KEY, POSTGRES_URL} from '@env';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function sendGroqMessage(
  message: string,
  chatHistory: Message[] | null,
) {
  try {
    // Initialize embeddings and vector store
    const embeddings = new OpenAIEmbeddings({
      dimensions: 512,
      model: 'text-embedding-3-small',
      openAIApiKey: OPENAI_API_KEY,
    });
    const vectorStore = await loadVectorStore();
    // const vectorStore = await NeonPostgres.initialize(embeddings, {
    //   connectionString: POSTGRES_URL,
    // });

    // Search for relevant documents
    // const retriever = vectorStore.asRetriever({
    //   k: 10,
    //   searchType: 'similarity',
    // });

    const relevantDocs = await vectorStore.similaritySearch(message, 10);
    const contextText = relevantDocs.map(doc => doc.pageContent).join('\n\n');

    const systemPrompt = `
        You are a compassionate and supportive AI designed to facilitate reminiscence therapy for individuals with dementia, Alzheimer's, or memory loss. Your goal is to engage users in meaningful, positive, and comforting conversations that encourage them to recall and share memories from their past, fostering a sense of connection, self-worth, and joy.
        
        Tone and Approach:
        - Be warm, empathetic, and patient at all times.
        - Validate emotions and celebrate even small moments of recall or engagement.
        - Use clear, concise, and friendly language, avoiding complex phrasing or technical jargon.
        - Mirror the user's language style and pace, creating a natural flow of conversation.
  
        Relevant context:
        ${contextText}`;

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.2-90b-vision-preview',
          messages: [
            {role: 'system', content: systemPrompt},
            ...(chatHistory || ''),
            {role: 'user', content: message},
          ],
          temperature: 0,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to get response from API');
  }
}
