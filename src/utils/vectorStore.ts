import AsyncStorage from '@react-native-async-storage/async-storage';
import {MMKV} from 'react-native-mmkv';
import {RecursiveCharacterTextSplitter} from 'langchain/text_splitter';

interface Document {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

interface Chunk {
  id: string;
  text: string;
  embedding: number[];
  documentId: string;
  metadata?: Record<string, any>;
}

export class MobileRAG {
  private storage = new MMKV();
  private readonly CHUNK_IDS_KEY = 'chunk_ids';
  private readonly DOC_IDS_KEY = 'doc_ids';
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor(
    private embedFn: (text: string) => Promise<number[]>,
    splitterConfig = {
      chunkSize: 500,
      chunkOverlap: 50,
      separators: ['\n\n', '\n', ' ', ''], // Default separators
    },
  ) {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: splitterConfig.chunkSize,
      chunkOverlap: splitterConfig.chunkOverlap,
      separators: splitterConfig.separators,
    });
  }

  private async addToIndex(key: string, id: string) {
    const existingIds = await this.getIds(key);
    if (!existingIds.includes(id)) {
      existingIds.push(id);
      await AsyncStorage.setItem(key, JSON.stringify(existingIds));
    }
  }

  private async getIds(key: string): Promise<string[]> {
    const ids = await AsyncStorage.getItem(key);
    return ids ? JSON.parse(ids) : [];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async addDocument(
    text: string,
    metadata?: Record<string, any>,
  ): Promise<string> {
    // Store original document
    const docId = `doc_${Date.now()}`;
    const document: Document = {id: docId, text, metadata};
    this.storage.set(docId, JSON.stringify(document));

    // Use Langchain's splitter to create chunks
    const chunks = await this.textSplitter.createDocuments([text]);

    const chunkPromises = chunks.map(async (chunk, index) => {
      const embedding = await this.embedFn(chunk.pageContent);
      const chunkData: Chunk = {
        id: `${docId}_chunk_${index}`,
        text: chunk.pageContent,
        embedding,
        documentId: docId,
        metadata: {
          ...metadata,
          ...chunk.metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      };
      this.storage.set(chunkData.id, JSON.stringify(chunkData));
      return chunkData.id;
    });

    const chunkIds = await Promise.all(chunkPromises);

    // Update indexes
    await this.addToIndex(this.DOC_IDS_KEY, docId);
    await Promise.all(
      chunkIds.map(id => this.addToIndex(this.CHUNK_IDS_KEY, id)),
    );

    return docId;
  }

  async search(query: string, limit: number = 5): Promise<Chunk[]> {
    const queryEmbedding = await this.embedFn(query);
    const chunkIds = await this.getIds(this.CHUNK_IDS_KEY);

    const chunks = await Promise.all(
      chunkIds.map(id => {
        const data = this.storage.getString(id);
        return data ? (JSON.parse(data) as Chunk) : null;
      }),
    );

    return chunks
      .filter((chunk): chunk is Chunk => chunk !== null)
      .map(chunk => ({
        ...chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => (b as any).similarity - (a as any).similarity)
      .slice(0, limit);
  }

  async getContextForQuery(
    query: string,
    maxChunks: number = 3,
  ): Promise<string> {
    const relevantChunks = await this.search(query, maxChunks);
    return relevantChunks.map(chunk => chunk.text).join('\n\n');
  }

  async getAllDocuments(): Promise<Document[]> {
    const docIds = await this.getIds(this.DOC_IDS_KEY);
    return Promise.all(
      docIds.map(id => {
        const data = this.storage.getString(id);
        return data ? (JSON.parse(data) as Document) : null;
      }),
    ).then(docs => docs.filter((doc): doc is Document => doc !== null));
  }

  async clearAll() {
    const chunkIds = await this.getIds(this.CHUNK_IDS_KEY);
    const docIds = await this.getIds(this.DOC_IDS_KEY);

    [...chunkIds, ...docIds].forEach(id => this.storage.delete(id));
    await AsyncStorage.multiRemove([this.CHUNK_IDS_KEY, this.DOC_IDS_KEY]);
  }
}
