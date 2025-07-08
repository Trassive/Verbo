const { execSync } = require('child_process');

function getDuration(filePath) {
  try {

    const cmd = ` ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const output = execSync(cmd).toString().trim();
    return parseFloat(output);

  } catch (error) {
    console.error('Error getting duration:', error.message);
    return null;
  }
}

module.exports = {getDuration};