import axios from 'axios';
import fs from 'fs';
import path from 'path';

const ASSETS_DIR = path.join(process.cwd(), 'public', 'assets');

export async function downloadFile(
  url: string,
  filename: string,
  subdir: string = ''
): Promise<string> {
  const dir = path.join(ASSETS_DIR, subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, filename);

  if (fs.existsSync(filePath)) {
    console.log(`    ↩️  Using cached: ${filename}`);
    return filePath;
  }

  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 60000,
    headers: { 'User-Agent': 'auto-video-remotion/1.0' },
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    writer.on('finish', () => resolve(filePath));
    writer.on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

export function inferExtension(url: string, fallback = '.mp4'): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext || fallback;
  } catch {
    return fallback;
  }
}
