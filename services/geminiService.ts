
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, RelatedPaper, UILanguage, CustomAIConfig, ModelOption, SearchResult } from "../types";

// Gemini client, built from the key the visitor binds in Settings.
// The key stays in the visitor's browser; requests go straight to the Gemini API (or to the proxy they name).
export const DEFAULT_FAST_MODEL = 'gemini-3-flash-preview';
export const DEFAULT_SMART_MODEL = 'gemini-3-pro-preview';

export interface GeminiConfig {
  apiKey: string;
  baseUrl: string; // optional; empty means https://generativelanguage.googleapis.com
  fastModel: string;
  smartModel: string;
}

export class MissingKeyError extends Error {
  constructor() {
    super('No Gemini API key bound.');
    this.name = 'MissingKeyError';
  }
}

let geminiConfig: GeminiConfig = { apiKey: '', baseUrl: '', fastModel: '', smartModel: '' };
let client: GoogleGenAI | null = null;

const makeClient = (apiKey: string, baseUrl: string) => new GoogleGenAI({
  apiKey,
  ...(baseUrl.trim() ? { httpOptions: { baseUrl: baseUrl.trim().replace(/\/+$/, '') } } : {}),
});

export const setGeminiConfig = (config: GeminiConfig) => {
  geminiConfig = { ...config, apiKey: config.apiKey.trim() };
  client = null;
};

const ai = (): GoogleGenAI => {
  if (!geminiConfig.apiKey) throw new MissingKeyError();
  if (!client) client = makeClient(geminiConfig.apiKey, geminiConfig.baseUrl);
  return client;
};

const fastModel = () => geminiConfig.fastModel || DEFAULT_FAST_MODEL;
const smartModel = () => geminiConfig.smartModel || DEFAULT_SMART_MODEL;

/**
 * Lists the Gemini models this key can call with generateContent. Doubles as the key check.
 */
