// Render several stills from one bundle: node scripts/stills.mjs out/dir 200 529 896 ...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'path';
const [out, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const browserExecutable = process.env.REMOTION_BROWSER || null;
const inputProps = JSON.parse(process.env.PROPS || '{}');
const composition = await selectComposition({ serveUrl, id: 'IntroVertical', inputProps, browserExecutable });
for (const fr of frames) {
  await renderStill({ composition, serveUrl, frame: +fr, output: `${out}/f${fr}.jpg`, imageFormat: 'jpeg', jpegQuality: 80, scale: 0.5, inputProps, browserExecutable });
  console.log('still', fr);
}
