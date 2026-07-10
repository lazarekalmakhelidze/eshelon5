const fs = require('fs');
let code = fs.readFileSync('worker/src/index.ts', 'utf8');
const route = `
if (url.pathname === "/api/assets" && request.method === "GET") {
  return json({ success: true, data: [
    { id: 'bg1', type: 'background', url: '/assets/bgs/bg1.jpg', name: 'Classic' },
    { id: 'bg2', type: 'background', url: '/assets/bgs/bg2.jpg', name: 'Space' },
    { id: 'fr1', type: 'frame', url: '/assets/frames/fr1.png', name: 'Gold' }
  ] });
}
`;
code = code.replace('if (url.pathname === "/api/public/settings")', route + 'if (url.pathname === "/api/public/settings")');
fs.writeFileSync('worker/src/index.ts', code);