export const listGeminiModels = async (apiKey: string, baseUrl: string): Promise<ModelOption[]> => {
  const pager = await makeClient(apiKey.trim(), baseUrl).models.list({ config: { pageSize: 100 } });
  const models: ModelOption[] = [];
  for await (const m of pager) {
    if (!m.name || (m.supportedActions && !m.supportedActions.includes('generateContent'))) continue;
    const id = m.name.replace(/^models\//, '');
    models.push({ id, name: m.displayName || id });
  }
  return models;
};

/**
 * Picks a default from the listed models: the preferred id if offered, else the newest
 * plain text model of that tier (skips lite / image / tts / audio / embedding variants).
 */
export const pickModel = (models: ModelOption[], tier: 'flash' | 'pro', preferred: string): string => {
  if (models.some(m => m.id === preferred)) return preferred;
  const version = (id: string) => parseFloat(id.match(/^gemini-(\d+(?:\.\d+)?)/)?.[1] || '0');
  const tierRe = new RegExp(`^gemini-\\d+(?:\\.\\d+)?-${tier}(?:-preview|-latest|$)`);
  const candidates = models
    .map(m => m.id)
    .filter(id => tierRe.test(id) && !/lite|image|tts|audio|live|embedding/.test(id))
    .sort((a, b) => version(b) - version(a) || a.length - b.length);
  return candidates[0] || models[0]?.id || preferred;
};

/**
 * Performs a comprehensive analysis of the academic text.
 */
export const analyzePaper = async (text: string, language: UILanguage = 'en'): Promise<AnalysisResult> => {
  let langInstruction = "Provide all text content in English.";
  
  if (language === 'zh') {
    langInstruction = "IMPORTANT: Provide the 'summary', 'definitions' content, 'explanation' in difficulty, and 'relation' labels in Simplified Chinese.";
  } else if (language === 'ko') {
    langInstruction = "IMPORTANT: Provide the 'summary', 'definitions' content, 'explanation' in difficulty, and 'relation' labels in Korean.";
  } else if (language === 'ja') {
    langInstruction = "IMPORTANT: Provide the 'summary', 'definitions' content, 'explanation' in difficulty, and 'relation' labels in Japanese.";
  }

  const prompt = `
    You are an expert academic research assistant using state-of-the-art Natural Language Processing. Analyze the following academic text.
    ${langInstruction}
    
    Perform these tasks and return a strictly valid JSON object:
    1. **Summary**: A comprehensive 3-5 sentence abstractive summary.
    2. **Advanced Entity Recognition**: Perform high-precision Named Entity Recognition (NER). Extract key technical entities, resolving synonyms to their canonical form (e.g., merge "ANN" and "Artificial Neural Network"). Strictly classify them into one of these advanced categories:
       - 'Method': Generic algorithms, techniques, or protocols (e.g., Contrastive Learning, Dropout).
       - 'Model': Specific named model instances (e.g., BERT-Large, ResNet-50).
       - 'Architecture': Neural network structures or families (e.g., Transformer, CNN, RNN).
       - 'Metric': Evaluation metrics and statistical measures (e.g., F1 Score, Perplexity, p-value).
       - 'Dataset': Named datasets, corpora, or benchmarks (e.g., ImageNet, SQuAD).
       - 'Task': Downstream applications or research objectives (e.g., Named Entity Recognition, Image Captioning).
       - 'Tool': Software frameworks, libraries, or hardware (e.g., PyTorch, V100 GPU).
       - 'Organization': Universities, research labs, or companies.
       - 'Challenge': Specific problems, bottlenecks, or phenomena (e.g., Vanishing Gradient, Data Scarcity, Hallucination).
       - 'Theory': Mathematical concepts, laws, or theoretical frameworks (e.g., Bayesian Inference, Nash Equilibrium).
       
       Return the top 20 most significant entities with their count.

    3. **Definitions**: Extract explicit definitions of terms found in the text.
    4. **Keywords**: Extract top 10 keywords with a relevance score (0-100).
    5. **Difficulty**: Assess reading difficulty (0-100), assign a level (Elementary, Intermediate, Advanced, Expert), calculate avg sentence length, and explain why.
    6. **Concept Graph**: Identify key concepts and their relationships to build a knowledge graph. Return nodes (id, group 1-5 based on importance) and links (source, target, relation label). Limit to 15 key nodes and their most important connections.

    Text to analyze:
    ${text.substring(0, 30000)} 
  `;

  // Define the schema for the expected response
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      entities: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            count: { type: Type.INTEGER },
          },
        },
      },
      definitions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            definition: { type: Type.STRING },
          },
        },
      },
      keywords: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            score: { type: Type.INTEGER },
          },
        },
      },
      difficulty: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          level: { type: Type.STRING },
          avgSentenceLength: { type: Type.NUMBER },
          technicalTermDensity: { type: Type.NUMBER },
          explanation: { type: Type.STRING },
        },
      },
      conceptGraph: {
        type: Type.OBJECT,
        properties: {
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                group: { type: Type.INTEGER },
              },
            },
          },
          links: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                target: { type: Type.STRING },
                relation: { type: Type.STRING },
                value: { type: Type.INTEGER },
              },
            },
          },
        },
      },
    },
    required: ["summary", "entities", "definitions", "keywords", "difficulty", "conceptGraph"],
  };

  try {
    const response = await ai().models.generateContent({
      model: fastModel(),
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const result = JSON.parse(response.text || "{}") as AnalysisResult;

    // VALIDATION: Ensure graph consistency to prevent d3 errors
    // Filter out links that reference nodes not present in the nodes array
    if (result.conceptGraph && result.conceptGraph.nodes && result.conceptGraph.links) {
        const validNodeIds = new Set(result.conceptGraph.nodes.map(n => n.id));
        result.conceptGraph.links = result.conceptGraph.links.filter(link => 
            validNodeIds.has(link.source) && validNodeIds.has(link.target)
        );
    }

    return result;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

/**
 * Fetches available models from a custom OpenAI-compatible endpoint.
 */
export const fetchCustomModels = async (baseUrl: string, apiKey: string): Promise<ModelOption[]> => {
  try {
    // Normalize URL: remove trailing slash and ensure /v1/models if typical OpenAI structure
    let url = baseUrl.replace(/\/$/, "");
    // Simple heuristic for OpenAI compatible endpoints
    
    const response = await fetch(`${url}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage = response.statusText || `Status ${response.status}`;
      try {
          const errorBody = await response.json();
          if (errorBody.error && errorBody.error.message) {
              errorMessage = errorBody.error.message;
          }
      } catch {
           // ignore json parse error
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Handle both { data: [...] } format and direct array format
    const list = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
    
    return list.map((m: any) => {
        const id = m.id;
        // Look for common name fields: name, title, display_name. Fallback to id.
        const name = m.name || m.title || m.display_name || m.id;
        return { id, name };
    });
  } catch (error) {
    console.error("Failed to fetch custom models:", error);
    throw error;
  }
};

/**
 * Helper function to remove <think>...</think> blocks from model output.
 */
const cleanModelOutput = (text: string): string => {
  if (!text) return "";
  // Remove <think> tags and content between them, case insensitive, multiline
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
};

/**
 * Generates a deep reading analysis (Difficulties, Suggestions, Extended Knowledge).
 * Supports both Gemini (default) and Custom API.
 */
export const generateExtendedAnalysis = async (
  text: string, 
  language: UILanguage = 'en',
  customConfig?: CustomAIConfig
): Promise<string> => {
  let langInstruction = "Respond in English.";
  if (language === 'zh') langInstruction = "Respond in Simplified Chinese.";
  else if (language === 'ko') langInstruction = "Respond in Korean.";
  else if (language === 'ja') langInstruction = "Respond in Japanese.";
  
  const systemPrompt = `Act as an expert academic mentor. Analyze the following text to help a reader understand it deeply. ${langInstruction}`;
  
  const userPrompt = `
    Please provide the output in Markdown format with the following three distinct sections:

    ### 1. 📖 Reading Difficulties
    Identify the most challenging concepts, complex logic, or technical jargon in this text. Explain *why* they are difficult and clarify them simply.

    ### 2. 💡 Reading Suggestions
    Provide actionable advice on how to read this specific text. What should the reader focus on? What background knowledge is helpful?

    ### 3. 🧠 Extended Knowledge
    Introduce related concepts, historical context, or future directions that are relevant to this text but not explicitly mentioned. Connect the text to the broader field.
    
    Text to analyze:
    ${text.substring(0, 20000)}
  `;

  // 1. Check if Custom API is enabled and valid
  if (customConfig?.isEnabled && customConfig.baseUrl && customConfig.apiKey && customConfig.selectedModel) {
    try {
      let url = customConfig.baseUrl.replace(/\/$/, "");
      
      const response = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: customConfig.selectedModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        let errorMessage = response.statusText || `Status ${response.status}`;
        try {
            const errorBody = await response.json();
            if (errorBody.error && errorBody.error.message) {
                errorMessage = errorBody.error.message;
            }
        } catch {
            const textBody = await response.text().catch(() => '');
            if (textBody) errorMessage = textBody;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "No analysis generated from Custom API.";
      return cleanModelOutput(content);

    } catch (error: any) {
      console.error("Custom API analysis failed:", error);
      const msg = error.message || "Unknown network or configuration error";
      return `### Custom API Error\n\nCould not generate analysis using the custom model.\n\n**Error details:** ${msg}\n\nPlease check your Custom AI Configuration in Settings.`;
    }
  }

  // 2. Default Gemini Implementation
  try {
    const response = await ai().models.generateContent({
      model: smartModel(), // Use Pro for better reasoning
      contents: `${systemPrompt}\n${userPrompt}`,
    });
    const content = response.text || "No analysis generated.";
    return cleanModelOutput(content);
  } catch (error) {
    console.error("Extended analysis failed:", error);
    throw error;
  }
};

/**
 * Translates text to the target language preserving markdown.
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const response = await ai().models.generateContent({
      model: fastModel(),
      contents: `
        Translate the following academic text into ${targetLanguage}. 
        IMPORTANT:
        1. Preserve all Markdown formatting (headers, lists, bolding).
        2. Maintain accurate academic terminology.
        3. Do not summarize, provide a full translation.
        
        Text:
        ${text.substring(0, 25000)}
      `,
    });
    return response.text || "Translation failed.";
  } catch (error) {
    console.error("Translation failed:", error);
    throw error;
  }
};

/**
 * Performs a web search using Google Search Grounding.
 */
export const performWebSearch = async (query: string, language: UILanguage = 'en'): Promise<SearchResult> => {
  let langInstruction = "Answer in English.";
  if (language === 'zh') langInstruction = "Answer in Simplified Chinese.";
  else if (language === 'ko') langInstruction = "Answer in Korean.";
  else if (language === 'ja') langInstruction = "Answer in Japanese.";

  try {
    const response = await ai().models.generateContent({
      // Use the reasoning model for Search to ensure consistent grounding chunks
      model: smartModel(),
      // Explicitly instruct the model to use the search tool to ensure consistent tool usage
      contents: `Please use the Google Search tool to search for "${query}" and provide a detailed answer based on the search results. ${langInstruction}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No results found.";
    
    // Extract sources
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ title: c.web.title, url: c.web.uri }));
      
    // Remove duplicates based on URL
    const uniqueSources = Array.from(new Map(sources.map((s:any) => [s.url, s])).values()) as { title: string; url: string }[];

    return { text, sources: uniqueSources };
  } catch (error) {
    console.error("Web search failed:", error);
    throw error;
  }
};

/**
 * Finds related papers using Google Search Grounding.
 */
export const findRelatedWork = async (query: string): Promise<RelatedPaper[]> => {
  try {
    const searchSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING },
          snippet: { type: Type.STRING, description: "A relevant snippet or summary from the search result source describing the paper's content." }
        },
        required: ["title", "url", "snippet"],
      },
    };

    const response = await ai().models.generateContent({
      model: smartModel(), // Search tool available on Pro
      contents: `Find 10 recent academic papers or articles related to: "${query}". Return the results as a structured JSON list. For each result, provide the title, the direct url, and a relevant snippet or brief summary (1-2 sentences) describing the paper.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: searchSchema,
      },
    });

    let papers: RelatedPaper[] = [];
    try {
        if (response.text) {
            papers = JSON.parse(response.text);
        }
    } catch (e) {
        console.warn("JSON parse failed for search results", e);
    }

    // Fallback: If structured JSON failed or returned nothing, use grounding chunks if available
    if ((!papers || papers.length === 0) && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
         const chunks = response.candidates[0].groundingMetadata.groundingChunks;
         papers = [];
         chunks.forEach((chunk) => {
             if (chunk.web?.uri && chunk.web?.title) {
                 papers.push({
                     title: chunk.web.title,
                     url: chunk.web.uri,
                     snippet: "Source verified via Google Search Grounding."
                 });
             }
         });
    }
    
    return papers || [];
  } catch (error) {
    console.error("Related work search failed:", error);
    if (error instanceof MissingKeyError) throw error;
    return [];
  }
};

/**
 * Chat with the paper context.
 */
export const chatWithPaper = async (
  history: { role: string; parts: [{ text: string }] }[],
  newMessage: string,
  context: string,
  language: UILanguage = 'en'
) => {
  let langInstruction = "Respond in English.";
  if (language === 'zh') langInstruction = "Respond in Simplified Chinese.";
  else if (language === 'ko') langInstruction = "Respond in Korean.";
  else if (language === 'ja') langInstruction = "Respond in Japanese.";

  const chat = ai().chats.create({
    model: fastModel(),
    history: [
      {
        role: "user",
        parts: [{ text: `Context (The Academic Paper): ${context.substring(0, 25000)}` }],
      },
      {
        role: "model",
        parts: [{ text: `Understood. I will answer questions based on this paper. I will ${langInstruction}` }],
      },
      ...history
    ],
  });

  const result = await chat.sendMessageStream({ message: newMessage });
  return result;
};
