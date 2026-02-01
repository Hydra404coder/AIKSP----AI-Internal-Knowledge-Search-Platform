/**
 * =============================================================================
 * AI SERVICE - GEMINI API INTEGRATION FOR KNOWLEDGE Q&A
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * Handles all AI-related operations using Google's Gemini API:
 * - Document summarization
 * - Question answering with citations
 * - Context-aware responses
 * 
 * WHAT IS RAG (Retrieval Augmented Generation)?
 * RAG is a technique that combines:
 * 1. RETRIEVAL: Find relevant documents/chunks
 * 2. AUGMENTATION: Add retrieved content to AI prompt
 * 3. GENERATION: AI generates answer based on provided context
 * 
 * WHY RAG?
 * - AI only uses YOUR documents (no hallucinations from internet)
 * - Answers have citations (users can verify)
 * - Works with private/internal knowledge
 * - Cost-effective (only send relevant chunks, not entire docs)
 * 
 * RAG FLOW IN THIS SYSTEM:
 * 1. User asks: "What is the vacation policy?"
 * 2. We search for documents about vacation
 * 3. We find chunks mentioning vacation policy
 * 4. We send those chunks + question to Gemini
 * 5. Gemini generates answer based on chunks
 * 6. We return answer + citations (which chunks were used)
 * 
 * PROMPT ENGINEERING:
 * The prompts are carefully designed to:
 * - Prevent hallucinations
 * - Force citations
 * - Keep answers focused
 * - Handle "I don't know" cases
 * 
 * =============================================================================
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Document, QueryLog } = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

// Initialize Gemini client
// This is done once when the module loads
let genAI;
let model;

const getGeminiApiKey = () => {
  const apiKeyRaw = process.env.GEMINI_API_KEY;
  const apiKey = apiKeyRaw ? apiKeyRaw.trim() : '';

  if (!apiKey) {
    throw new AppError('Gemini API key is not configured.', 500);
  }

  if (apiKeyRaw && apiKeyRaw !== apiKey) {
    logger.warn('GEMINI_API_KEY contains leading/trailing whitespace. It was trimmed.');
  }

  return apiKey;
};

const getGeminiModelName = () => {
  const modelNameRaw = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const modelName = modelNameRaw.trim();

  if (modelNameRaw !== modelName) {
    logger.warn('GEMINI_MODEL contains leading/trailing whitespace. It was trimmed.');
  }

  return modelName;
};

/**
 * callGemini()
 * 
 * REST call to Gemini API (v1beta) to match AI Studio curl behavior.
 */
const callGemini = async (prompt, options = {}) => {
  const apiKey = getGeminiApiKey();
  const primaryModel = (options.modelName || getGeminiModelName()).trim();

  // Try primary model first, then fall back to lighter models to avoid zero-quota errors
  const fallbackModels = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash',
  ];

  const modelsToTry = Array.from(new Set([primaryModel, ...fallbackModels]));
  let lastError;

  for (const modelName of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    logger.debug('Calling Gemini API', { model: modelName, promptLength: prompt.length });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`[Gemini REST Error]: ${response.status} ${response.statusText} - ${errorText}`);
        error.status = response.status;
        error.model = modelName;
        throw error;
      }

      const data = await response.json();

      // Check for blocked or empty responses
      if (!data.candidates || data.candidates.length === 0) {
        const error = new Error(`Gemini API returned no candidates for ${modelName}. The response may have been blocked or the model is unavailable.`);
        error.status = 500;
        error.model = modelName;
        throw error;
      }

      // Check for safety filters or other issues
      const candidate = data.candidates[0];
      if (candidate.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
        const error = new Error(`Gemini candidate finished with reason: ${candidate.finishReason}`);
        error.status = 500;
        error.model = modelName;
        throw error;
      }

      const text = candidate.content?.parts?.map((part) => part.text)?.join('') || '';
      return { text, modelUsed: modelName };
    } catch (err) {
      lastError = err;

      // If quota exhausted or model missing, try next fallback before failing
      if (
        err.status === 429 ||
        err.status === 404 ||
        (err.message && (err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('NOT_FOUND')))
      ) {
        logger.warn('Gemini model quota exhausted; trying fallback', {
          model: modelName,
          status: err.status,
          message: err.message?.substring(0, 200),
        });
        continue;
      }

      // Non-quota errors: rethrow immediately
      throw err;
    }
  }

  // If all models failed, throw last error
  throw lastError || new Error('Gemini API call failed for all models');
};

