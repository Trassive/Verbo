const path = require('path');

const MIME_TYPE_EXTENSIONS = {
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/x-matroska': ['.mkv'],
  'video/webm': ['.webm'],
  'video/mpeg': ['.mpeg', '.mpg']
};

function isAllowedExtension(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return Object.values(MIME_TYPE_EXTENSIONS).some(exts => exts.includes(ext));
}

module.exports = isAllowedExtension;