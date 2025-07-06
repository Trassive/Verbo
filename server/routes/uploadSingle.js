const express = require('express');
const  upload  = require ('../middlewares/multer.middleware');

const Router = express.Router();


Router.get('/upload/single',(req, res, next) =>{

 try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      message: 'File uploaded successfully',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        path: req.file.path,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = Router