const fs = require('fs');
const path = require('path');
const {_, Job} = require('bullmq');
const { promisifySpawn } = require('../utils/asyncSpawn');

async function transcoderProcessor(Job) {
    const options = {
        input: Job.data.input,
        outputDir: path.join(process.cwd(), './media/transcoded_videos', Job.data.sessionId),
        initialOffset: Job.data.globalDuration,
        hardwareAcceleration: true,
        segmentDuration: 4
    }
    const result = await transcode(options)
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
        segmentDuration = 4,
    } = options;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const promises = renditions.map(async (rendition) => {
        const { height, videoBitrate, audioBitrate } = rendition;
        const outputPrefix = path.join(outputDir, `${height}p_`);
        const playlistName = path.join(outputDir, `${height}p.m3u8`);

        const offsetTimescale = Math.round(initialOffset * 90000);

        const args = [
            '-y',
            ...(hardwareAcceleration ? ['-hwaccel', 'auto'] : []),
            '-i', input,
            '-map', '0',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-b:v', videoBitrate,
            '-vf', `scale=-2:${height}`,
            '-c:a', 'aac',
            '-b:a', audioBitrate,
            '-profile:a', 'aac_low',
            '-c:s', 'mov_text',
            '-f', 'hls',
            '-hls_time', segmentDuration.toString(),
            '-hls_playlist_type', 'event',
            '-hls_segment_type', 'fmp4',
            '-hls_flags', 'independent_segments',
            '-hls_segment_filename', outputPrefix + '%03d.m4s',
            '-init_seg_offset', offsetTimescale.toString(),
            playlistName
        ];

        await promisifySpawn('ffmpeg', args);
        return { height, playlistName, success: true };
    });

    return Promise.all(promises);
}

