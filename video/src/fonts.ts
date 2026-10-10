import '@fontsource/noto-sans-tc/500.css';
import '@fontsource/noto-sans-tc/700.css';
import '@fontsource/noto-sans-tc/900.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import { continueRender, delayRender } from 'remotion';

// Fontsource splits CJK fonts into unicode-range slices that load lazily; hold the first frame until
// every slice for the text actually on screen has arrived.
let started = false;
export const loadFonts = (text: string) => {
  if (started) return;
  started = true;
  const handle = delayRender('fonts');
  const sans = ['500', '700', '900'].map((w) => document.fonts.load(`${w} 40px "Noto Sans TC"`, text));
  const mono = ['500', '700'].map((w) => document.fonts.load(`${w} 40px "JetBrains Mono"`, text));
  Promise.all([...sans, ...mono]).then(() => document.fonts.ready).then(() => continueRender(handle), () => continueRender(handle));
};
