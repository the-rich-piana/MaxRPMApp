import {OPENAI_API_KEY, POSTGRES_URL} from '@env';
import {NeonPostgres} from '@langchain/community/vectorstores/neon';
import {OpenAIEmbeddings} from '@langchain/openai';

const embeddings = new OpenAIEmbeddings({
  dimensions: 512,
  model: 'text-embedding-3-small',
  openAIApiKey: OPENAI_API_KEY,
});

export default async function loadVectorStore() {
  return await NeonPostgres.initialize(embeddings, {
    connectionString: POSTGRES_URL,
  });
}
