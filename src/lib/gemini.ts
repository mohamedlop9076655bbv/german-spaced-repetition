import { GoogleGenAI } from '@google/genai';

// Initialize the new SDK using the key from .env
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export const generateCardData = async (word: string) => {
  const prompt = `You are a German language teacher. The user wants to learn the German word "${word}".
  1. Write a clear German context sentence explaining or using the word.
  2. Provide a short, simple German definition or synonym (explanation).
  Do NOT provide any Arabic translations. Use only German.
  
  Format the response strictly as JSON:
  {
    "sentence": "German example sentence here",
    "explanation": "German definition or synonym here"
  }`;

  const interaction = await ai.interactions.create({
    model: "gemini-3.8-flash",
    input: prompt,
  });

  const text = interaction.output_text || '';
  
  // Extract JSON from markdown if necessary
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return JSON.parse(text);
};
