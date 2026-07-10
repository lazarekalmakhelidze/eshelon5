const fs = require('fs');
const { execSync } = require('child_process');

const qData = [
    {
        id: '498',
        text: '<p><strong>93. จากข้อความต่อไปนี้ ข้อใดเป็นประโยคลำดับที่ 2</strong></p><p>1. ชุมชนจึงควรมีบทบาทในการป้องกันและพัฒนาป่าชายเลนให้ยั่งยืน<br/>2. ปัจจุบันปัญหาการบุกรุกป่าชายเลนเกิดขึ้นอย่างต่อเนื่อง<br/>3. ปัญหาเหล่านี้ส่งผลกระทบต่อระบบนิเวศของป่าชายเลน เป็นการทำลายห่วงโซ่อาหารและแหล่งอาหารของมนุษย์<br/>4. ไม่ว่าจะเป็นการลักลอบตัดไม้ การสร้างถนน การทำนากุ้ง การสร้างท่าเทียบเรือ</p>',
        choices: JSON.stringify({
            A: 'ชุมชนจึงควรมีบทบาทในการป้องกันและพัฒนาป่าชายเลนให้ยั่งยืน',
            B: 'ปัจจุบันปัญหาการบุกรุกป่าชายเลนเกิดขึ้นอย่างต่อเนื่อง',
            C: 'ปัญหาเหล่านี้ส่งผลกระทบต่อระบบนิเวศของป่าชายเลน เป็นการทำลายห่วงโซ่อาหารและแหล่งอาหารของมนุษย์',
            D: 'ไม่ว่าจะเป็นการลักลอบตัดไม้ การสร้างถนน การทำนากุ้ง การสร้างท่าเทียบเรือ'
        }),
        ans: 'D',
        exp: '<p><strong>ตอบ 4) ไม่ว่าจะเป็นการลักลอบตัดไม้ การสร้างถนน การทำนากุ้ง การสร้างท่าเทียบเรือ</strong></p><p>เรียบเรียงเป็นบทความได้เป็น <strong>2 - 4 - 3 - 1</strong> ดังนี้<br/>ปัจจุบันปัญหาการบุกรุกป่าชายเลนเกิดขึ้นอย่างต่อเนื่อง (2)<br/>ไม่ว่าจะเป็นการลักลอบตัดไม้ การสร้างถนน การทำนากุ้ง การสร้างท่าเทียบเรือ (4)<br/>ปัญหาเหล่านี้ส่งผลกระทบต่อระบบนิเวศของป่าชายเลน เป็นการทำลายห่วงโซ่อาหารและแหล่งอาหารของมนุษย์ (3)<br/>ชุมชนจึงควรมีบทบาทในการป้องกันและพัฒนาป่าชายเลนให้ยั่งยืน (1)</p><p>โจทย์ถามหาประโยคลำดับที่ 2 ซึ่งก็คือข้อ 4.</p>',
        catalogs: '["เรียงประโยค"]'
    }
];

let sql = '';
for (const q of qData) {
    const textEscaped = q.text.replace(/'/g, "''");
    const choicesEscaped = q.choices.replace(/'/g, "''");
    const explEscaped = q.exp.replace(/'/g, "''");
    
    sql += `INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('${q.id}', '${textEscaped}', '${choicesEscaped}', '${q.ans}', '${explEscaped}', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '${q.catalogs}', '2559');\n`;
}

fs.writeFileSync('insert_new_q_16.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 16...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_16.sql', { stdio: 'inherit' });
console.log('Inserted questions part 16.');
