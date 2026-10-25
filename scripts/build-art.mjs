import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from '../public/js/icons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/assets/categories');
await mkdir(out, { recursive: true });

const W = 640, H = 440;
const esc = value => String(value);

function iconPath(name, size = 150, x = W / 2, y = H / 2 - 18, stroke = 7) {
  const scale = size / 24;
  return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${scale})" fill="none" stroke="url(#gold)" stroke-width="${stroke / scale}" stroke-linecap="round" stroke-linejoin="round" opacity="0.96">${ICONS[name] || ICONS.star}</g>`;
}

function glow(x = W / 2, y = H / 2, r = 170, color = '#f5c86b', opacity = 0.28) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}" filter="url(#soft)"/>`;
}

function stars(count = 34, seed = 1) {
  let out = '';
  let s = seed;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < count; i += 1) {
    const x = rand() * W;
    const y = rand() * H * 0.66;
    const r = 0.7 + rand() * 1.8;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff7dc" opacity="${(0.2 + rand() * 0.6).toFixed(2)}"/>`;
  }
  return out;
}

function mountains(color = '#0b0e24', opacity = 0.8) {
  return `<path d="M0 330 L95 245 L180 305 L270 205 L370 315 L470 250 L560 315 L640 265 V440 H0Z" fill="${color}" opacity="${opacity}"/>`;
}

function hills(color = '#090b1c', opacity = 0.9) {
  return `<path d="M0 365 Q120 300 245 355 T640 335 V440 H0Z" fill="${color}" opacity="${opacity}"/>`;
}

function frame(color = '#f5c86b') {
  return `<rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="28" fill="none" stroke="${color}" stroke-opacity=".18" stroke-width="2"/>`;
}

