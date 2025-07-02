const express = require('express');
const fs = require('fs').promises;
const fssync = require('fs');
const crypto = require('crypto');
const path = require('path');
const  upload  = require ('../middlewares/multer.middleware');

const CHUNK_TIMEOUT = 30 * 60 * 1000;
const TEMP_DIR = path.join(__dirname, '../chunks');
const UPLOAD_DIR = path.join(__dirname, '../uploads');

const Router = express.Router();

const uploadSessions = new Map();

Router.post('/upload/init', async (req, res) => {
  try {

    const { fileName, fileSize, totalChunks, fileHash } = req.body;
    
    if (!fileName || !fileSize || !totalChunks) {
      return res.status(400).json({ 
        error: 'Missing required fields: fileName, fileSize, totalChunks' 
      });
    }

    const sessionId = crypto.randomUUID();
    
    uploadSessions.set(sessionId, {
      fileName: fileName,
      fileSize: parseInt(fileSize),
      totalChunks: parseInt(totalChunks),
      fileHash,
      uploadedChunks: new Set(),
      lastActivity: Date.now(),
      createdAt: Date.now()
    });

    res.json({
      sessionId,
      message: 'Upload session initialized'
    });
  } catch (error) {
    saveStateToDisk();
    
    console.error('Error initializing upload:', error);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});
 
Router.post('/upload/chunk', upload.single('chunk'), async (req, res) => {
    try{
        const { sessionId, idx, hash } = req.body;
        if(!sessionId || !idx || !hash) {
            return res.status(400).json({ error: 'Missing required fields: sessionId, idx, hash',  });
        }
        const session = uploadSessions.get(sessionId);
        if(!session || Date.now() - session.lastActivity > CHUNK_TIMEOUT) {
            res.status(400).json({ error: 'Invalid or expired session' });
            cleanSession(sessionId); // yet to write this function
            return;
        }
        const chunkIndex = parseInt(idx,10);
        if(chunkIndex < 0 || chunkIndex >= session.totalChunks ||session.uploadedChunks.has(chunkIndex)) {
            res.status(400).json({ error: 'Invalid chunk index' });
            return;
        }
        if(hash && req.file){
            const buffer = await fs.readFile(req.file.path);
            const fileHash = crypto.createHash('md5').update(buffer).digest('hex');
            if(fileHash !== hash) {
                await fs.unlink(req.file.path);
                res.status(400).json({ error: 'Chunk hash mismatch' });
                return;
            }
        }

        session.uploadedChunks.add(chunkIndex);
        session.lastActivity = Date.now();

        res.json({ 
            message: 'Chunk uploaded successfully',
            chunkIndex: chunkIndex,
            isCompleted: session.uploadedChunks.size === session.totalChunks
        });
    } catch (error) {
        saveStateToDisk();
        console.error('Error uploading chunk:', error);
        res.status(500).json({ error: 'Failed to upload chunk' });
    }
});

Router.get('/upload/status/:sessionId', async (req, res) => {
    try{
        const { sessionId } = req.params;
        if(!sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }
        const session = uploadSessions.get(sessionId);
        if(!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({
            sessionId,
            fileName: session.fileName,
            fileSize: session.fileSize,
            totalChunks: session.totalChunks,
            missingChunks: Array.from({ length: session.totalChunks }, (_, i) => i).filter(i => !session.uploadedChunks.has(i)),
            isCompleted: session.uploadedChunks.size === session.totalChunks
        });
    } catch (error) {
        saveStateToDisk();
        console.error('Error fetching upload status:', error);
        res.status(500).json({ error: 'Failed to fetch upload status' });
    }
})

Router.post('/upload/complete', async (req, res) => {
    try {
        const {sessionId} = req.body;
        if(!sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }
        const session = uploadSessions.get(sessionId);
        if(!session || Date.now() - session.lastActivity > CHUNK_TIMEOUT) {
            return res.status(404).json({ error: 'Session not found' });
        }
        if(session.uploadedChunks.size !== session.totalChunks) {
            return res.status(400).json({ error: 'Not all chunks uploaded, Check status for more info' });
        }
        const uploadPath = path.join(UPLOAD_DIR, sessionId+path.extname(session.fileName));

        const writeStream =  fssync.createWriteStream(uploadPath);
        try {
            for (let i = 0; i < session.totalChunks; i++) {
                const chunkPath = path.join(TEMP_DIR, `${sessionId}_${i}.bin`);
                const chunkData = await fs.readFile(chunkPath);
                if (!writeStream.write(chunkData)) {
                await new Promise(resolve => writeStream.once('drain', resolve));
            }
                
                await fs.unlink(chunkPath);
            }
        }  finally {
            saveStateToDisk();
            writeStream.end();
            cleanSession(sessionId);
        }
    
        const file = await fs.stat(uploadPath);
        if(file.size !== session.fileSize) {
            await fs.unlink(uploadPath);
            return res.status(400).json({ error: 'File size mismatch after upload' });
        }
        if(session.fileHash){
            const calculatedHash = crypto.createHash('md5').update(await fs.readFile(uploadPath)).digest('hex');
            if(calculatedHash !== session.fileHash) {
                await fs.unlink(uploadPath);
                cleanSession(sessionId);
                return res.status(400).json({ error: 'File hash mismatch after upload' });
            }
        }
        cleanSession(sessionId);
        res.json({ message: 'File uploaded successfully' });

    }catch (error) {
        saveStateToDisk();
        console.error('Error completing upload:', error);
        res.status(500).json({ error: 'Failed to complete upload' });
    }
});
function cleanSession(sessionId) {
    uploadSessions.delete(sessionId);
}

// Save to file
function saveStateToDisk() {
  fssync.writeFileSync('uploadSessions.json', JSON.stringify(Object.fromEntries(uploadSessions)));
}

// Restore from file
function loadStateFromDisk() {
  const filePath = './routes/uploadSessions.json';
  
  if (fssync.existsSync(filePath)) {
    try {
      const obj = JSON.parse(fssync.readFileSync(filePath, 'utf-8'));

      Object.entries(obj).forEach(([key, value]) => {
        // Convert uploadedChunks array back to Set
        value.uploadedChunks = new Set(value.uploadedChunks);

        uploadSessions.set(key, value);
      });

      console.log(`✅ Loaded ${uploadSessions.size} sessions from disk.`);
    } catch (err) {
      console.error('❌ Error loading session file:', err.message);
    }
  } else {
    console.log('⚠️ No uploadSessions.json file found. Starting fresh.');
  }
}



module.exports = {Router, loadStateFromDisk};