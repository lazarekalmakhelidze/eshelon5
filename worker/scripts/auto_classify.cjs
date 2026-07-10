const { execSync } = require('child_process');
const fs = require('fs');

console.log("Fetching unclassified questions...");
const output = execSync('npx wrangler d1 execute preexam --remote --command="SELECT id, skill, question_text FROM questions WHERE catalogs = \'[]\'" --json', { encoding: 'utf-8' });

let data;
try {
    const parsed = JSON.parse(output);
    data = parsed[0].results;
} catch (e) {
    console.error("Failed to parse output", e);
    process.exit(1);
}

console.log(`Found ${data.length} questions to classify.`);

let sqlUpdates = [];

data.forEach(row => {
    let newCatalog = null;
    const text = (row.question_text || "").toLowerCase();
    const skill = (row.skill || "").toLowerCase();

    if (skill.includes('อังกฤษ') || skill.includes('english')) {
        if (text.includes('conversation') || (text.includes('a:') && text.includes('b:'))) newCatalog = "CONVERSATION";
        else if (text.includes('vocabulary') || text.includes('meaning') || text.includes('synonym') || text.includes('closest')) newCatalog = "VOCABULARY";
        else if (text.includes('passage') || text.includes('read the following') || text.length > 500) newCatalog = "READING";
        else newCatalog = "STRUCTURE"; // Default English
    } 
    else if (skill.includes('กฎหมาย') || skill.includes('ข้าราชการ')) {
        if (text.includes('บริหารราชการแผ่นดิน')) newCatalog = "พ.ร.บ.บริหารราชการแผ่นดิน";
        else if (text.includes('บ้านเมืองที่ดี')) newCatalog = "พ.ร.ฎ.กิจการบ้านเมืองที่ดี";
        else if (text.includes('ทางปกครอง')) newCatalog = "พ.ร.บ.วิธีปฏิบัติราชการทางปกครอง";
        else if (text.includes('จริยธรรม')) newCatalog = "พ.ร.บ.มาตรฐานทางจริยธรรม";
        else if (text.includes('ละเมิด')) newCatalog = "พ.ร.บ.ความรับผิดทางละเมิดฯ";
        else if (text.includes('อาญา') || text.includes('ตำแหน่งหน้าที่')) newCatalog = "ป.อาญา ความผิดต่อตำแหน่งหน้าที่";
        else newCatalog = "พ.ร.บ.บริหารราชการแผ่นดิน"; // Default Law
    }
    else {
        // Analysis / Math / Thai
        if (text.includes('อนุกรม') || text.match(/\d+\s*,\s*\d+\s*,\s*\d+/)) newCatalog = "อนุกรม";
        else if (text.includes('>') || text.includes('<') || text.includes('≥') || text.includes('≤') || text.includes('=')) newCatalog = "เงื่อนไขสัญลักษณ์";
        else if (text.includes('ตาราง') || text.includes('ร้อยละ') || text.includes('เปอร์เซ็นต์')) newCatalog = "ตาราง";
        else if (text.includes(':') && text.includes('::')) newCatalog = "อุปมาอุปไมย";
        else if (text.includes('เรียงลำดับ') || text.includes('ข้อใดเป็นลำดับ')) newCatalog = "เรียงประโยค";
        else if (text.includes('ข้อสรุป') || text.includes('สอดคล้อง') || text.includes('อนุมาน')) newCatalog = "สรุปความ";
        else if (text.includes('เงื่อนไข')) newCatalog = "เงื่อนไขภาษา";
        else newCatalog = "เลขทั่วไป"; // Default Math
    }

    if (newCatalog) {
        sqlUpdates.push(`UPDATE questions SET catalogs = '["${newCatalog}"]' WHERE id = '${row.id}';`);
    }
});

if (sqlUpdates.length > 0) {
    fs.writeFileSync('scripts/auto_updates.sql', sqlUpdates.join('\n'));
    console.log(`Generated ${sqlUpdates.length} updates. Executing...`);
    try {
        execSync('npx wrangler d1 execute preexam --remote --file=scripts/auto_updates.sql', { stdio: 'inherit' });
        console.log("Success!");
    } catch (e) {
        console.error("Execution failed.");
    }
} else {
    console.log("No updates to make.");
}
