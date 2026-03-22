import { GoogleGenAI, Type } from "@google/genai";

export async function parseCandidateData(fileData: { mimeType: string, data: string } | string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key missing. Please check the 'Secrets' panel in the AI Studio UI (gear icon) and ensure your GEMINI_API_KEY is correct.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      fullName: { type: Type.STRING },
      email: { type: Type.STRING },
      phone: { type: Type.STRING },
      currentRole: { type: Type.STRING },
      experienceYears: { type: Type.NUMBER },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      riskLevel: { type: Type.STRING, description: "e.g., LOW RISK, QUALIFIED, NOTICE PERIOD" },
      score: { type: Type.NUMBER },
      transcripts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sender: { type: Type.STRING },
            timestamp: { type: Type.STRING },
            content: { type: Type.STRING }
          }
        }
      }
    },
    required: ["fullName", "transcripts"]
  };

  let contents: any;
  const promptText = `Analyze the provided document, image, or chat export. Extract all available candidate information to create a structured profile.
  
Key instructions:
- Extract the candidate's full name, email, phone number, current role, and years of experience.
- If any information is missing, try to infer it from the context or leave it empty, but DO NOT use placeholders like 'Not provided'.
- Generate relevant tags based on their skills and experience.
- Assess the risk level (e.g., 'LOW RISK', 'QUALIFIED', 'NOTICE PERIOD').
- Assign a score from 0-100 based on their overall profile strength.
- If the input is a chat log, extract the conversation into the 'transcripts' array, identifying the sender, timestamp, and content.
- If the input is a resume or CV (not a chat), create a single transcript entry where the sender is 'System', timestamp is the current date, and content is a summary of the resume.`;

  if (typeof fileData === 'string') {
    contents = `${promptText}\n\nInput Data:\n${fileData.substring(0, 30000)}`;
  } else {
    contents = {
      parts: [
        {
          inlineData: {
            mimeType: fileData.mimeType,
            data: fileData.data
          }
        },
        {
          text: promptText
        }
      ]
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    const errorMessage = error?.message || "";
    if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key not valid")) {
      throw new Error("The Gemini API Key provided is invalid. Since you cannot delete it, please click on the key value in the Secrets panel (gear icon) and paste a real Gemini API key. You can get a free one at https://aistudio.google.com/app/apikey");
    }
    
    throw new Error(`AI Parsing failed: ${errorMessage}`);
  }
}