function rays(cx, cy, count = 18, radius = 260, color = '#f5c86b') {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * 82;
    const y1 = cy + Math.sin(a) * 82;
    const x2 = cx + Math.cos(a) * radius;
    const y2 = cy + Math.sin(a) * radius;
    out += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-opacity="${(0.05 + (i % 3) * 0.035).toFixed(3)}" stroke-width="${i % 3 === 0 ? 3 : 7}"/>`;
  }
  return out;
}

const motifs = {
  creation: (c) => `
    ${stars(38, 7)}
    ${glow(W / 2, 210, 185, c.color, 0.3)}
    ${rays(W / 2, 210, 20, 290, c.color)}
    <circle cx="320" cy="210" r="86" fill="url(#sun)" opacity=".95"/>
    ${mountains('#0a0d22', .86)}
    ${hills('#080a19', .94)}
    <g opacity=".9">${iconPath('sun', 70, 320, 210, 4)}</g>
    <path d="M110 350c18-40 30-58 42-58 15 0 22 25 34 58Z" fill="#0a1228"/>
    <path d="M468 350c18-40 30-58 42-58 15 0 22 25 34 58Z" fill="#0a1228"/>
  `,
  'red-sea': (c) => `
    ${stars(28, 3)}
    ${glow(320, 170, 180, c.color, 0.34)}
    <circle cx="320" cy="165" r="62" fill="url(#sun)" opacity=".8"/>
    <path d="M0 260 Q120 210 220 262 T440 258 T640 248 V440 H0Z" fill="#10214a" opacity=".55"/>
    <path d="M0 310 Q90 250 190 306 T400 300 T640 286 V440 H0Z" fill="#0c1737" opacity=".9"/>
    <path d="M0 340 Q80 300 170 340 T360 338 T640 326 V440 H0Z" fill="#070c24"/>
    <path d="M276 440 C260 370 285 312 320 280 C355 312 380 370 364 440Z" fill="#f5c86b" opacity=".13"/>
    <path d="M286 440 C274 378 294 326 320 300 C346 326 366 378 354 440Z" fill="#f5c86b" opacity=".18"/>
    <path d="M0 355 Q100 315 200 355 T400 352 T640 340" fill="none" stroke="#6fd9ff" stroke-opacity=".3" stroke-width="4"/>
    <path d="M0 385 Q100 345 200 385 T400 382 T640 370" fill="none" stroke="#6fd9ff" stroke-opacity=".18" stroke-width="3"/>
    ${iconPath('waves', 84, 320, 245, 5)}
  `,
  crown: (c) => `
    ${stars(42, 11)}
    ${glow(320, 205, 180, c.color, 0.3)}
    ${mountains('#0b0c20', .75)}
    ${hills('#080916', .94)}
    <path d="M190 310h260l-24-126-62 54-44-88-44 88-62-54-24 126Z" fill="url(#goldfill)" opacity=".92"/>
    <circle cx="320" cy="172" r="9" fill="#fff5cc"/>
    <circle cx="234" cy="202" r="7" fill="#fff5cc"/>
    <circle cx="406" cy="202" r="7" fill="#fff5cc"/>
    <rect x="188" y="318" width="264" height="18" rx="9" fill="#f5c86b" opacity=".8"/>
    <path d="M148 370h344" stroke="#f5c86b" stroke-opacity=".2" stroke-width="2"/>
  `,
  scroll: (c) => `
    ${stars(34, 5)}
    ${glow(320, 205, 165, '#ff9a6a', 0.3)}
    <path d="M160 130h290a28 28 0 0 1 0 56H190a32 32 0 0 0 0 64h262a28 28 0 0 1 0 56H172" fill="#f4e5c6" opacity=".94"/>
    <path d="M172 130a34 34 0 0 0 0 68h-12a30 30 0 0 1 0-68Z" fill="#d6bd90"/>
    <path d="M440 306a34 34 0 0 0 0-68h12a30 30 0 0 1 0 68Z" fill="#d6bd90"/>
    <path d="M210 186h176M210 216h140M210 262h178M210 292h120" stroke="#8a6b3f" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>
    ${iconPath('scroll', 54, 320, 120, 4)}
    <path d="M320 356c0-22 14-30 14-46 1 18 16 22 16 46a22 22 0 0 1-44 0Z" fill="#ff9a6a" opacity=".9"/>
    <path d="M330 356c0-14 8-18 8-28 0 10 10 14 10 28a13 13 0 0 1-26 0Z" fill="#ffe3a3"/>
  `,
  harp: (c) => `
    ${stars(36, 13)}
    ${glow(320, 215, 165, c.color, 0.36)}
    ${mountains('#0a0c20', .65)}
    ${hills('#080a18', .92)}
    <path d="M250 105c0 130 46 204 150 240l45 28" fill="none" stroke="url(#gold)" stroke-width="13" stroke-linecap="round"/>
    <path d="M250 105v272M250 105h112M250 377h195" fill="none" stroke="url(#gold)" stroke-width="9" stroke-linecap="round"/>
    <path d="M300 110c3 80 24 142 65 184M350 110c3 65 18 116 47 153M250 140h115M250 190h100M250 240h80M250 290h55" fill="none" stroke="#f5c86b" stroke-opacity=".55" stroke-width="4"/>
    <g fill="#f5c86b" opacity=".85"><circle cx="440" cy="120" r="9"/><circle cx="478" cy="165" r="7"/><circle cx="446" cy="210" r="8"/></g>
    <path d="M448 120v58a14 14 0 1 1-7 12M488 165v50" stroke="#f5c86b" stroke-width="3" fill="none" opacity=".7"/>
  `,
  manger: (c) => `
    ${stars(50, 17)}
    ${glow(320, 185, 190, '#f5c86b', 0.36)}
    ${rays(320, 185, 16, 240, '#f5c86b')}
    <path d="M320 78l15 31 34 5-25 24 6 34-30-16-30 16 6-34-25-24 34-5 15-31Z" fill="url(#goldfill)"/>
    <path d="M210 340V238l110-76 110 76v102Z" fill="#0d1026" opacity=".96"/>
    <path d="M190 344 L320 150 L450 344" fill="none" stroke="#f5c86b" stroke-opacity=".35" stroke-width="5"/>
    <path d="M284 340v-58a36 36 0 0 1 72 0v58Z" fill="#050713"/>
    <path d="M272 340h96" stroke="#f5c86b" stroke-opacity=".35" stroke-width="4"/>
    <path d="M236 364h168" stroke="#f5c86b" stroke-opacity=".18" stroke-width="3"/>
  `,
  lamp: (c) => `
    ${stars(32, 19)}
    ${glow(320, 195, 175, '#f5c86b', 0.36)}
    ${rays(320, 195, 14, 240, '#f5c86b')}
    ${mountains('#0a0c20', .68)}
    ${hills('#080a18', .94)}
    <path d="M256 168h128l16 72H240l16-72Z" fill="url(#goldfill)" opacity=".9"/>
    <path d="M248 240c0 45-22 53-22 78a94 94 0 0 0 188 0c0-25-22-33-22-78" fill="#f3dfb5" opacity=".92"/>
    <path d="M320 238c0-28 14-40 14-62 6 22 22 34 22 62a36 36 0 0 1-72 0c0-18 10-28 18-38 2 20 18 20 18 38Z" fill="#ffb45e"/>
    <path d="M320 238c0-18 8-26 8-40 2 14 14 22 14 40a22 22 0 0 1-44 0c0-10 6-18 12-24 0 12 10 14 10 24Z" fill="#fff0b8"/>
    <path d="M272 318h96" stroke="#fff" stroke-opacity=".18" stroke-width="4"/>
  `,
  'waves': (c) => `
    ${stars(24, 23)}
    ${glow(320, 150, 160, '#6fd9ff', 0.24)}
    <path d="M0 235 Q80 190 160 235 T320 235 T480 235 T640 235 V440 H0Z" fill="#0b1737"/>
    <path d="M0 285 Q90 235 180 285 T360 285 T540 285 T720 285" fill="none" stroke="#6fd9ff" stroke-opacity=".35" stroke-width="6"/>
    <path d="M0 335 Q110 275 220 335 T440 335 T660 335" fill="none" stroke="#6fd9ff" stroke-opacity=".22" stroke-width="5"/>
    <path d="M0 385 Q110 325 220 385 T440 385 T660 385" fill="none" stroke="#6fd9ff" stroke-opacity=".14" stroke-width="4"/>
    <path d="M375 70l-45 92h54l-32 88 78-112h-49l40-68Z" fill="url(#goldfill)" opacity=".9"/>
    ${iconPath('spark', 74, 470, 150, 5)}
  `,
  flame: (c) => `
    ${stars(30, 29)}
    ${glow(320, 230, 190, '#ff9a6a', 0.32)}
    ${mountains('#0a0c20', .65)}
    ${hills('#080a18', .92)}
    <path d="M320 84c0 64-52 76-52 136 0 22 12 34 24 44-6-38 18-62 34-82-2 38 40 56 40 104 0 50-34 82-82 82s-82-34-82-84c0-42 24-62 42-84 10 34 22 38 30 54 4-56 46-80 46-170Z" fill="url(#fire)" opacity=".92"/>
    <path d="M320 178c0 42-30 52-30 88 0 24 18 40 40 40 28 0 44-22 44-46 0-32-28-44-34-82-2 20-12 34-24 42 4-20 4-32 4-42Z" fill="#ffe8a8" opacity=".8"/>
    <path d="M170 354c20-52 96-58 150-30 54-28 130-22 150 30" fill="none" stroke="#ff9a6a" stroke-opacity=".3" stroke-width="5"/>
  `,
  well: (c) => `
    ${stars(34, 31)}
    ${glow(320, 178, 160, '#c084fc', 0.3)}
    <circle cx="472" cy="110" r="44" fill="#ffe9b0" opacity=".8"/>
    <path d="M0 330 Q140 285 280 330 T640 315 V440 H0Z" fill="#0a0c20"/>
    <path d="M225 230h190v130H225Z" fill="#0c1833"/>
    <path d="M215 230h210l-28-42H243l-28 42Z" fill="#16264c"/>
    <path d="M250 360v-92h140v92" fill="#0a1228"/>
    <path d="M250 288h140M320 268v92" stroke="#f5c86b" stroke-opacity=".35" stroke-width="4"/>
    <path d="M290 388h60" stroke="#c084fc" stroke-opacity=".45" stroke-width="8" stroke-linecap="round"/>
    <path d="M120 360c0-70 18-116 52-116 28 0 42 46 42 116" fill="none" stroke="#0a0c20" stroke-width="14"/>
    <path d="M130 330c34-12 66-8 86 8M136 302c30-10 58-6 76 8M144 274c24-8 48-4 62 8" stroke="#16264c" stroke-width="9" stroke-linecap="round"/>
  `,
  lion: (c) => `
    ${stars(36, 37)}
    ${glow(320, 205, 185, c.color, 0.28)}
    ${mountains('#0a0c20', .62)}
    ${hills('#080a18', .94)}
    <circle cx="320" cy="205" r="131" fill="none" stroke="#f5c86b" stroke-opacity=".16" stroke-width="2"/>
    ${iconPath('lion', 215, 320, 205, 7)}
    <path d="M180 342h280" stroke="#f5c86b" stroke-opacity=".18" stroke-width="3"/>
  `,
  map: (c) => `
    ${stars(30, 41)}
    ${glow(320, 210, 170, '#62d9c8', 0.24)}
    <path d="M118 128l120-42 130 46 154-46v242l-154 46-130-46-120 42V128Z" fill="#0b1330" stroke="#f5c86b" stroke-opacity=".28" stroke-width="3"/>
    <path d="M238 86v232M368 132v242" stroke="#f5c86b" stroke-opacity=".22" stroke-width="2"/>
    <path d="M150 290c40-30 44-78 88-84 34-5 42 32 82 20 44-13 80 8 116-20" fill="none" stroke="#62d9c8" stroke-opacity=".45" stroke-width="4" stroke-dasharray="7 9"/>
    <circle cx="238" cy="206" r="10" fill="#f5c86b"/>
    <circle cx="420" cy="226" r="8" fill="#f5c86b" opacity=".7"/>
    <path d="M320 156l16 34 36 4-27 24 7 36-32-18-32 18 7-36-27-24 36-4 16-34Z" fill="none" stroke="#f5c86b" stroke-opacity=".8" stroke-width="3"/>
  `,
  letter: (c) => `
    ${stars(32, 43)}
    ${glow(320, 210, 170, '#a5b4fc', 0.32)}
    <rect x="150" y="145" width="340" height="218" rx="20" fill="#f3e6c9" opacity=".95"/>
    <path d="M150 165l170 122 170-122" fill="none" stroke="#a8895d" stroke-width="7" stroke-linejoin="round"/>
    <path d="M150 345l116-92M490 345l-116-92" stroke="#a8895d" stroke-opacity=".55" stroke-width="4"/>
    <circle cx="320" cy="248" r="46" fill="url(#goldfill)" opacity=".9"/>
    ${iconPath('dove', 54, 320, 246, 4)}
    <path d="M432 80c-32 16-44 58-28 92 8-24 28-42 52-48" fill="none" stroke="#f5c86b" stroke-width="5" stroke-linecap="round" opacity=".75"/>
    <path d="M474 94l26 26-44 26" fill="none" stroke="#f5c86b" stroke-width="4" stroke-linecap="round" opacity=".55"/>
  `,
  throne: (c) => `
    ${stars(44, 47)}
    ${glow(320, 200, 210, '#f5c86b', 0.38)}
    <path d="M110 250a210 210 0 0 1 420 0" fill="none" stroke="url(#rainbow)" stroke-width="20" opacity=".5"/>
    ${rays(320, 240, 16, 240, '#f5c86b')}
    <path d="M250 356V238l70-52 70 52v118Z" fill="#0b1028"/>
    <path d="M228 356h184l-18-26H246l-18 26Z" fill="#f5c86b" opacity=".35"/>
    <path d="M270 238h100v-40l-50-36-50 36v40Z" fill="#13234d"/>
    <path d="M320 146v-36M300 120h40" stroke="#f5c86b" stroke-width="5" stroke-linecap="round"/>
    <path d="M236 320h168M236 344h168" stroke="#f5c86b" stroke-opacity=".2" stroke-width="3"/>
    <circle cx="320" cy="236" r="18" fill="none" stroke="#f5c86b" stroke-width="3" opacity=".7"/>
  `,
  seven: (c) => `
    ${stars(50, 53)}
    ${glow(320, 210, 180, '#c4b5fd', 0.32)}
    <g fill="none" stroke="#f5c86b" stroke-width="4" opacity=".8">
      <circle cx="320" cy="210" r="132"/>
      <circle cx="320" cy="210" r="104" stroke-opacity=".5"/>
      <circle cx="320" cy="210" r="76" stroke-opacity=".3"/>
    </g>
    <g fill="url(#goldfill)">
      <path d="M320 84l8 18 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2 8-18Z"/>
      <path d="M438 142l8 18 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2 8-18Z"/>
      <path d="M466 252l8 18 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2 8-18Z"/>
      <path d="M398 344l8 18 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2 8-18Z"/>
      <path d="M242 344l8 18 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2 8-18Z"/>
      <path d="M174 252l8 18 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2 8-18Z"/>
      <path d="M202 142l8 18 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2 8-18Z"/>
    </g>
    <circle cx="320" cy="210" r="34" fill="#0b1028" stroke="#f5c86b" stroke-opacity=".5" stroke-width="3"/>
    <path d="M312 197l16-3-8 28" fill="none" stroke="#f5c86b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  `
};

