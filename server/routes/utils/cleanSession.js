const fs = require('fs');
const path = require('path');

function cleanSession(sessionId, uploadSessions) {
    if (!sessionId || !uploadSessions.has(sessionId)) {
        return;
    }

    const session = uploadSessions.get(sessionId);
    const sessionDir = path.join(process.cwd(), './media/temp', sessionId);

    // Remove all uploaded chunks
    if (fs.existsSync(sessionDir)) {
        fs.readdirSync(sessionDir).forEach(file => {
            fs.unlinkSync(path.join(sessionDir, file));
        });
        fs.rmdirSync(sessionDir);
    }

    // Remove session from the map
    uploadSessions.delete(sessionId);
    
}
module.exports = cleanSession;