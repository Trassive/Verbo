const fs = require('fs');
const path = require('path');
const {_, Job} = require('bullmq');
const { processChunksForSession} = require("../utils/helper");
const {getDuration} = require("../utils/getDuration");
const {execSync} = require("child_process")

async function splitterProcessor(Job){
    const outputFolder = path.join("C:\\Users\\Tushar\\Desktop\\js_projects\\HLSSample", './media/splitter_videos', Job.data.sessionId);
    const output = await splitter(Job.data.videoFile, outputFolder);

    await processChunksForSession(Job.data.sessionId , outputFolder, output.chunkCount);
}

async function splitter(inputVideo, outputFolder, chunkDuration = 20, maxGap = 5) {
    try {
        if (!inputVideo || !outputFolder) {
            throw new Error('Both inputVideo and outputFolder are required');
        }
        if (!fs.existsSync(inputVideo)) {
            throw new Error(`Input file not found at '${inputVideo}'`);
        }
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }
        const baseName = path.basename(inputVideo, path.extname(inputVideo));
        
        console.log(`Processing Video: ${inputVideo}`);
        console.log(`Output will be in MKV format inside '${outputFolder}'`);

        const videoDuration = getDuration(inputVideo);

        const keyframeCommand = `ffprobe -v error -skip_frame nokey -select_streams v:0 -show_entries frame=best_effort_timestamp_time -of csv=p=0 "${inputVideo}"`;
        const keyframeOutput = execSync(keyframeCommand, { encoding: 'utf8' });
        
        const keyframes = keyframeOutput
            .split('\n')
            .filter(line => line.trim() && /^\d+\.?\d*$/.test(line.trim()))
            .map(time => parseFloat(time.trim()))
            .sort((a, b) => a - b);

        if (keyframes.length === 0) {
            throw new Error('No keyframes found in the video');
        }

        let startTime = 0;
        let chunkNumber = 1;
        let keyframeIndex = 0;
        const keyframeCount = keyframes.length;

        while (startTime < videoDuration) {
            const targetEnd = startTime + chunkDuration;
            
            let candidate = null;
            let candidateIndex = null;
            let minGap = Infinity;
            for (let idx = keyframeIndex; idx < keyframeCount; idx++) {
                const kf = keyframes[idx];
                if (kf > startTime) {
                    const gap = Math.abs(kf - targetEnd);
                    if (gap < minGap) {
                        minGap = gap;
                        candidate = kf;
                        candidateIndex = idx;
                    }
                }
            }

            let endTime;
            if (candidate === null || candidate > videoDuration) {
                endTime = videoDuration;
            } else {
                endTime = candidate;
            }

            const outputFilename = path.join(outputFolder, `${baseName}_chunk_${chunkNumber}.mkv`);
            const duration = endTime - startTime;
            
            console.log(`  Creating chunk ${chunkNumber.toString().padStart(2, '0')}: ${outputFilename} (${duration.toFixed(2)} seconds)`);
            
            const ffmpegCommand = `ffmpeg -ss ${startTime} -i "${inputVideo}" -to ${duration} -c copy -y "${outputFilename}"`;
            execSync(ffmpegCommand, { stdio: 'pipe' });

            if (endTime >= videoDuration) {
                break;
            }

            keyframeIndex = candidateIndex + 1;
            
            if (keyframeIndex < keyframeCount) {
                startTime = keyframes[keyframeIndex];
            } else {
                startTime = endTime;
            }
            
            chunkNumber++;
        }

        console.log(`✅ Processing complete. Created ${chunkNumber} chunks.`);
        
        return {
            success: true,
            chunkCount: chunkNumber,
            message: `Successfully created ${chunkNumber} chunks`
        };

    } catch (error) {
        console.error('Error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {splitterProcessor};

