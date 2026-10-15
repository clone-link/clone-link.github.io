const sharp = require('sharp');
const fs = require('fs');

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#090D16" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect x="60" y="60" width="1080" height="510" rx="24" fill="#131B2E" stroke="#1F2937" stroke-width="2" />
  
  <g transform="translate(120, 130)">
    <rect width="72" height="72" rx="18" fill="#4F46E5" />
    <path d="M24 30 L36 42 L24 54" stroke="#10B981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <path d="M40 54 L52 54" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" fill="none" />
  </g>

  <text x="215" y="185" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="56" fill="#FFFFFF">Clone<tspan fill="#10B981">Link</tspan></text>
  
  <text x="120" y="280" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="44" fill="#FFFFFF">Smart Git Clone Generator</text>
  <text x="120" y="340" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="44" fill="url(#accent)">&amp; Subfolder Downloader</text>
  
  <text x="120" y="410" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="24" fill="#9CA3AF">Chained terminal commands (clone + cd + VS Code/npm) &amp; in-memory folder ZIPs.</text>
  <text x="120" y="460" font-family="monospace" font-weight="600" font-size="20" fill="#10B981">$ git clone https://... &amp;&amp; cd repo &amp;&amp; code .</text>
  
  <rect x="120" y="495" width="200" height="36" rx="18" fill="#1E293B" />
  <text x="140" y="519" font-family="monospace" font-weight="700" font-size="14" fill="#38BDF8">100% Client-Side</text>
  
  <rect x="340" y="495" width="200" height="36" rx="18" fill="#1E293B" />
  <text x="360" y="519" font-family="monospace" font-weight="700" font-size="14" fill="#A78BFA">Zero Server Logs</text>

  <text x="940" y="522" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="20" fill="#6B7280">clone-link.github.io</text>
</svg>
`;

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

sharp(Buffer.from(svg))
  .png()
  .toFile('public/og-image.png')
  .then(() => {
    console.log('Successfully generated public/og-image.png');
  })
  .catch((err) => {
    console.error('Error generating og-image.png:', err);
  });
