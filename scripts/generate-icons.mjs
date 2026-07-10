import sharp from "sharp";

const svg = `<svg viewBox="0 0 100 100" width="1024" height="1024" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:geometricPrecision">
  <defs>
    <filter id="neon-glow" filterUnits="userSpaceOnUse">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
      <feOffset in="blur" dx="0" dy="0" result="offset-blur" />
      <feMerge>
        <feMergeNode in="offset-blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id="liquid-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00FF00" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#00FF00" stop-opacity="0.5" />
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="100" height="100" rx="10" ry="10" fill="#101827" />

  <g filter="url(#neon-glow)" stroke="#00FF00" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 45,35 L 55,35 L 75,75 Q 77,80 75,85 L 25,85 Q 23,80 25,75 L 45,35 Z" />
    <path d="M 45,35 L 55,35 L 68,60 Q 50,65 32,60 L 45,35 Z" fill="url(#liquid-gradient)" stroke="none" />

    <path d="M 40,70 Q 42,75 40,80 Q 42,85 40,90 Q 42,95 40,100" />
    <path d="M 45,72 Q 47,77 45,82 Q 47,87 45,92 Q 47,97 45,102" />
    <path d="M 50,71 Q 52,76 50,81 Q 52,86 50,91 Q 52,96 50,101" />
    <path d="M 55,73 Q 57,78 55,83 Q 57,88 55,93 Q 57,98 55,103" />
    <path d="M 60,72 Q 62,77 60,82 Q 62,87 60,92 Q 62,97 60,102" />
    <path d="M 65,71 Q 67,76 65,81 Q 67,86 65,91 Q 67,96 65,101" />

    <path d="M 50,35 V 20" />
    <path d="M 50,30 L 40,20 Q 35,15 30,20" />
    <path d="M 50,30 L 60,20 Q 65,15 70,20" />
    <path d="M 50,20 Q 50,15 45,10" />
    <path d="M 50,20 Q 50,15 55,10" />

    <g transform="translate(50, 10) rotate(-45)">
      <path d="M 0,0 L 5,-15 Q 0,-20 -5,-15 Z" />
      <path d="M 0,-5 L 2,-10 Q 0,-13 -2,-10 Z" />
      <path d="M 0,-10 L 1,-12 Q 0,-13 -1,-12 Z" />
    </g>
    <g transform="translate(30, 20) rotate(-15)">
      <path d="M 0,0 L 5,-15 Q 0,-20 -5,-15 Z" />
      <path d="M 0,-5 L 2,-10 Q 0,-13 -2,-10 Z" />
      <path d="M 0,-10 L 1,-12 Q 0,-13 -1,-12 Z" />
    </g>
    <g transform="translate(70, 20) rotate(15)">
      <path d="M 0,0 L 5,-15 Q 0,-20 -5,-15 Z" />
      <path d="M 0,-5 L 2,-10 Q 0,-13 -2,-10 Z" />
      <path d="M 0,-10 L 1,-12 Q 0,-13 -1,-12 Z" />
    </g>
  </g>
</svg>`;

const buf = Buffer.from(svg);

await Promise.all([
  sharp(buf).resize(512, 512).png().toFile("public/icon-512.png"),
  sharp(buf).resize(192, 192).png().toFile("public/icon-192.png"),
]);

console.log("Generated icon-192.png and icon-512.png");
