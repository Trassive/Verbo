const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function splitterProcessor({Job}){
    const outputFolder = path.join(__dirname ,"./processing-pipeline/workers/splitter/chunks")
    console.log(Job)
    splitter({Job }, outputFolder)
}

async function splitter(inputVideo, outputFolder, chunkDuration = 20, maxGap = 5) {
    try {
        // 1. Validate inputs
        if (!inputVideo || !outputFolder) {
            throw new Error('Both inputVideo and outputFolder are required');
        }
        console.log("Hello")
        if (!fs.existsSync(inputVideo)) {
            throw new Error(`Input file not found at '${inputVideo}'`);
        }
        console.log("Hello2")
        // 2. Setup environment 
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }
        console.log("Hello3")
        const baseName = path.basename(inputVideo, path.extname(inputVideo));
        
        console.log(`Processing Video: ${inputVideo}`);
        console.log(`Output will be in MKV format inside '${outputFolder}'`);
        // 3. Get video duration
        const durationCommand = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputVideo}"`;
        const videoDuration = parseFloat(execSync(durationCommand, { encoding: 'utf8' }).trim());

        // 4. Get keyframe times
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

        // 5. Split video using keyframe array
        let startTime = 0;
        let chunkNumber = 1;
        let keyframeIndex = 0;
        const keyframeCount = keyframes.length;

        while (startTime < videoDuration) {
            const targetEnd = startTime + chunkDuration;
            
            // Find next suitable keyframe AFTER current start
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

            // If still no candidate, use video end
            let endTime;
            if (candidate === null || candidate > videoDuration) {
                endTime = videoDuration;
            } else {
                endTime = candidate;
            }

            // Generate output filename
            const outputFilename = path.join(outputFolder, `${baseName}_chunk_${chunkNumber}.mkv`);
            const duration = endTime - startTime;
            
            console.log(`  Creating chunk ${chunkNumber.toString().padStart(2, '0')}: ${outputFilename} (${duration.toFixed(2)} seconds)`);
            
            // Split video
            const ffmpegCommand = `ffmpeg -ss ${startTime} -i "${inputVideo}" -to ${duration} -c copy -y "${outputFilename}"`;
            execSync(ffmpegCommand, { stdio: 'pipe' });

            // Exit if we've reached end of video
            if (endTime >= videoDuration) {
                break;
            }

            // Move to next keyframe AFTER the one we just used
            keyframeIndex = candidateIndex + 1;
            
            // If we have more keyframes, set next start to next keyframe
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

// Example usage:
// async function example() {
//     const result = await splitVideo(
//         '/path/to/your/video.mp4',
//         '/path/to/output/folder',
//         20,  // chunk duration in seconds
//         5    // max gap in seconds
//     );
    
//     if (result.success) {
//         console.log('Video splitting completed successfully!');
//     } else {
//         console.error('Video splitting failed:', result.error);
//     }
// }
