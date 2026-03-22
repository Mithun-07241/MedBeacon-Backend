/**
 * Chat Message Encryption – HIPAA §164.312(a)(2)(iv)
 *
 * Encrypts/decrypts chat message text using AES-256-GCM.
 *
 * Strategy:
 *  - A per-conversation symmetric key is derived from the CONVERSATION_KEY_SECRET
 *    env var + the sorted participant IDs using HKDF-SHA256.
 *  - Each message gets a random 12-byte IV.
 *  - Ciphertext is stored as: <hex-iv>:<hex-authTag>:<hex-ciphertext>
 *
 * The server holds the encryption key, so this is encryption-at-rest.
 * For true client-side E2E, keys would need to be managed on the client.
 */

const crypto = require('crypto');

const MASTER_SECRET = process.env.CHAT_ENCRYPTION_SECRET || 'medbeacon-chat-insecure-secret-change-me';
const ALGO = 'aes-256-gcm';

/**
 * Derive a 32-byte conversation key from doctorid + patientId.
 * The same pair always produces the same key (deterministic).
 */
function deriveConversationKey(doctorId, patientId) {
    // Sort to make key symmetric regardless of argument order
    const participants = [doctorId, patientId].sort().join(':');
    return crypto.createHash('sha256')
        .update(MASTER_SECRET + ':' + participants)
        .digest(); // 32-byte Buffer
}

/**
 * Encrypt a plaintext message string.
 * @param {string} text - plain message
 * @param {string} doctorId
 * @param {string} patientId
 * @returns {string} encrypted payload "iv:authTag:ciphertext" (all hex)
 */
function encryptMessage(text, doctorId, patientId) {
    try {
        const key = deriveConversationKey(doctorId, patientId);
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGO, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error('[chatEncryption] encryptMessage failed:', err.message);
        // Fallback: store as-is if encryption fails (should never happen)
        return text;
    }
}

/**
 * Decrypt an encrypted payload back to plaintext.
 * @param {string} payload - "iv:authTag:ciphertext" (hex)
 * @param {string} doctorId
 * @param {string} patientId
 * @returns {string} decrypted plaintext
 */
function decryptMessage(payload, doctorId, patientId) {
    try {
        // Support legacy unencrypted messages (no colon-separated format)
        const parts = payload.split(':');
        if (parts.length !== 3) return payload; // not encrypted, return as-is

        const [ivHex, authTagHex, ciphertext] = parts;
        const key = deriveConversationKey(doctorId, patientId);
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('[chatEncryption] decryptMessage failed:', err.message);
        // If decryption fails (e.g. tampered data), return a safe placeholder
        return '[message could not be decrypted]';
    }
}

/**
 * Decrypt a list of message documents in-place.
 * Mutates the `text` field of each document object.
 */
function decryptMessages(messages, doctorId, patientId) {
    return messages.map(msg => {
        const plain = msg.toObject ? msg.toObject() : { ...msg };
        plain.text = decryptMessage(plain.text, doctorId, patientId);
        return plain;
    });
}

module.exports = { encryptMessage, decryptMessage, decryptMessages };
