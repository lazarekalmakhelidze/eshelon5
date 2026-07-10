const fs = require('fs');
let c = fs.readFileSync('worker/src/index.ts', 'utf8');
let lines = c.split('\n');

let idx = lines.findIndex(l => l.includes('const pType = (job.metadata && job.metadata.position_type)'));
if (idx > -1) {
    lines.splice(idx, 0, '                    let jobCount = (job.metadata && job.metadata.vacancy_count) ? parseInt(job.metadata.vacancy_count) : 1;', '                    if (isNaN(jobCount)) jobCount = 1;');
}

let idx2 = lines.findIndex(l => l.includes('if (pType.includes("ข้าราชการ")) countCivil += 1;'));
if (idx2 > -1) {
    lines[idx2] = '                    if (pType.includes("ข้าราชการ")) countCivil += jobCount;';
    lines[idx2+1] = '                    else if (pType.includes("พนักงานราชการ")) countEmployee += jobCount;';
    lines[idx2+2] = '                    else countOther += jobCount;';
}

let idx3 = lines.findIndex(l => l.includes('statsMap[ministry].departments[department].count += 1;'));
if (idx3 > -1) {
    lines[idx3] = '                    statsMap[ministry].departments[department].count += jobCount;';
}

fs.writeFileSync('worker/src/index.ts', lines.join('\n'));
console.log('Fixed count logic');
