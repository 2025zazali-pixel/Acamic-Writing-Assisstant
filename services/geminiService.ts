import { GoogleGenAI, Type } from "@google/genai";
import { fullTextContext, essayMarkingScheme, thesisMarkingScheme } from '../data/academicData';
import { ReviewFeedback } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

export const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getAiResponse = async (userMessage: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMessage,
            config: {
                systemInstruction: fullTextContext,
                temperature: 0.5,
                topP: 0.95,
                topK: 64,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching AI response:", error);
        return "Sorry, I encountered an error. Please try again.";
    }
};

export const getAiResponseWithSearch = async (userMessage: string) => {
    try {
        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `You are a helpful research assistant. Provide a comprehensive answer to the following user query using your search tool. Synthesize the information from the web and present it clearly. Always cite your sources. User Query: "${userMessage}"`,
           config: {
             tools: [{googleSearch: {}}],
             temperature: 0.7,
           },
        });

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        return {
            text: response.text,
            sources: sources
        };

    } catch (error) {
        console.error("Error fetching AI response with search:", error);
        return {
            text: "Sorry, I encountered an error while searching for information online. Please try again.",
            sources: []
        };
    }
};

export const checkReferencesOnline = async (references: string) => {
    try {
        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `You are an academic reference checker. Please verify the following academic references. For each one, confirm its existence and provide a direct link if you can find one using your search tool. Point out any apparent formatting errors or inconsistencies. If a reference cannot be found, state that clearly.\n\n**References to check:**\n${references}`,
           config: {
             tools: [{googleSearch: {}}],
             temperature: 0.2,
           },
        });

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        return {
            text: response.text,
            sources: sources
        };

    } catch (error) {
        console.error("Error checking references:", error);
        return {
            text: "Sorry, I encountered an error while checking the references. Please try again.",
            sources: []
        };
    }
};

export const getTextFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType,
            },
        };
        const textPart = {
            text: 'Extract all text from this image. Ensure the output is clean text, preserving paragraph structure where possible. If there is no text, return an empty string.',
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error extracting text from image:", error);
        throw new Error("Failed to extract text from the image.");
    }
};


const reviewResponseSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: { type: Type.STRING, description: "The final, overall score for the text based on the rubric." },
        overallSummary: { type: Type.STRING, description: "A summary of the text's main strengths and areas for improvement." },
        criteriaFeedback: {
            type: Type.ARRAY,
            description: "An array of feedback objects, one for each criterion in the rubric.",
            items: {
                type: Type.OBJECT,
                properties: {
                    criterion: { type: Type.STRING, description: "The name of the rubric criterion being evaluated." },
                    score: { type: Type.STRING, description: "The score awarded for this specific criterion." },
                    feedback: { type: Type.STRING, description: "Detailed justification and feedback for the score given for this criterion." },
                    quote: { type: Type.STRING, description: "The exact sentence or short paragraph from the original text that this feedback refers to. This must be a direct quote and an exact substring of the original text." },
                },
                required: ["criterion", "score", "feedback", "quote"],
            },
        },
    },
    required: ["overallScore", "overallSummary", "criteriaFeedback"],
};

const getParsedJsonResponse = async (prompt: string, systemInstruction: string): Promise<ReviewFeedback> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: reviewResponseSchema,
            temperature: 0.3,
        },
    });

    let jsonText = response.text.trim();
    if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7, -3);
    } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3, -3);
    }

    return JSON.parse(jsonText) as ReviewFeedback;
}

export const getAiEssayReview = async (essayText: string, essayType: string, level: 'Undergraduate' | 'Master’s'): Promise<ReviewFeedback> => {
    try {
        const scheme = essayMarkingScheme.find(s => s.level === level);
        if (!scheme) {
            throw new Error(`${level} marking scheme not found.`);
        }

        const rubric = scheme.items.find(item => item.type === essayType);
        if (!rubric) {
            throw new Error(`Rubric for essay type "${essayType}" at ${level} level not found.`);
        }

        const systemInstruction = `You are a university-level academic writing assistant. Your task is to provide a detailed, rubric-based evaluation of a student's essay. You must adhere strictly to the provided rubric, be critical but fair, and provide your entire response in the specified JSON format. For each criterion in 'criteriaFeedback', you MUST include a 'quote' field containing the exact sentence or short paragraph from the student's text that your feedback directly refers to. This quote is crucial as it will be used to highlight the text for the user, so it must be an exact substring.`;

        const reviewPrompt = `
        **ACADEMIC LEVEL:**
        ${level}

        **ESSAY TYPE TO EVALUATE:**
        ${essayType}
        
        **EVALUATION RUBRIC:**
        ${rubric.coreRubric}
        
        **PENALTY TRIGGERS TO BE AWARE OF:**
        ${rubric.penaltyTriggers}

        **STUDENT'S ESSAY TEXT:**
        ---
        ${essayText}
        ---
        
        Please provide your evaluation in the specified JSON format. Ensure every feedback item has an associated 'quote'.`;

        return await getParsedJsonResponse(reviewPrompt, systemInstruction);

    } catch (error) {
        console.error("Error fetching AI essay review:", error);
        throw new Error("Failed to get essay review from AI. The model may have returned an invalid format or an error occurred.");
    }
};

export const getAiThesisChapterReview = async (chapterText: string, level: string, chapter: string): Promise<ReviewFeedback> => {
    try {
        const scheme = thesisMarkingScheme.find(s => s.level === level);
        if (!scheme) {
            throw new Error(`${level} thesis marking scheme not found.`);
        }
        
        const rubric = scheme.items.find(item => item.chapter === chapter);
        if (!rubric) {
            throw new Error(`Rubric for thesis chapter "${chapter}" at ${level} level not found.`);
        }

        const systemInstruction = `You are an expert academic advisor and examiner. Your task is to provide a detailed, rubric-based evaluation of a student's thesis chapter. You must adhere strictly to the provided rubric for the specified academic level, be rigorous and fair, and provide your entire response in the specified JSON format. For each criterion in 'criteriaFeedback', you MUST include a 'quote' field containing the exact sentence or short paragraph from the student's text that your feedback directly refers to. This quote is crucial as it will be used to highlight the text for the user, so it must be an exact substring.`;

        const reviewPrompt = `
        **ACADEMIC LEVEL:**
        ${level}

        **THESIS CHAPTER TO EVALUATE:**
        ${chapter}
        
        **EVALUATION RUBRIC:**
        ${rubric.coreRubric}
        
        **HARSH PENALTY TRIGGERS:**
        ${rubric.penaltyTriggers}

        **STUDENT'S CHAPTER TEXT:**
        ---
        ${chapterText}
        ---
        
        Please provide your evaluation in the specified JSON format. Ensure every feedback item has an associated 'quote'.`;

        return await getParsedJsonResponse(reviewPrompt, systemInstruction);

    } catch (error) {
        console.error("Error fetching AI thesis chapter review:", error);
        throw new Error("Failed to get thesis chapter review from AI. The model may have returned an invalid format or an error occurred.");
    }
}