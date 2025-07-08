const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
    destination: async (req,file,cb) =>{
        const tempDir = path.join(process.cwd(), './media/temp');
        if(!req.body.sessionId) {
            return cb(new Error('Missing sessionId or idx in request body'));
        }
        const sessionDir = path.join(tempDir, req.body.sessionId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        cb(null, sessionDir);
    },
    
    filename: async (req, file, cb) =>{
        if(!req.body.sessionId || !req.body.idx) {
            return cb(new Error('Missing sessionId or idx in request body'));
        }
        cb(null, req.body.sessionId+'_'+req.body.idx+'.tmp');
    }
})
const upload = multer({
    storage: storage, 
    limits: {
    fileSize: 15 * 1024 * 1024, // 15MB per chunk
   },
});
module.exports = upload