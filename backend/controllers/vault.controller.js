const Meeting = require('../models/Meeting');
const Insight = require('../models/Insight');
const Message = require('../models/Message');
const Post = require('../models/Post');
const crypto = require('crypto');
const fs = require('fs');

// Create a new meeting (log one)
exports.createMeeting = async (req, res) => {
    try {
        const { title, recordingUrl, transcript, tags, scheduledAt, duration, participants } = req.body;

        const newMeeting = new Meeting({
            title: title || "Untitled Meeting",
            scheduledAt: scheduledAt || new Date(),
            recordingUrl: recordingUrl || "",
            duration: duration || "",
            transcript: transcript || [],
            tags: tags || [],
            participants: participants || [],
            createdBy: req.user?._id || req.user?.id,
        });

        const savedMeeting = await newMeeting.save();
        res.status(201).json({ meeting: savedMeeting });
    } catch (error) {
        console.error("Error creating meeting:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Start a live meeting (generates Jitsi room)
exports.startMeeting = async (req, res) => {
    try {
        const { title } = req.body;
        const roomId = 'ck-' + crypto.randomBytes(6).toString('hex');

        const newMeeting = new Meeting({
            title: title || "Quick Meeting",
            scheduledAt: new Date(),
            roomId,
            isActive: true,
            createdBy: req.user?._id || req.user?.id,
            participants: [req.user?.name || 'Host'],
        });

        const savedMeeting = await newMeeting.save();
        res.status(201).json({ meeting: savedMeeting });
    } catch (error) {
        console.error("Error starting meeting:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// End a live meeting
exports.endMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        meeting.isActive = false;
        await meeting.save();
        res.json({ meeting });
    } catch (error) {
        console.error("Error ending meeting:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update transcript for a meeting
exports.updateTranscript = async (req, res) => {
    try {
        const { transcript } = req.body;
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        meeting.transcript = transcript || [];
        await meeting.save();
        res.json({ meeting });
    } catch (error) {
        console.error("Error updating transcript:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// AI Summarize a meeting transcript
exports.summarizeTranscript = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        const transcript = meeting.transcript;
        if (!transcript || transcript.length === 0) {
            return res.json({ summary: "No transcript available to summarize." });
        }

        // Build transcript text
        const transcriptText = transcript.map(line => {
            if (typeof line === 'object') {
                return `[${line.time || ''}] ${line.speaker || 'Unknown'}: ${line.text || ''}`;
            }
            return String(line);
        }).join('\n');

        const OpenAI = require('openai');
        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        });
        const MODEL = process.env.AI_MODEL || "google/gemini-2.0-flash-lite-001";

        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant that summarizes meeting transcripts. Provide a well-structured summary covering:
- **Key Topics Discussed**
- **Important Decisions Made**
- **Action Items & Next Steps**
- **Notable Points**
Keep it concise (under 300 words). Use bullet points.`
                },
                {
                    role: "user",
                    content: `Summarize this meeting transcript:\n\n${transcriptText}`
                }
            ],
            max_tokens: 800,
            temperature: 0.5,
        });

        const summary = completion.choices?.[0]?.message?.content || 'Could not generate summary.';
        meeting.aiSummary = summary;
        await meeting.save();

        res.json({ summary });
    } catch (error) {
        console.error("Error summarizing transcript:", error);
        res.status(500).json({ message: "Failed to generate summary." });
    }
};

// Transcribe audio file using Gemini
exports.transcribeAudio = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No audio file uploaded" });
        }

        // Read file and convert to base64
        const audioBuffer = fs.readFileSync(req.file.path);
        const base64Audio = audioBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        const OpenAI = require('openai');
        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY,
        });
        const MODEL = "google/gemini-2.0-flash-lite-001"; // Supports audio

        const completion = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Transcribe this audio file exactly as spoken. format it as lines with speaker placeholders like 'Speaker: text'."
                        },
                        {
                            type: "image_url", // OpenRouter/Gemini uses image_url structure for multi-modal but with audio mime type data URI
                            image_url: {
                                url: `data:${mimeType};base64,${base64Audio}`
                            }
                        }
                    ]
                }
            ]
        });

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        const transcriptText = completion.choices?.[0]?.message?.content || "";

        // Parse the text into structured objects if possible, otherwise return raw lines
        const lines = transcriptText.split('\n').filter(line => line.trim() !== '').map((line, index) => {
            // Simple heuristic to split Speaker: Text
            const match = line.match(/^(.*?):\s*(.*)$/);
            const time = `${Math.floor(index * 5 / 60)}:${String(index * 5 % 60).padStart(2, '0')}`;
            if (match) {
                return {
                    time,
                    speaker: match[1].trim(),
                    text: match[2].trim()
                };
            }
            return {
                time,
                speaker: "Speaker",
                text: line.trim()
            };
        });

        res.json({ transcript: lines });

    } catch (error) {
        console.error("Error transcribing audio:", error);
        // Attempt cleanup
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: "Failed to transcribe audio." });
    }
};

// Get all meetings
exports.getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find().sort({ scheduledAt: -1 });
        res.json({ meetings });
    } catch (error) {
        console.error("Error fetching meetings:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get single meeting
exports.getMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });
        res.json({ meeting });
    } catch (error) {
        console.error("Error fetching meeting:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete meeting
exports.deleteMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findByIdAndDelete(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });
        res.json({ message: "Meeting deleted" });
    } catch (error) {
        console.error("Error deleting meeting:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Toggle transcript insight
exports.toggleTranscriptInsight = async (req, res) => {
    try {
        const { id, index } = req.params;
        const meeting = await Meeting.findById(id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        // Assuming insights is an array of indices
        const idx = meeting.insights.indexOf(parseInt(index));
        if (idx > -1) {
            meeting.insights.splice(idx, 1);
        } else {
            meeting.insights.push(parseInt(index));
        }
        await meeting.save();
        res.json({ meeting });
    } catch (error) {
        console.error("Error toggling insight:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Mark an item as an Insight
exports.markInsight = async (req, res) => {
    try {
        const { sourceId, sourceType, tags, aiSummary } = req.body;

        if (req.user.role !== 'Reviewer' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Only Reviewers can mark insights." });
        }

        let content = "";
        let sourceDoc = null;

        if (sourceType === 'Message') {
            sourceDoc = await Message.findById(sourceId);
            if (sourceDoc) content = sourceDoc.content;
        } else if (sourceType === 'Post') {
            sourceDoc = await Post.findById(sourceId);
            if (sourceDoc) content = sourceDoc.content; // Assuming Post has content field
        }

        if (!sourceDoc) {
            return res.status(404).json({ message: "Source not found" });
        }

        const newInsight = new Insight({
            sourceId,
            sourceType,
            markedBy: req.user.id,
            tags: tags || [],
            content,
            aiSummary: aiSummary || ""
        });

        const savedInsight = await newInsight.save();

        // If it's a message, update the isInsight flag for quick UI reference
        if (sourceType === 'Message') {
            await Message.findByIdAndUpdate(sourceId, { isInsight: true });
        }

        res.status(201).json(savedInsight);
    } catch (error) {
        console.error("Error marking insight:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Retrieve insights with optional filtering
exports.getInsights = async (req, res) => {
    try {
        const { tag } = req.query;
        let query = {};

        if (tag) {
            query.tags = tag;
        }

        const insights = await Insight.find(query)
            .sort({ createdAt: -1 })
            .populate('markedBy', 'username');

        res.json(insights);
    } catch (error) {
        console.error("Error fetching insights:", error);
        res.status(500).json({ message: "Server error" });
    }
};
