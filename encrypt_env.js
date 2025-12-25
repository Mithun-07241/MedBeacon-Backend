const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const algorithm = 'aes-256-cbc';
const key = crypto.createHash('sha256').update(String('MEDBEACON_SECURE_KEY_2024')).digest('base64').substr(0, 32);
const iv = crypto.randomBytes(16);

const envPath = path.join(__dirname, '.env');
const outPath = path.join(__dirname, '.env.enc');

if (!fs.existsSync(envPath)) {
    console.error(".env file not found!");
    process.exit(1);
}

const text = fs.readFileSync(envPath, 'utf8');

const cipher = crypto.createCipheriv(algorithm, key, iv);
let encrypted = cipher.update(text);
encrypted = Buffer.concat([encrypted, cipher.final()]);

// Save IV + Encrypted content
const finalBuffer = Buffer.concat([iv, encrypted]);
fs.writeFileSync(outPath, finalBuffer);

console.log("Encrypted .env to .env.enc");
console.log("Key used (internal): MEDBEACON_SECURE_KEY_2024");
