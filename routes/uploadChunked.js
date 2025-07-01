const express = require('express');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
const  upload  = require ('../middlewares/multer.middleware');

const CHUNK_TIMEOUT = 30 * 60 * 1000;


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
      fileName,
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
    console.error('Error initializing upload:', error);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});
 
Router.post('/upload/chunk', upload.single('chunk'), async (req, res) => {
    try{
        const { sessionId, chunkIndex, hash } = req.body;
        if(!sessionId || !chunkIndex || !hash) {
            return res.status(400).json({ error: 'Missing required fields: sessionId, chunkIndex, hash' });
        }
        const session = uploadSessions.get(sessionId);
        if(!session || Date.now() - session.lastActivity > CHUNK_TIMEOUT) {
            res.status(400).json({ error: 'Invalid or expired session' });
            cleanSession(sessionId); // yet to write this function
            return;
        }
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
        

    }
});
function cleanSession(sessionId) {
    uploadSessions.delete(sessionId);
}

module.exports = Router;