/**
 * initializeGemini()
 * 
 * WHAT: Initializes the Gemini API client
 * 
 * WHY LAZY INITIALIZATION?
 * - API key might not be set during testing
 * - Avoids errors on startup if key is missing
 * - Allows dynamic configuration
 * 
 * CALLED BY: All AI functions before making API calls
 */
const initializeGemini = () => {
  if (!genAI) {
    const apiKey = getGeminiApiKey();
    const modelName = getGeminiModelName();
    
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: modelName });
  }
  
  return model;
};

/**
 * SYSTEM PROMPTS
 * 
 * These define how the AI should behave.
 * Carefully crafted to prevent hallucinations and ensure citations.
 */

/**
 * QA_SYSTEM_PROMPT
 * 
 * This prompt tells Gemini how to answer questions.
 * 
 * KEY RULES:
 * 1. ONLY use information from provided context
 * 2. ALWAYS cite sources
 * 3. Say "I don't know" if answer isn't in context
 * 4. Don't make up information
 */
const QA_SYSTEM_PROMPT = `You are an AI assistant for an internal company knowledge base.
Your role is to answer questions ONLY based on the provided document excerpts.

CRITICAL RULES:
1. ONLY use information from the provided "CONTEXT" sections below
2. If the answer is NOT in the context, say "I couldn't find information about this in the available documents."
3. NEVER make up information or use external knowledge
4. ALWAYS cite your sources using the document titles provided
5. Be concise and professional

When citing sources, use this format:
[Source: Document Title]

If multiple documents contain relevant information, cite all of them.
If the question is unclear, ask for clarification.`;

/**
 * SUMMARY_SYSTEM_PROMPT
 * 
 * This prompt tells Gemini how to summarize documents.
 */
const SUMMARY_SYSTEM_PROMPT = `You are an AI assistant that creates concise summaries of documents.

RULES:
1. Create a 2-3 sentence summary of the document
2. Focus on the main topics and key information
3. Use professional, clear language
4. Do not add information not present in the document`;

/**
 * buildContextPrompt()
 * 
 * WHAT: Builds the context section of the prompt
 * 
 * Takes relevant document chunks and formats them for the AI.
 * 
 * FORMAT:
 * --- CONTEXT START ---
 * [Document: Policy Handbook]
 * ...chunk text...
 * 
 * [Document: HR Guidelines]
 * ...chunk text...
 * --- CONTEXT END ---
 * 
 * CALLED BY: answerQuestion()
 * INPUT: Array of chunk objects
 * OUTPUT: Formatted context string
 */
const buildContextPrompt = (chunks, options = {}) => {
  if (!chunks || chunks.length === 0) {
    return '--- NO RELEVANT DOCUMENTS FOUND ---';
  }

  const maxChunks = options.maxChunks || chunks.length;
  const maxChars = options.maxChars || 400;

  let context = '--- CONTEXT START ---\n\n';

  for (const chunk of chunks.slice(0, maxChunks)) {
    context += `[Document: ${chunk.documentTitle}]\n`;
    context += `${chunk.text.substring(0, maxChars)}${chunk.text.length > maxChars ? '...' : ''}\n\n`;
  }

  context += '--- CONTEXT END ---';

  return context;
};

/**
 * generateDocumentConnections()
 * 
 * WHAT: Generates connections between documents for mindmap visualization
 * 
 * HOW: Documents are connected if they share:
 * - Common tags
 * - Same category
 * - Similar keywords in their titles
 * 
 * OUTPUT: Array of { source, target, strength, reason }
 */
