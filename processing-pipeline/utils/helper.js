const Decimal = require('decimal.js');
const path = require("path");
const fs = require('fs');
const { transcoderQueue } = require('../queues');
const { getDuration } = require('./getDuration');


async function processChunksForSession(sessionId, chunkDir, totalChunks) {
  const files = fs.readdirSync(chunkDir)
  .sort((a, b) => {
    const getNum = (f) => parseInt(f.match(/\d+/)?.[0] || '0', 10);
    return getNum(a) - getNum(b);
  });

  let globalDuration = new Decimal(0);
  let playlistContent = '';
  let index = 1;
  for (const file of files) {
    const chunkPath = path.join(chunkDir, file);

    let chunkDuration;
    try {
      chunkDuration = new Decimal(await getDuration(chunkPath));
    } catch (error) {
      console.error(`Error getting duration for ${chunkPath}:`, error);
      continue; 
    }
    const data = {
      inputPath: chunkPath,
      globalDuration: globalDuration,
      sessionId: sessionId,
      index: index
    };
    index++;

    if (chunkDuration) {
      const segmentLine = `#EXTINF:${chunkDuration.toFixed(3)},\n${file}\n`;
      playlistContent += segmentLine;
    }

    globalDuration = globalDuration.plus(chunkDuration);

    await transcoderQueue.add('transcode-chunk', data);
  }

  const parentDir = path.join("C:\\Users\\Tushar\\Desktop\\js_projects\\HLSSample", '/media/playlist/mediaPlaylist/dummy', sessionId);
  fs.mkdirSync(parentDir, { recursive: true });

  fs.writeFileSync(path.join(parentDir, 'playlist.m3u8'), playlistContent);
  console.log(`Playlist written to ${path.join(parentDir, 'playlist.m3u8')}`);

  console.log(`[Helper] Processed all chunks for session ${sessionId}`);
}
  
module.exports = {processChunksForSession} ;
