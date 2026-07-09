import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { extname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import sharp from 'sharp';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inputDir = resolve(projectRoot, 'public/assets/images/daps-original');
const outputDir = resolve(projectRoot, 'public/assets/images/daps');
const overwrite = process.argv.includes('--overwrite') || process.argv.includes('--force') || process.env.npm_config_force === 'true';
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']);
const canvasSize = 800;
const productMaxSize = 700;
const lightBackground = { r: 247, g: 250, b: 252, alpha: 1 };

function toKebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

mkdirSync(inputDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

const files = readdirSync(inputDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((fileName) => supportedExtensions.has(extname(fileName).toLowerCase()));

let processed = 0;
let skipped = 0;

for (const fileName of files) {
  const sourcePath = join(inputDir, fileName);
  const outputName = `${toKebabCase(parse(fileName).name)}.webp`;
  const outputPath = join(outputDir, outputName);

  if (existsSync(outputPath) && !overwrite) {
    skipped += 1;
    console.log(`Skipped existing: ${outputName}`);
    continue;
  }

  const source = sharp(sourcePath).rotate();
  const metadata = await source.metadata();
  const hasAlpha = Boolean(metadata.hasAlpha);
  const background = hasAlpha ? { r: 255, g: 255, b: 255, alpha: 0 } : lightBackground;

  const productBuffer = await source
    .trim({
      background: hasAlpha ? { r: 0, g: 0, b: 0, alpha: 0 } : lightBackground,
      threshold: 12,
    })
    .resize({
      width: productMaxSize,
      height: productMaxSize,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 100,
      lossless: hasAlpha,
      effort: 4,
    })
    .toBuffer();

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background,
    },
  })
    .composite([
      {
        input: productBuffer,
        gravity: 'center',
      },
    ])
    .rotate()
    .webp({
      quality: 82,
      effort: 5,
      lossless: false,
    })
    .toFile(outputPath);

  processed += 1;
  console.log(`Processed: ${fileName} -> ${outputName}`);
}

console.log(`Image processing complete. processed=${processed}, skipped=${skipped}, input=${files.length}`);
if (!files.length) {
  console.log(`No supported images found in ${inputDir}`);
}
