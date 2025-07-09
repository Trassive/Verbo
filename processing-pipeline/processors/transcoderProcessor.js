const fs = require('fs');
const path = require('path');
const { Job } = require('bullmq');
const { promisifySpawn } = require('../utils/asyncSpawn');

async function transcoderProcessor(Job) {
    const options = {
        input: Job.data.inputPath,
        outputDir: path.join("C:\\Users\\Tushar\\Desktop\\js_projects\\HLSSample", './media/transcoded_videos', Job.data.sessionId),
        initialOffset: Job.data.globalDuration,
        hardwareAcceleration: true,
        index: Job.data.index,
        segmentDuration: 2,
        shouldCreateInit: Job.data.index === 1,
    };
    console.log(Job.data);
    const result = await transcode(options);
}

async function transcode(options) {
    const {
        input,
        renditions = [
            { height: 480, videoBitrate: '1000k', audioBitrate: '128k' },
            { height: 720, videoBitrate: '3000k', audioBitrate: '128k' },
            { height: 1080, videoBitrate: '6000k', audioBitrate: '128k' }
        ],
        outputDir,
        initialOffset = 0,
        hardwareAcceleration = false,
        index ,
        segmentDuration = 4,
        shouldCreateInit = false,
    } = options;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const promises = renditions.map(async (rendition) => {
        const { height, videoBitrate, audioBitrate } = rendition;
        const outputPrefix = path.join(outputDir, `${height}p`);
        const fileName = path.join(outputPrefix,`${index}_${height}p_`);
        if (!fs.existsSync(outputPrefix)) {
            fs.mkdirSync(outputPrefix, { recursive: true });
        }
        const playlistName = path.join(outputPrefix, `${index}_${height}p.m3u8`);

        const args = [
            '-y',
            ...(hardwareAcceleration ? ['-hwaccel', 'auto'] : []),
            '-i', input,
            '-output_ts_offset', initialOffset.toString(),
            '-map', '0',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-b:v', videoBitrate,
            '-vf', `scale=-2:${height}`,
            '-c:a', 'aac',
            '-b:a', audioBitrate,
            '-profile:a', 'aac_low',
            '-c:s', 'webvtt',
            '-f', 'hls',
            '-hls_time', segmentDuration.toString(),
            '-hls_playlist_type', 'event',
            '-hls_segment_type', 'fmp4',
            '-hls_flags', 'independent_segments',
            ...(shouldCreateInit ? ['-hls_fmp4_init_filename', path.join(outputPrefix, 'init.mp4')] : []),
            '-hls_segment_filename', fileName + '%03d.m4s',
            playlistName
        ];

        await promisifySpawn('ffmpeg', args);
        return { height, playlistName, success: true };
    });

    return Promise.all(promises);
}
module.exports = { transcoderProcessor };

