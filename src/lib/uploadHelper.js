const fs = require('fs');
const path = require('path');

// On Vercel, use /tmp directory. Locally use ./uploads
const isVercel = process.env.VERCEL === '1';
const uploadBaseDir = isVercel ? '/tmp/uploads' : './uploads';

// Ensure upload directory exists (only works in /tmp on Vercel)
function ensureUploadDir(subdir) {
    const fullPath = path.join(uploadBaseDir, subdir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
}

module.exports = {
    uploadBaseDir,
    ensureUploadDir,
    isVercel
};