const generateDocumentConnections = (documents) => {
  const connections = [];
  
  for (let i = 0; i < documents.length; i++) {
    for (let j = i + 1; j < documents.length; j++) {
      const doc1 = documents[i];
      const doc2 = documents[j];
      
      // Check for shared tags
      const sharedTags = (doc1.tags || []).filter(tag => 
        (doc2.tags || []).includes(tag)
      );
      
      if (sharedTags.length > 0) {
        connections.push({
          source: doc1.id,
          target: doc2.id,
          strength: Math.min(1, sharedTags.length * 0.3),
          reason: `Shared tags: ${sharedTags.join(', ')}`,
        });
        continue; // One connection per pair
      }
      
      // Check for same category
      if (doc1.category && doc1.category === doc2.category) {
        connections.push({
          source: doc1.id,
          target: doc2.id,
          strength: 0.5,
          reason: `Same category: ${doc1.category}`,
        });
      }
    }
  }
  
  return connections;
};

/**
 * buildAccessFilter()
 * 
 * WHAT: Creates a Mongo filter for document access based on user permissions
 */
const buildAccessFilter = ({ organizationId, userRole, userDepartment, userId }) => {
  const filter = {
    status: 'active',
  };

  if (organizationId) {
    filter.organization = organizationId;
  }

  const isAdmin = ['admin', 'super_admin', 'org_admin'].includes(userRole);
  if (isAdmin) {
    return filter;
  }

  const accessConditions = [{ accessLevel: 'public' }];
  if (userDepartment) {
    accessConditions.push({ accessLevel: 'department', department: userDepartment });
  }
  if (userId) {
    accessConditions.push({ accessLevel: 'private', uploadedBy: userId });
  }

  filter.$or = accessConditions;
  return filter;
};

/**
 * getCandidateDocuments()
 * 
 * WHAT: Returns top relevant documents for selection UI
 */
const getCandidateDocuments = async (question, { organizationId, userRole, userDepartment, userId }) => {
  const filter = buildAccessFilter({ organizationId, userRole, userDepartment, userId });
  filter.$text = { $search: question };

  const candidates = await Document.find(filter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(6)
    .select('title description category tags fileName hash');

  return candidates.map((doc) => ({
    documentId: doc._id,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    tags: doc.tags || [],
    fileName: doc.fileName,
    hash: doc.hash,
  }));
};

/**
 * buildCitationsFromChunks()
 */
const buildCitationsFromChunks = (chunks) => (
  chunks.map((chunk, index) => ({
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    documentHash: chunk.documentHash,
    documentDescription: chunk.documentDescription,
    documentTags: chunk.documentTags,
    documentCategory: chunk.documentCategory,
    chunkIndex: chunk.chunkIndex,
    excerpt: chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''),
    fileName: chunk.fileName,
    relevanceScore: 1 - (index * 0.1),
  }))
);

/**
 * extractKeywords()
 * 
 * Lightweight keyword extraction for mindmap nodes.
 */
const extractKeywords = (text, limit = 4) => {
  const stopwords = new Set([
    'the','and','for','with','that','this','from','into','over','under','about','your','you','are','was','were',
    'have','has','had','will','shall','may','can','could','would','should','not','but','also','than','then','their',
    'there','what','when','where','which','who','whom','why','how','all','any','each','few','more','most','other',
    'some','such','no','nor','too','very','is','in','on','at','of','to','by','as','an','or','if','it','its','be'
  ]);

  const counts = new Map();
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 3 && !stopwords.has(t));

  tokens.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
};

/**
 * parseJsonFromText()
 */
const parseJsonFromText = (text) => {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return null;
  }
};

/**
 * generateMindmapPlan()
 * 
 * Uses AI to select the most relevant chunks/keywords and doc links.
 */
