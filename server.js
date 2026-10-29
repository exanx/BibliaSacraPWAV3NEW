import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present and environment variable is unset or contains the placeholder
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = (match[2] || '').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key] || process.env[key] === 'MY_GEMINI_API_KEY') {
        process.env[key] = val;
      }
    }
  }
}

const app = express();
app.use(express.json());

// Enable CORS for cross-origin requests when hosted externally
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-api-key');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Helper function to create GoogleGenAI client with user-provided key or server fallback
function getGenAIClient(customApiKey) {
  const key = (customApiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key
  });
}

// In AI Studio / Cloud Run, Nginx binds to port 8080 and proxies requests to port 3000.
// If process.env.PORT is 8080, it is Nginx's external port, so this Node app MUST bind to port 3000.
const PORT = (process.env.PORT && process.env.PORT !== '8080') ? parseInt(process.env.PORT, 10) : 3000;

// Health check endpoints for deployment probes
app.get(['/healthz', '/_ah/health', '/health'], (req, res) => {
  res.status(200).send('OK');
});

// Endpoint to validate a user's personal Gemini API key
app.post('/api/ai/validate-key', async (req, res) => {
  try {
    const userApiKey = (req.headers['x-gemini-api-key'] || req.body.apiKey || '').trim();
    if (!userApiKey) {
      return res.status(400).json({ error: 'API key is required to validate.' });
    }
    const testAi = getGenAIClient(userApiKey);
    if (!testAi) {
      return res.status(400).json({ error: 'Invalid API key format.' });
    }

    const testModels = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    let lastErr = null;
    for (const testModel of testModels) {
      try {
        const response = await testAi.models.generateContent({
          model: testModel,
          contents: 'Respond with OK',
        });
        if (response) {
          return res.json({ success: true, message: 'Gemini API key verified successfully!' });
        }
      } catch (e) {
        lastErr = e;
        if (e?.message && e.message.includes('API_KEY_INVALID')) break;
      }
    }
    throw lastErr || new Error('No response received from Gemini.');
  } catch (err) {
    console.error('[API Key Validation Error]:', err?.message || err);
    return res.status(400).json({
      error: 'Invalid Gemini API key. Please check the key in Google AI Studio and try again.',
      details: err?.message
    });
  }
});

// Server-side fast cache for query results
const serverQueryCache = new Map();

