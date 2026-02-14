const Meeting = require('../models/Meeting');
const Insight = require('../models/Insight');
const Message = require('../models/Message');
const Post = require('../models/Post');

// Create a new meeting (or log one)
// Create a new meeting (or log one)
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
            participants: participants || []
        });

        const savedMeeting = await newMeeting.save();
        res.status(201).json({ meeting: savedMeeting });
    } catch (error) {
        console.error("Error creating meeting:", error);
        res.status(500).json({ message: "Server error" });
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