const generateMindmapPlan = async (question, chunks) => {
  const chunkSnippets = chunks.slice(0, 12).map((chunk) => ({
    documentTitle: chunk.documentTitle,
    chunkIndex: chunk.chunkIndex,
    text: chunk.text.substring(0, 300),
  }));

  const prompt = `You are building a knowledge graph from document excerpts.
Return ONLY valid JSON with this shape:
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "chunkRefs": [
    {"documentTitle": "Title A", "chunkIndex": 0},
    {"documentTitle": "Title B", "chunkIndex": 2}
  ],
  "docLinks": [
    {"sourceTitle": "Title A", "targetTitle": "Title B", "reason": "shared term"}
  ]
}

Question: ${question}

Chunks:
${JSON.stringify(chunkSnippets, null, 2)}
`;

  const { text } = await callGemini(prompt);

  return parseJsonFromText(text);
};

/**
 * buildMindmapFromChunks()
 */
const buildMindmapFromChunks = (question, chunks, options = {}) => {
  const nodes = [];
  const links = [];

  const centerId = 'question:root';
  nodes.push({ id: centerId, type: 'question', label: question, layer: 0 });

  const documentMap = new Map();
  const chunkNodes = [];
  const keywordNodes = new Map();

  const allowedChunkKeys = new Set(
    (options.chunkRefs || []).map((ref) => `${ref.documentTitle}::${ref.chunkIndex}`)
  );

  chunks.forEach((chunk, index) => {
    const chunkKey = `${chunk.documentTitle}::${chunk.chunkIndex}`;
    if (allowedChunkKeys.size > 0 && !allowedChunkKeys.has(chunkKey)) {
      return;
    }
    const docId = chunk.documentId.toString();
    if (!documentMap.has(docId)) {
      documentMap.set(docId, {
        id: `doc:${docId}`,
        documentId: docId,
        type: 'document',
        label: chunk.documentTitle,
        hash: chunk.documentHash,
        description: chunk.documentDescription,
        tags: chunk.documentTags || [],
        category: chunk.documentCategory,
        relevance: 1 - (index * 0.05),
        excerpts: [],
      });
    }
    documentMap.get(docId).excerpts.push(
      chunk.text.substring(0, 150) + (chunk.text.length > 150 ? '...' : '')
    );

    const chunkId = `chunk:${docId}:${chunk.chunkIndex}`;
    chunkNodes.push({
      id: chunkId,
      documentId: docId,
      type: 'chunk',
      label: chunk.text.substring(0, 60) + (chunk.text.length > 60 ? '...' : ''),
      excerpt: chunk.text.substring(0, 180) + (chunk.text.length > 180 ? '...' : ''),
      layer: 2,
    });

    const keywords = options.keywords?.length
      ? options.keywords
      : extractKeywords(chunk.text, 3);
    keywords.forEach((word) => {
      if (!keywordNodes.has(word)) {
        keywordNodes.set(word, {
          id: `kw:${word}`,
          type: 'keyword',
          label: word,
          layer: 3,
          count: 1,
        });
      } else {
        keywordNodes.get(word).count += 1;
      }

      if (chunk.text.toLowerCase().includes(word.toLowerCase())) {
        links.push({ source: chunkId, target: `kw:${word}`, type: 'chunk-keyword' });
      }
    });
  });

  const documents = Array.from(documentMap.values()).map((doc, index) => ({
    ...doc,
    layer: 1,
    angle: (360 / documentMap.size) * index,
    distance: 1 - (doc.relevance * 0.3),
  }));

  const keywords = Array.from(keywordNodes.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, options.maxKeywords || 24)
    .map((kw, index, arr) => ({
      ...kw,
      angle: (360 / (arr.length || 1)) * index,
      distance: 0.9,
    }));

  nodes.push(...documents);
  nodes.push(...chunkNodes.slice(0, options.maxChunks || 16));
  nodes.push(...keywords);

  // Links: question -> documents
  documents.forEach((doc) => {
    links.push({ source: centerId, target: doc.id, type: 'question-doc' });
  });

  // Links: documents -> chunks
  chunkNodes.slice(0, options.maxChunks || 16).forEach((chunkNode) => {
    links.push({ source: `doc:${chunkNode.documentId}`, target: chunkNode.id, type: 'doc-chunk' });
  });

  // Links: document -> document (shared tags/category)
  if (options.docLinks?.length) {
    const docByTitle = new Map(documents.map((d) => [d.label, d.id]));
    options.docLinks.forEach((link) => {
      const sourceId = docByTitle.get(link.sourceTitle);
      const targetId = docByTitle.get(link.targetTitle);
      if (sourceId && targetId) {
        links.push({
          source: sourceId,
          target: targetId,
          type: 'doc-doc',
          strength: 0.6,
          reason: link.reason,
        });
      }
    });
  } else {
    const docConnections = generateDocumentConnections(documents.map((d) => ({
      id: d.id,
      tags: d.tags,
      category: d.category,
    })));
    docConnections.forEach((conn) => links.push({
      source: conn.source,
      target: conn.target,
      type: 'doc-doc',
      strength: conn.strength,
      reason: conn.reason,
    }));
  }

  return {
    nodes,
    links,
  };
};