// AI Bible Verse Semantic Search Endpoint
app.post('/api/ai/search-verses', async (req, res) => {
  try {
    const { 
      query, 
      translation = 'Catholic Public Domain Version',
      model: requestedModel,
      thinkingBudget: requestedBudget,
      maxOutputTokens: requestedMaxTokens
    } = req.body;
    const userApiKey = (req.headers['x-gemini-api-key'] || req.body.apiKey || '').trim();

    const ai = getGenAIClient(userApiKey);
    if (!ai) {
      return res.status(401).json({
        error: 'Gemini API key is required. Please configure your personal API key in Settings or the AI Search setup.',
        needsApiKey: true
      });
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const cleanQuery = query.trim();
    const targetModel = requestedModel || 'gemini-3.1-flash-lite';
    const effectiveThinkingBudget = typeof requestedBudget === 'number' ? requestedBudget : 0;
    const effectiveMaxTokens = typeof requestedMaxTokens === 'number' ? requestedMaxTokens : 2048;

    const cacheKey = `${cleanQuery.toLowerCase()}_${translation.toLowerCase()}_${targetModel}_${effectiveThinkingBudget}`;

    // Return instant cached response if available
    if (serverQueryCache.has(cacheKey)) {
      console.log(`[AI Search] Serving cached verses for query: "${cleanQuery}"`);
      return res.json(serverQueryCache.get(cacheKey));
    }

    const prompt = `User search subject / question: "${cleanQuery}".
Requested Bible translation: ${translation}.
Find 4 to 8 of the most relevant, direct, and spiritually profound Bible verses from the 73 books of the Catholic Bible canon that address this subject.`;

    const systemInstruction = `You are an expert Catholic scripture search engine and biblical theologian.
Your task is to search the 73 books of the Catholic Bible (including the Deuterocanonical books: Tobit, Judith, 1 & 2 Maccabees, Wisdom, Sirach, Baruch) and find verses directly addressing the user's natural language subject or question (such as "jesus on the eucharist", "Jesus naming Peter the rock", "Jesus being opposed by people", "charity and love", "psalms of sorrow").

For each verse:
1. book: Must be the canonical Catholic Bible book name in English (e.g. "Genesis", "Exodus", "Matthew", "John", "Romans", "1 Peter", "Wisdom", "Sirach", "Psalms", etc.).
2. chapter: Integer chapter number.
3. verse: Integer starting verse number.
4. verseEnd: Integer ending verse number if a range (e.g. 58 for John 6:51-58), or same as verse if single.
5. reference: Standard citation string (e.g. "John 6:51-58" or "Matthew 16:18-19").
6. text: The actual verse text in the requested Catholic translation (CPDV / Douay-Rheims).
7. explanation: 1-2 clear, insightful sentences explaining specifically why and how this scripture connects with the user's query.
8. testament: "Old Testament" or "New Testament".

Also provide a concise 1-2 sentence overarching biblical summary of what Catholic Scripture teaches on this topic.`;

    const schemaConfig = {
      systemInstruction,
      temperature: 0.2,
      maxOutputTokens: effectiveMaxTokens,
      thinkingConfig: { thinkingBudget: effectiveThinkingBudget },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'A concise 1-2 sentence summary of what Scripture teaches regarding this subject.'
          },
          verses: {
            type: Type.ARRAY,
            description: 'List of relevant Catholic Bible verses matching the subject.',
            items: {
              type: Type.OBJECT,
              properties: {
                book: { type: Type.STRING, description: 'Canonical Catholic Bible book name, e.g. John, Matthew, Genesis, Wisdom' },
                chapter: { type: Type.INTEGER, description: 'Chapter number' },
                verse: { type: Type.INTEGER, description: 'Starting verse number' },
                verseEnd: { type: Type.INTEGER, description: 'Ending verse number if a range' },
                reference: { type: Type.STRING, description: 'Standard citation like Matthew 16:18' },
                text: { type: Type.STRING, description: 'The scripture verse text' },
                explanation: { type: Type.STRING, description: 'Why this verse is relevant to the topic' },
                testament: { type: Type.STRING, description: 'Old Testament or New Testament' }
              },
              required: ['book', 'chapter', 'verse', 'reference', 'text', 'explanation']
            }
          }
        },
        required: ['summary', 'verses']
      }
    };

    // Prioritize user's requested model, with fast fallback list
    const candidateModels = [
      targetModel,
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-flash-latest'
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);
    let lastError = null;
    let responseText = null;

    for (const model of candidateModels) {
      try {
        console.log(`[AI Search] Attempting model ${model} for query: "${cleanQuery}"`);
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: schemaConfig
        });
        if (response && response.text) {
          responseText = response.text.trim();
          console.log(`[AI Search] Successfully generated verses with model: ${model}`);
          break;
        }
      } catch (err) {
        console.warn(`Model ${model} search failed, attempting next if available:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('No response from AI model');
    }

    const parsed = JSON.parse(responseText);
    serverQueryCache.set(cacheKey, parsed);
    // Limit cache to 100 entries
    if (serverQueryCache.size > 100) {
      const oldestKey = serverQueryCache.keys().next().value;
      serverQueryCache.delete(oldestKey);
    }
    return res.json(parsed);
  } catch (error) {
    console.error('AI verse search error:', error);
    return res.status(500).json({
      error: 'Failed to search verses via AI. Please try again.',
      details: error.message
    });
  }
});

// Serve static assets from project root (allowing dotfiles for .well-known/assetlinks.json)
app.use(express.static(__dirname, { dotfiles: 'allow' }));

// Single Page Application fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && PORT !== 3000) {
    console.warn(`Port ${PORT} is in use, falling back to port 3000`);
    app.listen(3000, '0.0.0.0');
  } else {
    console.error('Server error:', err);
  }
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
