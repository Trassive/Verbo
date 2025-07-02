const multer = require('multer');
const path = require('path');

const allowedTypes =[
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/mpeg'
]

const storage = multer.diskStorage({
    destination: async (req,file,cb) =>{
        cb(null, './uploads');
    },
    filename: async (req, file, cb) =>{
        const ext = path.extname(file.originalname)
        cb(null, req.body.sessionId+'_'+req.body.idx+ext);
    }
})
const upload = multer({
    storage: storage, 
    limits: {
    fileSize: 15 * 1024 * 1024, // 15MB per chunk
   },
});
module.exports = upload