const fs = require('fs');
let c = fs.readFileSync('worker/src/index.ts', 'utf8');
let lines = c.split('\n');
let idx = lines.findIndex(l => l.includes('if (agency && agency !== \'undefined\')'));
if (idx > -1) {
    lines.splice(idx, 0, '            const ministry = url.searchParams.get(\'ministry\');', '            if (ministry && ministry !== \'undefined\') {', '                filteredNews = filteredNews.filter((n: any) => (n.metadata && n.metadata.ministry === ministry));', '            }');
    fs.writeFileSync('worker/src/index.ts', lines.join('\n'));
    console.log("Fixed successfully.");
} else {
    console.log("Could not find insertion point.");
}
