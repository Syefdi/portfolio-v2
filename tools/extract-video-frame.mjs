/**
 * Extracts still frames from the walkthrough recording.
 *
 * The recording is real product footage and the only genuine screenshot material
 * in the repository, but at 35 MB it is not something to ship to every visitor
 * or commit to git. This pulls frames out of it with a headless browser and a
 * canvas, which avoids needing ffmpeg installed.
 *
 * Usage: node tools/extract-video-frame.mjs [seconds...]
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firefox } from 'playwright';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_PATH = 'assets/videos/erm-demo.mp4';
const OUTPUT_DIR = join(projectRoot, 'assets', 'images');
const PORT = 8911;

const timestamps = process.argv.slice(2).map(Number).filter((value) => !Number.isNaN(value));
const targets = timestamps.length > 0 ? timestamps : [4, 10, 18];

function startServer() {
  const server = createServer(async (request, response) => {
    const filePath = join(projectRoot, decodeURIComponent(request.url.slice(1)));

    if (!filePath.startsWith(projectRoot)) {
      response.writeHead(403).end();
      return;
    }

    try {
      const stats = await stat(filePath);
      response.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': stats.size });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });

  return new Promise((done) => server.listen(PORT, '127.0.0.1', () => done(server)));
}

async function main() {
  const server = await startServer();
  const browser = await firefox.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  try {
    await page.setContent(
      `<body style="margin:0;background:#000">
         <video id="clip" src="http://127.0.0.1:${PORT}/${VIDEO_PATH}" muted preload="auto"></video>
       </body>`,
    );

    const ready = await page.evaluate(
      () =>
        new Promise((done) => {
          const clip = document.getElementById('clip');
          const fail = (reason) => done({ ok: false, reason });

          clip.addEventListener('loadeddata', () =>
            done({ ok: true, duration: clip.duration, width: clip.videoWidth, height: clip.videoHeight }),
          );
          clip.addEventListener('error', () =>
            fail(clip.error ? `media error code ${clip.error.code}` : 'unknown media error'),
          );
          setTimeout(() => fail('timed out waiting for video data'), 45000);
        }),
    );

    if (!ready.ok) {
      throw new Error(`The browser could not decode the recording: ${ready.reason}`);
    }

    console.log(`Loaded ${ready.width}x${ready.height}, ${ready.duration.toFixed(1)}s`);
    await mkdir(OUTPUT_DIR, { recursive: true });

    for (const seconds of targets) {
      if (seconds >= ready.duration) {
        console.log(`  skipped ${seconds}s (beyond the ${ready.duration.toFixed(1)}s runtime)`);
        continue;
      }

      const dataUrl = await page.evaluate(
        (target) =>
          new Promise((done, fail) => {
            const clip = document.getElementById('clip');

            const capture = () => {
              const canvas = document.createElement('canvas');
              canvas.width = clip.videoWidth;
              canvas.height = clip.videoHeight;
              canvas.getContext('2d').drawImage(clip, 0, 0);
              done(canvas.toDataURL('image/png'));
            };

            clip.addEventListener('seeked', capture, { once: true });
            setTimeout(() => fail(new Error(`seek to ${target}s never completed`)), 20000);
            clip.currentTime = target;
          }),
        seconds,
      );

      const fileName = `erm-frame-${String(seconds).padStart(2, '0')}s.png`;
      await writeFile(join(OUTPUT_DIR, fileName), Buffer.from(dataUrl.split(',')[1], 'base64'));
      console.log(`  wrote assets/images/${fileName}`);
    }
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
}

main().catch((error) => {
  console.error(`Frame extraction failed: ${error.message}`);
  process.exitCode = 1;
});
