const fs = require('fs');
const multer = require('multer');
const path = require('path');
const path = require('path');

const allowedTypes =[
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/mpeg'
]
const TEMP_DIR = path.join(__dirname, '../chunks');
const UPLOAD_DIR = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
    destination: async (req,file,cb) =>{
        const dir = path.join(TEMP_DIR, req.sessionId);
        fs.mkdir(dir, {recursive: true});
        cb(null, dir);
    },
    filename: async (req, file, cb) =>{
        const ext = path.extname(file.originalname)
        cb(null, req.body.sessionId + req.body.chunkId + ext);
    }
})
const uploadChunk = multer({
    storage: storage, 
    limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per chunk
   },

});
module.exports = uploadChunk