/**
 * answerQuestion()
 * 
 * WHAT: Answers a user question using RAG (Retrieval Augmented Generation)
 * 
 * ORGANIZATION SCOPING:
 * Only searches for relevant chunks within the user's organization.
 * This ensures data isolation between organizations.
 * 
 * FLOW:
 * 1. Validate input
 * 2. Search for relevant document chunks (org-scoped)
 * 3. If no chunks found, return informative response
 * 4. Build prompt with context
 * 5. Call Gemini API
 * 6. Extract citations
 * 7. Log the query
 * 8. Return answer with citations
 * 
 * ERROR HANDLING:
 * - Returns user-friendly error messages
 * - Logs detailed errors for debugging
 * - Gracefully handles Gemini API errors (rate limits, etc)
 * 
 * CALLED BY: SearchController.askQuestion()
 * INPUT: question, userId, userDepartment, userRole, organizationId
 * OUTPUT: { answer, citations, queryId }
 */
const answerQuestion = async (question, userId, userDepartment, userRole, organizationId) => {
  const startTime = Date.now();

  try {
    // Input validation
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new AppError('Question cannot be empty.', 400);
    }

    if (!organizationId) {
      throw new AppError('Organization context is required.', 400);
    }

    // Validate Gemini API key
    try {
      getGeminiApiKey();
    } catch (initError) {
      const candidates = await getCandidateDocuments(question, {
        organizationId,
        userRole,
        userDepartment,
        userId,
      });

      return {
        mode: 'select_documents',
        message: 'AI service is unavailable. Select 1-2 documents to answer from specific sources.',
        candidates,
      };
    }

    // Step 1: Find relevant chunks - scoped to organization and filtered by permissions
    logger.debug('Searching for relevant chunks with permission filtering', {
      question: question.substring(0, 100),
      organization: organizationId,
      userRole: userRole,
      department: userDepartment,
    });

    let chunks = [];
    try {
      chunks = await Document.findRelevantChunks(question, {
        department: userDepartment,
        organization: organizationId, // Organization scoping
        userId: userId, // For private document access
        userRole: userRole, // For permission-based filtering
        limit: 5, // Reduced to save tokens
      });
    } catch (searchError) {
      logger.warn('Failed to find relevant chunks', {
        error: searchError.message,
        organization: organizationId,
      });
      // Continue with empty chunks - Gemini will indicate no information available
    }

    logger.debug('Found relevant chunks after permission filtering', {
      question: question.substring(0, 100),
      chunkCount: chunks.length,
      organization: organizationId,
      userRole: userRole,
    });

    // Step 2: Build the prompt
    const contextPrompt = buildContextPrompt(chunks, { maxChunks: 3, maxChars: 300 });

    const fullPrompt = `${QA_SYSTEM_PROMPT}

${contextPrompt}

QUESTION: ${question}

ANSWER:`;

    logger.debug('Generated prompt', {
      promptLength: fullPrompt.length,
      chunkCount: chunks.length,
    });

    // Step 3: Call Gemini API with error handling
    let answer;
    let aiModelUsed;
    try {
      const result = await callGemini(fullPrompt);
      answer = result.text;
      aiModelUsed = result.modelUsed;

      if (!answer || answer.trim().length === 0) {
        throw new AppError('Gemini API returned an empty response.', 500);
      }
    } catch (geminiError) {
      logger.error('Gemini API error', {
        error: geminiError.message,
        code: geminiError.code,
        status: geminiError.status,
      });

      const message = geminiError.message || '';
      if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
        const candidates = await getCandidateDocuments(question, {
          organizationId,
          userRole,
          userDepartment,
          userId,
        });

        return {
          mode: 'select_documents',
          message: 'AI service is unavailable. Select 1-2 documents to answer from specific sources.',
          candidates,
        };
      }

      // Handle specific Gemini API errors with extractive fallback
      if (geminiError.status === 429 || message.includes('429') || geminiError.status === 404 || message.includes('NOT_FOUND')) {
        const responseTime = Date.now() - startTime;
        const citations = buildCitationsFromChunks(chunks);
        const mindmap = buildMindmapFromChunks(question, chunks, { maxChunks: 10, maxKeywords: 16 });

        const grouped = chunks.reduce((acc, chunk) => {
          acc[chunk.documentTitle] = acc[chunk.documentTitle] || [];
          acc[chunk.documentTitle].push(chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''));
          return acc;
        }, {});

        const excerpts = Object.entries(grouped)
          .map(([title, texts]) => `• ${title}: "${texts[0]}"`)
          .join('\n');

        const fallbackAnswer = excerpts
          ? `Here are the most relevant excerpts from your documents:\n\n${excerpts}`
          : "I couldn't find information about this in the available documents.";

        let queryLog;
        try {
          queryLog = await QueryLog.logQuery({
            query: question,
            queryType: 'question',
            user: userId,
            userDepartment,
            userRole,
            organization: organizationId,
            response: fallbackAnswer,
            citedDocuments: citations,
            resultCount: chunks.length,
            responseTime,
            aiModel: aiModelUsed || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
            status: 'success',
          });
        } catch (logError) {
          logger.warn('Failed to log query', { error: logError.message });
        }

        return {
          answer: fallbackAnswer,
          citations,
          mindmap,
          queryId: queryLog?._id,
          responseTime,
        };
      }

      if (geminiError.status === 403 || message.includes('403')) {
        throw new AppError('The AI service is not available. Please check your API key configuration.', 403);
      }

      if (geminiError.status === 500 || message.includes('500')) {
        throw new AppError('The AI service encountered an error. Please try again.', 500);
      }

      throw new AppError(`Failed to generate answer: ${geminiError.message}`, 500);
    }

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Step 4: Extract citations from chunks used with enriched data for mindmap
    const citations = buildCitationsFromChunks(chunks);

    // Step 4.5: Build AI-guided mindmap data for visualization
    let mindmapPlan = null;
    if (process.env.GEMINI_MINDMAP_PLAN === 'true') {
      try {
        mindmapPlan = await generateMindmapPlan(question, chunks);
      } catch (planError) {
        logger.warn('Failed to generate AI mindmap plan; using heuristic', {
          error: planError.message,
        });
      }
    }

    const mindmap = mindmapPlan
      ? buildMindmapFromChunks(question, chunks, {
          keywords: mindmapPlan.keywords || [],
          chunkRefs: mindmapPlan.chunkRefs || [],
          docLinks: mindmapPlan.docLinks || [],
          maxChunks: 10,
          maxKeywords: 16,
        })
      : buildMindmapFromChunks(question, chunks, { maxChunks: 10, maxKeywords: 16 });

    // Step 5: Log the query (include organization for analytics)
    let queryLog;
    try {
      queryLog = await QueryLog.logQuery({
        query: question,
        queryType: 'question',
        user: userId,
        userDepartment,
        userRole,
        organization: organizationId,
        response: answer,
        citedDocuments: citations,
        resultCount: chunks.length,
        responseTime,
        aiModel: aiModelUsed || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        status: 'success',
      });
    } catch (logError) {
      logger.warn('Failed to log query', {
        error: logError.message,
      });
      // Don't fail the response if logging fails
    }

    logger.info('AI question answered successfully', {
      queryId: queryLog?._id,
      responseTime,
      citationCount: citations.length,
      mindmapNodeCount: mindmap?.nodes?.length ?? mindmap?.documentNodes?.length ?? 0,
      organization: organizationId,
      questionLength: question.length,
    });

    // Step 6: Return response with mindmap data
    return {
      answer,
      citations,
      mindmap,
      queryId: queryLog?._id,
      responseTime,
    };

  } catch (error) {
    logger.error('AI question answering failed', {
      error: error.message,
      errorCode: error.statusCode,
      organization: organizationId,
    });

    // Log the failed query
    try {
      await QueryLog.logQuery({
        query: question,
        queryType: 'question',
        user: userId,
        userDepartment,
        userRole,
        organization: organizationId,
        responseTime: Date.now() - startTime,
        status: 'error',
        errorMessage: error.message,
      });
    } catch (logError) {
      logger.warn('Failed to log failed query', {
        error: logError.message,
      });
    }

    // Re-throw with proper error handling
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Failed to generate answer. Please try again.', 500);
  }
};

