// scripts/encode-keys.js
const fs = require('fs');

const priv = fs.readFileSync('private_key.pem', 'utf8');
const pub = fs.readFileSync('public_key.pem', 'utf8');

const privB64 = Buffer.from(priv, 'utf8').toString('base64');
const pubB64 = Buffer.from(pub, 'utf8').toString('base64');

console.log(`ENCRYPTION_PRIVATE_KEY="${privB64}"`);
console.log(`ENCRYPTION_PUBLIC_KEY="${pubB64}"`);