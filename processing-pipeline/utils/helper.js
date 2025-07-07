const Decimal = require('decimal.js');
const path = require("path");
const fs = require('fs');
const { transcoderQueue } = require('../queues');
const { getDuration } = require('./getDuration');


async function processChunksForSession(sessionId, chunkDir) {
  const files = fs.readdirSync(chunkDir)
  .sort((a, b) => {
    const getNum = (f) => parseInt(f.match(/\d+/)?.[0] || '0', 10);
    return getNum(a) - getNum(b);
  });

  let globalDuration = new Decimal(0);
  let playlistContent = '';

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
      path: chunkPath,
      globalDuration,
      chunkDuration,
      sessionId
    };

    if (chunkDuration) {
      const segmentLine = `#EXTINF:${duration.toFixed(3)},\n${file}\n`;
      playlistContent += segmentLine;
    }

    globalDuration = globalDuration.plus(chunkDuration);

    await transcoderQueue.add('transcode-chunk', data);
  }

  const parentDir = path.dirname("./media/playlist/mediaPlaylist/dummy");
  fs.mkdirSync(parentDir, { recursive: true });

  fs.writeFileSync("./media/playlist/mediaPlaylist/dummy", playlistContent);
  console.log(`Playlist written to ${"./media/playlist/mediaPlaylist/dummy"}`);


  console.log(`[Helper] Processed all chunks for session ${sessionId}`);
}
  
module.exports = {processChunksForSession} ;
