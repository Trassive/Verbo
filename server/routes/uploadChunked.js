const express = require('express');
const fs = require('fs').promises;
const fssync = require('fs');
const crypto = require('crypto');
const path = require('path');
const  upload  = require ('../middlewares/multer.middleware');
const checkFile = require('./utils/mime-type_helper');
const cleanSession = require('./utils/sessionCleaner');

const CHUNK_TIMEOUT = 30 * 60 * 1000;
const TEMP_DIR = path.join(process.cwd(), './media/temp');
const UPLOAD_DIR = path.join(process.cwd(), './media/completed_uploads');

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
    if(!checkFile(fileName)){
        return res.status(400).json({ 
            error: 'Invalid file type.'
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
        const { sessionId, idx, hash } = req.body;
        if(!sessionId || !idx || !hash) {
            return res.status(400).json({ error: 'Missing required fields: sessionId, idx, hash' });
        }
        const session = uploadSessions.get(sessionId);
        if(!session || Date.now() - session.lastActivity > CHUNK_TIMEOUT) {
            res.status(400).json({ error: 'Invalid or expired session' });
            cleanSession(sessionId, uploadSessions);
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
            cleanSession(sessionId, uploadSessions);
            return res.status(404).json({ error: 'Session not found' });
        }
        if(session.uploadedChunks.size !== session.totalChunks) {
            cleanSession(sessionId, uploadSessions);
            return res.status(400).json({ error: 'Not all chunks uploaded, Check status for more info' });
        }
        const uploadPath = path.join(UPLOAD_DIR, sessionId);

        const writeStream =  fssync.createWriteStream(uploadPath);
        try {
            for (let i = 0; i < session.totalChunks; i++) {
                const chunkPath = path.join(TEMP_DIR, `${sessionId}_${i}.tmp`);
                const chunkData = await fs.readFile(chunkPath);
                if (!writeStream.write(chunkData)) {
                await new Promise(resolve => writeStream.once('drain', resolve));
            }
                
                await fs.unlink(chunkPath);
            }
        }  finally {
            writeStream.end();
        }
    
        const file = await fs.stat(uploadPath);
        if(file.size !== session.fileSize) {
            await fs.unlink(uploadPath);
            cleanSession(sessionId, uploadSessions);
            return res.status(400).json({ error: 'File size mismatch after upload' });
        }
        if(session.fileHash){
            const calculatedHash = crypto.createHash('md5').update(await fs.readFile(uploadPath)).digest('hex');
            if(calculatedHash !== session.fileHash) {
                await fs.unlink(uploadPath);
                cleanSession(sessionId, uploadSessions);
                return res.status(400).json({ error: 'File hash mismatch after upload' });
            }
        }
        res.json({ message: 'File uploaded successfully' });

    }catch (error) {
        console.error('Error completing upload:', error);
        res.status(500).json({ error: 'Failed to complete upload' });
    }
});


module.exports = {Router};