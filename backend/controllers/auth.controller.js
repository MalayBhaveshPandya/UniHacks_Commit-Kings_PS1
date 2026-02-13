const User = require("../models/User");

/**
 * POST /api/auth/signup
 * Body: { name, email, password, orgCode }
 * Returns: { token, user }
 */
exports.signup = async (req, res) => {
    try {
        const { name, email, password, orgCode } = req.body;

        // ---- Validate required fields ----
        if (!name || !email || !password || !orgCode) {
            return res.status(400).json({
                error: "All fields are required (name, email, password, orgCode).",
            });
        }

        // ---- Check for existing user ----
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email is already registered." });
        }

        // ---- Create user ----
        const user = await User.create({ name, email, password, orgCode });

        // ---- Generate token ----
        const token = user.generateAuthToken();

        res.status(201).json({ token, user });
    } catch (err) {
        // Handle Mongoose validation errors
        if (err.name === "ValidationError") {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(", ") });
        }
        console.error("Signup error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user }
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ---- Validate required fields ----
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required.",
            });
        }

        // ---- Find user by email ----
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        // ---- Check password ----
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        // ---- Generate token ----
        const token = user.generateAuthToken();

        res.json({ token, user });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 * Returns: { user }
 */
exports.me = async (req, res) => {
    try {
        // req.user is set by the auth middleware
        res.json({ user: req.user });
    } catch (err) {
        console.error("Me error:", err);
        res.status(500).json({ error: "Server error." });
    }
};

/**
 * PUT /api/auth/profile
 * Headers: Authorization: Bearer <token>
 * Body: { name, jobTitle, sex }
 * Returns: { user }
 */
exports.updateProfile = async (req, res) => {
    try {
        const { name, jobTitle, sex } = req.body;

        // ---- Only update allowed fields ----
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (jobTitle !== undefined) updates.jobTitle = jobTitle;
        if (sex !== undefined) updates.sex = sex;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        res.json({ user });
    } catch (err) {
        if (err.name === "ValidationError") {
            const messages = Object.values(err.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(", ") });
        }
        console.error("Update profile error:", err);
        res.status(500).json({ error: "Server error." });
    }
};