const defs = (c) => `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.accent}"/>
      <stop offset=".52" stop-color="#131a3c"/>
      <stop offset="1" stop-color="#070a17"/>
    </linearGradient>
    <radialGradient id="sun" cx=".5" cy=".4" r=".5">
      <stop offset="0" stop-color="#fff8d8"/>
      <stop offset=".45" stop-color="${c.color}"/>
      <stop offset="1" stop-color="${c.color}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1bd"/>
      <stop offset=".5" stop-color="#f5c86b"/>
      <stop offset="1" stop-color="#d99a3c"/>
    </linearGradient>
    <linearGradient id="goldfill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff2c0"/>
      <stop offset=".55" stop-color="#f5c86b"/>
      <stop offset="1" stop-color="#cf9137"/>
    </linearGradient>
    <linearGradient id="fire" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe9a8"/>
      <stop offset=".45" stop-color="#ffb45e"/>
      <stop offset="1" stop-color="#ff6a5e"/>
    </linearGradient>
    <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6fe0c1"/>
      <stop offset=".33" stop-color="#f5c86b"/>
      <stop offset=".66" stop-color="#ff8fb1"/>
      <stop offset="1" stop-color="#8b7bf7"/>
    </linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="34"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".05"/></feComponentTransfer>
    </filter>
  </defs>`;

