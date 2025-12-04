const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath && ffprobePath.path) ffmpeg.setFfprobePath(ffprobePath.path);

const inputVideo = path.resolve(__dirname, '../public/video.mp4');
const outDir = path.resolve(__dirname, '../public/analysis');

if (!fs.existsSync(inputVideo)) {
  console.error('Input video not found at', inputVideo);
  process.exit(1);
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  try {
    // Get duration
    const meta = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputVideo, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    const duration = (meta.format && meta.format.duration) ? Number(meta.format.duration) : 0;
    if (!duration) {
      console.warn('Could not determine video duration, defaulting to first 5 seconds.');
    }

    // Choose 5 evenly spaced timestamps (but avoid 0)
    const count = 5;
    const timestamps = [];
    for (let i = 0; i < count; i++) {
      const t = duration ? Math.max(0.5, Math.min(duration - 0.5, ((i + 1) * duration) / (count + 1))) : 0.5 + i * 1;
      timestamps.push(t.toFixed(2));
    }

    console.log('Extracting frames at timestamps (s):', timestamps.join(', '));

    // Use fluent-ffmpeg to take single-frame screenshots at each timestamp
    let i = 0;
    for (const ts of timestamps) {
      const outFile = path.join(outDir, `frame_${i + 1}.jpg`);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve, reject) => {
        ffmpeg(inputVideo)
          .outputOptions(['-y', '-ss', ts, '-vframes 1'])
          .output(outFile)
          .on('end', () => {
            console.log('Saved', outFile);
            resolve();
          })
          .on('error', (err) => reject(err))
          .run();
      });
      i++;
    }

    console.log('Done. Frames saved to', outDir);
  } catch (err) {
    console.error('Error extracting frames:', err);
    process.exit(1);
  }
})();
