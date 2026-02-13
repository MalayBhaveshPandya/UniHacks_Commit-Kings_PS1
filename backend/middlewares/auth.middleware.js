const jwt = require('jsonwebtoken');

// Mock Auth Middleware
// This expects a standard Bearer token. 
// In a real scenario, this would verify the token against Dev 1's secret.
module.exports = (req, res, next) => {
    // For development ease, if no token is present, we can inject a mock user
    // OR enforce strict auth. For now, let's try to decode if present, else mock.

    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            // const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // req.user = decoded;

            // MOCK DECODING for now since we don't have Dev 1's secret or token generation
            req.user = {
                id: "65d4f23e9a1b2c3d4e5f6789", // Random Mock ID
                username: "MockUser",
                role: "Reviewer" // Set to Reviewer to test vault permissions
            };
            next();
        } catch (error) {
            return res.status(401).json({ message: "Invalid Token" });
        }
    } else {
        // Fallback for testing without frontend
        req.user = {
            id: "65d4f23e9a1b2c3d4e5f6789",
            username: "MockUser",
            role: "Reviewer"
        };
        console.log("Auth Middleware: No token provided, using Mock User.");
        next();
    }
};
