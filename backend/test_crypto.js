const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY_HEX = 'd0d2962458a203ba3c7344933a39e763174246067f537021a81dc09470940337'; // From .env
const IV_LENGTH = 16;

try {
    console.log("Attempt 1: Buffer.from(KEY) (Current Implementation)");
    let iv = crypto.randomBytes(IV_LENGTH);
    // This effectively creates a 64-byte key from the 64-char string
    let cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY_HEX), iv);
    console.log("Success: 64-byte key accepted? (Unexpected)");
} catch (err) {
    console.log("Error 1:", err.message);
}

try {
    console.log("\nAttempt 2: Buffer.from(KEY, 'hex') (Proposed Fix)");
    let iv = crypto.randomBytes(IV_LENGTH);
    // This parses the hex string into 32 bytes
    let cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY_HEX, 'hex'), iv);
    console.log("Success: 32-byte key accepted.");
} catch (err) {
    console.log("Error 2:", err.message);
}
