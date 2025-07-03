import fs from 'fs';

export function ensureUploadsDir() {
    const dir = 'uploads';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}
