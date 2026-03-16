import { GoogleGenAI, Type } from "@google/genai";
import { Word } from "../vocabulary";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ReadingQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface ReadingData {
  title: string;
  text: string;
  questions: ReadingQuestion[];
}

export const generateReadingExercise = async (
  words: Word[],
  level: string
): Promise<ReadingData> => {
  const wordList = words.map((w) => `${w.english} (${w.hebrew})`).join(", ");

  const prompt = `You are an expert English teacher. Create a short reading comprehension text for ESL students at a ${level} level.
You MUST include the following vocabulary words in the text naturally:
${wordList}

After the text, provide 3 multiple-choice reading comprehension questions based on the text.
Each question should have 4 options, and one correct answer.

Return the response strictly as a JSON object with the following schema:
{
  "title": "A catchy title for the text",
  "text": "The generated story/text...",
  "questions": [
    {
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The exact string of the correct option"
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            text: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctAnswer: { type: Type.STRING },
                },
                required: ["question", "options", "correctAnswer"],
              },
            },
          },
          required: ["title", "text", "questions"],
        },
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("Empty response from Gemini");
    
    return JSON.parse(jsonStr) as ReadingData;
  } catch (error) {
    console.error("Error generating reading exercise:", error);
    throw error;
  }
};
