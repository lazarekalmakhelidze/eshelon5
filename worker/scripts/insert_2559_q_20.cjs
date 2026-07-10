const fs = require('fs');
const { execSync } = require('child_process');

const qData = [
    {
        id: '514',
        text: '<p><strong>16. The salesperson asked that the customer . . . . the receipt in order to exchange the goods previously bought.</strong></p>',
        choices: JSON.stringify({ A: "show", B: "shows", C: "to show", D: "must show" }),
        ans: 'A',
        exp: '<p><strong>ตอบ 1) show</strong></p><p>คำแปล : พนักงานขายขอให้ลูกค้าแสดงใบเสร็จ เพื่อเปลี่ยนสินค้าที่ซื้อไปก่อนหน้านี้<br/>สังเกตคำว่า "asked that" เป็น subjunctive กริยาต่อท้ายไม่ผันตามประธานและไม่ต้องเติม -s จึงตอบ show<br/>Subjunctive ที่น่าสนใจและอาจออกสอบ ได้แก่ ask, request, suggest, demand + that</p>',
        catalogs: '["ไวยากรณ์ (Grammar)"]'
    },
    {
        id: '515',
        text: '<p><strong>17. Three-hundred and sixty bath . . . . too much for these pants. Can I have them for less ?</strong></p>',
        choices: JSON.stringify({ A: "is", B: "had been", C: "are being", D: "have been" }),
        ans: 'A',
        exp: '<p><strong>ตอบ 1) is</strong></p><p>คำแปล : 360 บาท แพงเกินไปสำหรับกางเกงตัวนี้ ฉันขอราคาที่ถูกลงได้ไหม<br/>สังเกตประโยค "Can I have them for less ?" อยู่ในรูปของ present = เป็นปัจจุบัน<br/>จำนวนเงิน (Three-hundred and sixty baht) ถือเป็นคำนามเอกพจน์เสมอ จึงเลือกตอบ is เนื่องจากอยู่ในรูปเอกพจน์ที่เป็นปัจจุบัน</p>',
        catalogs: '["ไวยากรณ์ (Grammar)"]'
    },
    {
        id: '516',
        text: '<p><strong>18. During World War II, all inhabitants of that small village in the North of Thailand . . . .</strong></p>',
        choices: JSON.stringify({ A: "were killed with poison", B: "being killed by poisoning", C: "killed of poison", D: "had been killed of poison" }),
        ans: 'A',
        exp: '<p><strong>ตอบ 1) were killed with poison</strong></p><p>คำแปล : ระหว่างสงครามโลกครั้งที่ 2 ผู้อยู่อาศัยในหมู่บ้านเล็ก ๆ ทางเหนือของประเทศไทยถูกวางยาพิษ<br/>ประโยคพูดถึงเหตุการณ์ในอดีตที่จบลงแล้ว (During World War II) จึงต้องใช้ past simple tense และประธานเป็นผู้ถูกกระทำจึงอยู่ในรูป passive voice (v. to be + v.3) คือ were killed with poison</p>',
        catalogs: '["ไวยากรณ์ (Grammar)"]'
    }
];

let sql = '';
for (const q of qData) {
    const textEscaped = q.text.replace(/'/g, "''");
    const choicesEscaped = q.choices.replace(/'/g, "''");
    const explEscaped = q.exp.replace(/'/g, "''");
    
    sql += `INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('${q.id}', '${textEscaped}', '${choicesEscaped}', '${q.ans}', '${explEscaped}', 'ก.พ.', 'ภาษาอังกฤษ', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '${q.catalogs}', '2559');\n`;
}

fs.writeFileSync('insert_new_q_20.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 20...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_20.sql', { stdio: 'inherit' });
console.log('Inserted questions part 20.');
