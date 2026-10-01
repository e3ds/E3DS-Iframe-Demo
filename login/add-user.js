/**
 * add-user.js - add a user, or change a user's password, in users.json.
 *
 *   node login/add-user.js <username> <password> [streamUrl]
 *
 * Stores a salted scrypt hash, never the password itself. The optional
 * streamUrl gives this user their own stream link instead of the default one in
 * config.json.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const [username, password, streamUrl] = process.argv.slice(2);
if (!username || !password) {
    console.log('usage: node login/add-user.js <username> <password> [streamUrl]');
    process.exit(1);
}

const file = path.join(__dirname, 'users.json');
const users = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
users[username] = { passwordHash: `${salt}:${hash}`, ...(streamUrl ? { streamUrl } : {}) };
fs.writeFileSync(file, JSON.stringify(users, null, 2) + '\n');
console.log(`Saved user "${username}" in ${file}`);
