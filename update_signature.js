const fs = require('fs');
const path = require('path');

// Read the base64 signature
const base64 = fs.readFileSync('signature_base64.txt', 'utf8').trim();

// Read the company profile
const profilePath = path.join(__dirname, 'data', 'company_profile.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

// Update the signature
profile.signature.base64 = `data:image/png;base64,${base64}`;

// Write back to file
fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf8');

console.log('✓ Signature updated successfully!');
