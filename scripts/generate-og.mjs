import sharp from "sharp";

const bg = sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { r: 11, g: 15, b: 25, alpha: 255 },
  },
});

const icon = await sharp("public/icon-clean.png")
  .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const textSvg = Buffer.from(`<svg width="550" height="400" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="120" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="bold" fill="#ffffff">Language</text>
  <rect x="0" y="145" width="120" height="3" rx="1.5" fill="#00FF66" opacity="0.6" />
  <text x="0" y="210" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="300" fill="rgba(255,255,255,0.6)">LAB</text>
  <text x="0" y="280" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="rgba(255,255,255,0.45)">AI-powered English &amp; Japanese</text>
  <text x="0" y="310" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="rgba(255,255,255,0.45)">Study Notes</text>
</svg>`);

const textBuf = await sharp(textSvg).png().toBuffer();

await bg
  .composite([
    { input: icon, left: 80, top: 115 },
    { input: textBuf, left: 550, top: 115 },
  ])
  .png()
  .toFile("public/og-image.png");

console.log("Generated public/og-image.png (1200x630)");
