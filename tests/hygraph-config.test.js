const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../javascript.js'), 'utf8');

assert.doesNotMatch(source, /eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVC/, 'Hardcoded Hygraph auth token should not be committed to the app source.');
assert.match(source, /window\.__HYGRAPH_CONFIG__|setHygraphConfig\(|basic_ioarts_hygraph/, 'The app should support runtime config overrides instead of a baked-in secret.');
assert.match(source, /authToken:\s*''|authToken:\s*""|authToken:\s*['"]\s*['"]/ , 'Default config should not include a live bearer token.');

console.log('Hygraph config check passed');
