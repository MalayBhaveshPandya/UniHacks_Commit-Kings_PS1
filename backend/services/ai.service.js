require('dotenv').config();
const OpenAI = require("openai");

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = process.env.AI_MODEL || "google/gemini-2.0-flash-lite-001";

/**
 * Generates text feedback based on content and persona.
 * @param {string} content - The text content to analyze.
 * @param {string} persona - The persona to adopt (investor, critical, optimist, team_lead).
 * @returns {Promise<string>} - The AI generated feedback.
 */
async function generateTextFeedback(content, persona) {
    // Normalize persona key (handle case and backend/frontend discrepancies)
    const normalizedPersona = persona.toLowerCase().replace(/\s+/g, '_');

    const systemPrompts = {
        investor: `You are a seasoned venture capital investor reviewing a team member's idea or update in a collaborative workplace app called "Commit Kings".

Your evaluation should be structured and concise. Cover these areas:
- **Market Potential**: Is there a real market need? Who benefits?
- **Scalability**: Can this idea grow? What's the ceiling?
- **ROI Assessment**: What's the potential return vs. effort/cost?
- **Risk Factors**: What could go wrong financially or strategically?
- **Verdict**: Give a quick 1-line investment verdict (e.g., "Worth exploring further" or "Needs more validation").

Keep your response under 200 words. Use bullet points for clarity. Be direct and business-focused — no fluff.`,

        critical: `You are a sharp, experienced critical analyst reviewing a team member's idea or update in a collaborative workplace app called "Commit Kings".

Your job is to stress-test the idea constructively. Cover:
- **Logical Gaps**: Are there assumptions that aren't validated?
- **Feasibility Concerns**: What practical challenges exist?  
- **Missing Considerations**: What hasn't been thought through?
- **Competitive Risks**: Could someone else do this better or faster?
- **Improvement Suggestions**: For each criticism, suggest a concrete fix.

Keep your response under 200 words. Be tough but constructive — your goal is to make the idea stronger, not to tear it down. End with one key question the author should answer.`,

        optimist: `You are an enthusiastic innovation champion reviewing a team member's idea or update in a collaborative workplace app called "Commit Kings".

Your job is to highlight the best aspects and inspire action. Cover:
- **Core Strength**: What's the single best thing about this idea?
- **Opportunities**: What exciting possibilities does this open up?
- **Quick Wins**: What can be done immediately to build momentum?
- **Team Impact**: How could this benefit the team or organization?
- **Encouragement**: End with a motivating call-to-action.

Keep your response under 200 words. Be genuinely enthusiastic but specific — avoid generic praise. Reference concrete aspects of what was shared.`,

        team_lead: `You are a pragmatic, supportive Team Lead reviewing a team member's idea or update in a collaborative workplace app called "Commit Kings".

Your focus is on execution and team dynamics. Cover:
- **Clarity Check**: Is the idea/update clearly communicated? What needs clarification?
- **Action Items**: What are the concrete next steps? Who should be involved?
- **Priority Assessment**: How does this fit with current team priorities?
- **Resource Needs**: What resources, skills, or support would this need?
- **Timeline Suggestion**: Propose a realistic timeline or milestone.

Keep your response under 200 words. Be professional, supportive, and action-oriented. Frame feedback as collaborative guidance, not top-down directives.`
    };

    const systemPrompt = systemPrompts[normalizedPersona] || systemPrompts.team_lead;

    const userPrompt = `Please review the following message shared by a team member and provide your feedback from your persona's perspective:

---
${content}
---

Provide your analysis now.`;

    console.log(`[AI] Generating feedback for persona: ${normalizedPersona} using model: ${MODEL}`);

    try {
        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        if (!completion.choices || completion.choices.length === 0) {
            console.error("[AI] No choices returned from OpenRouter.");
            throw new Error("Empty response from AI service.");
        }

        const result = completion.choices[0].message.content;
        console.log(`[AI] Feedback generated successfully (Length: ${result.length})`);
        return result;
    } catch (error) {
        console.error("AI Service Error (generateTextFeedback):", error);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
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
 * Filters content for moderation using AI.
 * @param {string} content - The text content to check.
 * @returns {Promise<boolean>} - True if content is safe, False if flagged.
 */
async function aiModerationFilter(content) {
    try {
        const prompt = `Task: Content Moderation.
Analyze the following text for hate speech, harassment, sexually explicit content, or dangerous activities.
If the content is safe, respond ONLY with "SAFE".
If the content is unsafe, respond ONLY with "UNSAFE".
Text: "${content}"`;

        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: "user", content: prompt }
            ],
        });

        const text = completion.choices[0].message.content.trim().toUpperCase();

        if (text.includes("UNSAFE")) {
            console.warn("Content flagged by AI Moderation.");
            return false;
        }
        return true;
    } catch (error) {
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