const categoryData = [
  ['creation', '#f0b45e', '#7c5cff'],
  ['red-sea', '#ff8b6a', '#9a4cff'],
  ['crown', '#e8c267', '#a855f7'],
  ['scroll', '#ff7d8d', '#ff7c3f'],
  ['harp', '#6fe0c1', '#3f6fff'],
  ['manger', '#f5c86b', '#ff6a8a'],
  ['lamp', '#8b7bf7', '#1fa8a0'],
  ['waves', '#4fa8ff', '#0f4aa8'],
  ['flame', '#ff9f43', '#e2395e'],
  ['well', '#ff8fb1', '#7c4dff'],
  ['lion', '#f5c86b', '#b65a1e'],
  ['map', '#62d9c8', '#2f6bff'],
  ['letter', '#a5b4fc', '#a34dff'],
  ['throne', '#ffb56b', '#d8456e'],
  ['seven', '#c4b5fd', '#2fa8a0']
];

for (const [key, color, accent] of categoryData) {
  const c = { color, accent };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${key} artwork">
${defs(c)}
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" filter="url(#grain)" opacity=".7"/>
  ${motifs[key](c)}
  ${frame(c.color)}
</svg>`;
  await writeFile(join(out, `${key}.svg`), svg);
}

// Hero artwork: a wide, layered sunrise with an open Bible and dove.
const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 720" width="900" height="720" role="img" aria-label="A sunrise over open Scripture with a descending dove">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#141b44"/>
      <stop offset=".45" stop-color="#3b2c63"/>
      <stop offset=".72" stop-color="#b45d63"/>
      <stop offset="1" stop-color="#f0b45e"/>
    </linearGradient>
    <radialGradient id="sunGlow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff6cf"/>
      <stop offset=".35" stop-color="#ffd789"/>
      <stop offset="1" stop-color="#ffd789" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffaf0"/>
      <stop offset="1" stop-color="#e9d9b9"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffeab0"/>
      <stop offset="1" stop-color="#d79b3d"/>
    </linearGradient>
    <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b2450"/>
      <stop offset="1" stop-color="#090d20"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".045"/></feComponentTransfer></filter>
  </defs>
  <rect width="900" height="720" fill="url(#sky)"/>
  <circle cx="450" cy="330" r="255" fill="url(#sunGlow)" opacity=".85"/>
  <circle cx="450" cy="330" r="105" fill="#ffe9a8" opacity=".95"/>
  <g fill="#fff6db" opacity=".8">
    <circle cx="120" cy="92" r="2"/><circle cx="205" cy="150" r="1.5"/><circle cx="315" cy="70" r="2.2"/>
    <circle cx="590" cy="84" r="1.8"/><circle cx="690" cy="138" r="2.4"/><circle cx="792" cy="74" r="1.4"/>
    <circle cx="752" cy="212" r="1.8"/><circle cx="86" cy="240" r="1.5"/><circle cx="176" cy="318" r="1.3"/>
    <circle cx="665" cy="280" r="1.7"/><circle cx="824" cy="312" r="1.3"/><circle cx="360" cy="132" r="1.2"/>
  </g>
  <g opacity=".22" stroke="#ffe9b0" stroke-width="2">
    <path d="M450 200v-190M450 200L300 30M450 200 600 30M450 200 210 110M450 200 690 110M450 200 250 270M450 200 650 270"/>
  </g>
  <path d="M0 520l115-92 86 58 96-114 112 118 92-60 102 74 80-112 117 116v212H0Z" fill="#141c42" opacity=".75"/>
  <path d="M0 590l130-72 96 62 108-90 104 90 104-64 138 82 120-60v182H0Z" fill="url(#hill)"/>
  <path d="M0 640q180-58 350-16t550-8v104H0Z" fill="#070a17"/>
  <g transform="translate(450 540)">
    <path d="M-212 24c70-28 130-28 212 4 82-32 142-32 212-4v128c-72-24-134-20-212 10-78-30-140-34-212-10Z" fill="#0a0d1e" opacity=".55"/>
    <path d="M-196 0c66-24 124-22 196 8 72-30 130-32 196-8v118c-66-22-124-20-196 8-72-28-130-30-196-8Z" fill="url(#page)"/>
    <path d="M0 8v126" stroke="#b89a66" stroke-width="5" opacity=".55"/>
    <path d="M-164 30c44-14 82-12 132 6M-164 54c44-14 82-12 132 6M-164 78c44-14 82-12 132 6M-164 102c34-10 66-10 104 2M32 36c44-16 86-18 132-6M32 60c44-16 86-18 132-6M32 84c44-16 86-18 132-6M32 108c34-12 66-12 104-2" fill="none" stroke="#9b7d50" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>
    <path d="M-212 74l-28-16v86l28 16M212 74l28-16v86l-28 16" fill="#d9c19a"/>
    <circle cx="0" cy="70" r="25" fill="none" stroke="url(#gold)" stroke-width="4" opacity=".9"/>
    <path d="M0 55l5 10 11 1-8 8 2 11-10-5-10 5 2-11-8-8 11-1 5-10Z" fill="url(#gold)"/>
  </g>
  <g transform="translate(642 210)">
    <path d="M0 58c46-30 94-30 128-4 18 14 12 42-12 46-28 5-44-16-62-16-22 0-34 16-56 8-16-6-10-26 2-34Z" fill="#fdf6e4" opacity=".95"/>
    <path d="M28 38c-22-28-20-58 2-74 0 28 18 38 34 54-10 18-22 24-36 20Z" fill="#fdf6e4" opacity=".8"/>
    <path d="M92 88c18-6 34-4 50 6-16 2-26 8-34 18" fill="none" stroke="#fdf6e4" stroke-width="5" stroke-linecap="round" opacity=".55"/>
  </g>
  <rect width="900" height="720" filter="url(#grain)" opacity=".8"/>
</svg>`;
await writeFile(join(root, 'public/assets/hero.svg'), hero);
console.log('Generated category artwork and hero illustration.');