/**
 * answerQuestionWithSelectedDocuments()
 * 
 * WHAT: Answers a question using only user-selected documents
 * 
 * This supports a fallback flow when the AI service is unavailable.
 */
const answerQuestionWithSelectedDocuments = async (
  question,
  selectedDocumentIds,
  userId,
  userDepartment,
  userRole,
  organizationId
) => {
  const startTime = Date.now();

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    throw new AppError('Question cannot be empty.', 400);
  }

  if (!organizationId) {
    throw new AppError('Organization context is required.', 400);
  }

  if (!Array.isArray(selectedDocumentIds) || selectedDocumentIds.length === 0) {
    throw new AppError('Please select at least one document.', 400);
  }

  const accessFilter = buildAccessFilter({
    organizationId,
    userRole,
    userDepartment,
    userId,
  });
  accessFilter._id = { $in: selectedDocumentIds };

  const documents = await Document.find(accessFilter)
    .select('title chunks fileName description tags category hash content');

  if (!documents.length) {
    return {
      answer: 'No accessible documents were found for your selection.',
      citations: [],
      mindmap: { centerNode: { type: 'question', text: question }, documentNodes: [], connections: [] },
      responseTime: Date.now() - startTime,
    };
  }

  // Build chunks from selected documents
  const chunks = [];
  documents.forEach((doc) => {
    if (doc.chunks && doc.chunks.length > 0) {
      doc.chunks.slice(0, 3).forEach((chunk) => {
        chunks.push({
          text: chunk.text,
          documentId: doc._id,
          documentTitle: doc.title,
          documentHash: doc.hash,
          documentDescription: doc.description,
          documentTags: doc.tags || [],
          documentCategory: doc.category,
          fileName: doc.fileName,
          chunkIndex: chunk.chunkIndex,
          startPage: chunk.startPage,
          endPage: chunk.endPage,
        });
      });
    } else if (doc.content) {
      chunks.push({
        text: doc.content.substring(0, 1000),
        documentId: doc._id,
        documentTitle: doc.title,
        documentHash: doc.hash,
        documentDescription: doc.description,
        documentTags: doc.tags || [],
        documentCategory: doc.category,
        fileName: doc.fileName,
        chunkIndex: 0,
        startPage: null,
        endPage: null,
      });
    }
  });

  const contextPrompt = buildContextPrompt(chunks, { maxChunks: 4, maxChars: 350 });
  const fullPrompt = `${QA_SYSTEM_PROMPT}

${contextPrompt}

QUESTION: ${question}

ANSWER:`;

  let answer;
  let aiModelUsed;

  try {
    const result = await callGemini(fullPrompt);
    answer = result.text;
    aiModelUsed = result.modelUsed;

    if (!answer || answer.trim().length === 0) {
      throw new AppError('Gemini API returned an empty response.', 500);
    }
  } catch (geminiError) {
    const grouped = chunks.reduce((acc, chunk) => {
      acc[chunk.documentTitle] = acc[chunk.documentTitle] || [];
      acc[chunk.documentTitle].push(chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''));
      return acc;
    }, {});

    const excerpts = Object.entries(grouped)
      .map(([title, texts]) => `• ${title}: "${texts[0]}"`)
      .join('\n');

    answer = `Here are the most relevant excerpts from your selected documents:\n\n${excerpts}`;
  }

  const citations = buildCitationsFromChunks(chunks);
  const mindmap = buildMindmapFromChunks(question, chunks);
  const responseTime = Date.now() - startTime;

  try {
    await QueryLog.logQuery({
      query: question,
      queryType: 'question',
      user: userId,
      userDepartment,
      userRole,
      organization: organizationId,
      response: answer,
      citedDocuments: citations,
      resultCount: chunks.length,
      responseTime,
      aiModel: aiModelUsed || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      status: 'success',
    });
  } catch (logError) {
    logger.warn('Failed to log query', { error: logError.message });
  }

  return {
    answer,
    citations,
    mindmap,
    responseTime,
  };
};

