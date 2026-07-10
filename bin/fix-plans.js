const fs = require('fs');
let code = fs.readFileSync('worker/src/index.ts', 'utf8');
const route = `
if (url.pathname === "/api/payments/plans" && request.method === "GET") {
  return json({ success: true, plans: [{ id: "pro_monthly", name: "Pro Pass", price: 99, duration_days: 30 }, { id: "premium_yearly", name: "Premium Pass", price: 890, duration_days: 365 }, { id: "lifetime", name: "Lifetime VIP", price: 2990, duration_days: 9999 }] });
}
`;
code = code.replace('if (url.pathname === "/api/public/settings")', route + 'if (url.pathname === "/api/public/settings")');
fs.writeFileSync('worker/src/index.ts', code);
