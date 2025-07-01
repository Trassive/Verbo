const fs = require('fs');
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
        cb(null, req.userId+file.fieldname+ext);
    }
})
const upload = multer({
    storage: storage, 
    limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per chunk
   },
    fileFilter: (req, file, cb) =>{
        if(allowedTypes.includes(file.mimetype)){
            cb(null, true)
        } else{
            cb(new Error('File type is either invalid or not supported'), false);
        }
    }

});
module.exports = upload