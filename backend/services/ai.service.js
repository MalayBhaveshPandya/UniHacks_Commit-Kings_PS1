require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Switching to gemini-2.0-flash-lite to avoid quota issues
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

/**
 * Generates text feedback based on content and persona.
 * @param {string} content - The text content to analyze.
 * @param {string} persona - The persona to adopt (Investor, Critical, Optimist, Team Lead).
 * @returns {Promise<string>} - The AI generated feedback.
 */
async function generateTextFeedback(content, persona) {
    let systemPrompt = "You are a helpful AI assistant.";

    switch (persona) {
        case 'Investor':
            systemPrompt = "You are a savvy investor. Analyze the potential, market viability, and ROI of the idea. Be concise and business-focused.";
            break;
        case 'Critical':
            systemPrompt = "You are a critical thinker. Identify flaws, risks, and weaknesses in the argument or idea. Be constructive but tough.";
            break;
        case 'Optimist':
            systemPrompt = "You are an eternal optimist. Highlight the strengths, potential positive outcomes, and opportunities. Be encouraging.";
            break;
        case 'Team Lead':
            systemPrompt = "You are a supportive Team Lead. Focus on collaboration, clarity, and actionable next steps. Be professional and mentorship-oriented.";
            break;
    }

    try {
        const prompt = `${systemPrompt}\n\nContent to analyze:\n"${content}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Service Error (generateTextFeedback):", error);
        throw new Error("Failed to generate AI feedback.");
    }
}

/**
 * Processes an audio transcript from a URL (Mock Implementation).
 * @param {string} audioUrl - The URL of the audio file.
 * @returns {Promise<string>} - The generated transcript.
 */
async function processTranscript(audioUrl) {
    console.log(`Processing transcript for audio: ${audioUrl}`);
    // Mock processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock return value
    return `[MOCK TRANSCRIPT] This is a simulated transcript for the audio file at ${audioUrl}. In a real implementation, this would call a speech-to-text API (e.g. Google Cloud Speech-to-Text). The meeting discussed project milestones and key deliverables.`;
}

/**
 * Filters content for moderation using Gemini.
 * @param {string} content - The text content to check.
 * @returns {Promise<boolean>} - True if content is safe, False if flagged.
 */
async function aiModerationFilter(content) {
    try {
        // Gemini doesn't have a dedicated "moderation" endpoint like OpenAI's free one.
        // We use a prompt-based approach or rely on Gemini's built-in safety filters throwing an error/blocking.
        // Here we explicitly ask.
        const prompt = `Task: Content Moderation.
Analyze the following text for hate speech, harassment, sexually explicit content, or dangerous activities.
If the content is safe, respond ONLY with "SAFE".
If the content is unsafe, respond ONLY with "UNSAFE".
Text: "${content}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim().toUpperCase();

        if (text.includes("UNSAFE")) {
            console.warn("Content flagged by AI Moderation.");
            return false;
        }
        return true;
    } catch (error) {
        // Gemini throws an error if safety ratings block the response
        if (error.message && error.message.includes("SAFETY")) {
            console.warn("Content flagged by AI Moderation (Safety Block).");
            return false;
        }
        console.error("AI Service Error (aiModerationFilter):", error);
        // Default to safe if service fails generically, or handle strictly
        return true;
    }
}

module.exports = {
    generateTextFeedback,
    processTranscript,
    aiModerationFilter
};
