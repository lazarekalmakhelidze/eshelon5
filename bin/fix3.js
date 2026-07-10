const fs = require('fs');
let c = fs.readFileSync('worker/src/index.ts', 'utf8');
let lines = c.split('\n');

let mIdx = lines.findIndex(l => l.includes('filteredNews = filteredNews.filter((n: any) => (n.metadata && n.metadata.ministry === ministry));'));
if (mIdx > -1) {
    lines[mIdx] = '                filteredNews = filteredNews.filter((n: any) => ((n.metadata && n.metadata.ministry) || "ไม่ระบุกระทรวง") === ministry);';
}

let aIdx = lines.findIndex(l => l.includes('filteredNews = filteredNews.filter((n: any) => n.agency === agency || (n.metadata && n.metadata.organization === agency) || (n.metadata && n.metadata.department === agency));'));
if (aIdx > -1) {
    lines[aIdx] = '                filteredNews = filteredNews.filter((n: any) => ((n.metadata && n.metadata.department) || n.agency || "ไม่ระบุกรม") === agency);';
}

fs.writeFileSync('worker/src/index.ts', lines.join('\n'));
console.log('Fixed filter logic');