/**
 * summarizeDocument()
 * 
 * WHAT: Generates an AI summary of a document
 * 
 * CALLED BY: DocumentService.processDocument()
 * INPUT: documentContent (full text)
 * OUTPUT: Summary string
 */
const summarizeDocument = async (documentContent) => {
  try {
    getGeminiApiKey();

    // Truncate content if too long (API has token limits)
    const maxLength = 30000;
    const content = documentContent.length > maxLength
      ? documentContent.substring(0, maxLength) + '...[truncated]'
      : documentContent;

    const prompt = `${SUMMARY_SYSTEM_PROMPT}

DOCUMENT:
${content}

SUMMARY:`;

    const { text: summary } = await callGemini(prompt);

    return summary;

  } catch (error) {
    logger.error('Document summarization failed', error);
    return null; // Return null instead of throwing - summary is optional
  }
};

/**
 * generateSuggestions()
 * 
 * WHAT: Generates search suggestions based on query
 * 
 * This can be used for autocomplete or "Did you mean?" features.
 * 
 * CALLED BY: SearchController.getSuggestions()
 * INPUT: partialQuery
 * OUTPUT: Array of suggestion strings
 */
const generateSuggestions = async (partialQuery, userId, userDepartment) => {
  try {
    // For now, use simple document-based suggestions
    // In production, you might use Gemini or an embeddings model
    
    const documents = await Document.find({
      status: 'active',
      $text: { $search: partialQuery },
    })
      .limit(5)
      .select('title tags');

    // Extract unique suggestions from titles and tags
    const suggestions = new Set();

    for (const doc of documents) {
      // Add title words
      const titleWords = doc.title.toLowerCase().split(' ');
      titleWords.forEach((word) => {
        if (word.length > 3 && word.includes(partialQuery.toLowerCase())) {
          suggestions.add(word);
        }
      });

      // Add matching tags
      doc.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.add(tag);
        }
      });
    }

    return Array.from(suggestions).slice(0, 5);

  } catch (error) {
    logger.error('Suggestion generation failed', error);
    return [];
  }
};

// =============================================================================
// EXPORTS
// =============================================================================
module.exports = {
  answerQuestion,
  answerQuestionWithSelectedDocuments,
  summarizeDocument,
  generateSuggestions,
};
