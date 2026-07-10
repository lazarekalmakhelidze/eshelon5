const fs = require('fs');
const { execSync } = require('child_process');

const getReadingText = (target) => {
    let t = '<p><strong>Travelling with children : Tips, trick and good ideas</strong></p>';
    t += '<p><u>Books</u><br/>If your child suffers from travel sickness, try to avoid books as . . . ';
    t += target === 9 ? '<strong>(9)</strong>' : '(9)';
    t += ' . . . in the car. However, for children who travel well, a coloring book and a set of crayons, or a picture book, will keep them entertained on long . . . ';
    t += target === 10 ? '<strong>(10)</strong>' : '(10)';
    t += ' . . .</p>';
    t += '<p><u>Foods</u><br/>Try not to pack cans of fizzy drinks or chocolates as . . . ';
    t += target === 11 ? '<strong>(11)</strong>' : '(11)';
    t += ' . . . to eat in the car. Keep a damp cloth in a plastic bag or box to . . . ';
    t += target === 12 ? '<strong>(12)</strong>' : '(12)';
    t += ' . . . their faces and fingers and a plastic bag for wrappers the other . . . ';
    t += target === 13 ? '<strong>(13)</strong>' : '(13)';
    t += ' . . .</p>';
    return t;
};

const qData = [
    {
        id: '507',
        text: getReadingText(9) + '<p><strong>9. เลือกคำตอบเพื่อเติมลงในช่องว่าง (9)</strong></p>',
        choices: JSON.stringify({ A: "entertainment", B: "supplement", C: "education", D: "exercise" }),
        ans: 'A',
        exp: '<p><strong>ตอบ 1) entertainment (ความบันเทิง)</strong></p><p>จากบริบท "หลีกเลี่ยงการใช้หนังสือเป็น...ในรถ" คำที่เหมาะสมที่สุดคือ ความบันเทิง (entertainment)</p>',
        catalogs: '["คำศัพท์ (Vocabulary)"]'
    },
    {
        id: '508',
        text: getReadingText(10) + '<p><strong>10. เลือกคำตอบเพื่อเติมลงในช่องว่าง (10)</strong></p>',
        choices: JSON.stringify({ A: "vacation", B: "wanderings", C: "journeys", D: "roaming" }),
        ans: 'C',
        exp: '<p><strong>ตอบ 3) journeys (การเดินทาง)</strong></p><p>จากบริบท "ทำให้พวกเขาเพลิดเพลินใน...ที่ยาวนาน" คำที่เข้ากับบริบทการนั่งรถคือ การเดินทาง (journeys)</p>',
        catalogs: '["คำศัพท์ (Vocabulary)"]'
    },
    {
        id: '509',
        text: getReadingText(11) + '<p><strong>11. เลือกคำตอบเพื่อเติมลงในช่องว่าง (11)</strong></p>',
        choices: JSON.stringify({ A: "meals", B: "appetizers", C: "snacks", D: "breakfast" }),
        ans: 'C',
        exp: '<p><strong>ตอบ 3) snacks (ขนม/อาหารว่าง)</strong></p><p>ช็อคโกแลตและน้ำอัดลม ถือเป็นอาหารว่างหรือขนม (snacks) ไม่ใช่มื้ออาหารหลัก (meals)</p>',
        catalogs: '["คำศัพท์ (Vocabulary)"]'
    },
    {
        id: '510',
        text: getReadingText(12) + '<p><strong>12. เลือกคำตอบเพื่อเติมลงในช่องว่าง (12)</strong></p>',
        choices: JSON.stringify({ A: "rub", B: "wipe", C: "touch", D: "scrub" }),
        ans: 'B',
        exp: '<p><strong>ตอบ 2) wipe (เช็ด)</strong></p><p>จากบริบท "เตรียมผ้าเปียกเพื่อ...หน้าและนิ้วมือ" คำกริยาที่เหมาะสมกับผ้าเปียกคือ เช็ด (wipe)</p>',
        catalogs: '["คำศัพท์ (Vocabulary)"]'
    },
    {
        id: '511',
        text: getReadingText(13) + '<p><strong>13. เลือกคำตอบเพื่อเติมลงในช่องว่าง (13)</strong></p>',
        choices: JSON.stringify({ A: "boxes", B: "dirt", C: "cans", D: "trash" }),
        ans: 'D',
        exp: '<p><strong>ตอบ 4) trash (ขยะ)</strong></p><p>จากบริบท "เตรียมถุงพลาสติกไว้สำหรับใส่ห่อขนมและ...อื่นๆ" สิ่งที่ต้องทิ้งรวมกับห่อขนมคือ ขยะ (trash)</p>',
        catalogs: '["คำศัพท์ (Vocabulary)"]'
    },
    {
        id: '512',
        text: '<p><strong>14. The manager has no objection to . . . . the meeting since his daughter is ill.</strong></p>',
        choices: JSON.stringify({ A: "John not attend", B: "John does not attend", C: "John's not attending", D: "John not to attend" }),
        ans: 'C',
        exp: '<p><strong>ตอบ 3) John\'s not attending</strong></p><p>คำแปล : ผู้จัดการไม่คัดค้านการที่จอห์นไม่เข้าประชุม เพราะลูกสาวของเขาป่วย<br/>สังเกตคำว่า objection to . . . ต้องตามด้วยคำนามหรือ gerund (v.ing) ซึ่งมีเพียงตัวเลือกเดียวที่มี -ing คือตัวเลือกที่ 3</p>',
        catalogs: '["ไวยากรณ์ (Grammar)"]'
    },
    {
        id: '513',
        text: '<p><strong>15. As soon as the examinees . . . . the test, the score . . . .</strong></p>',
        choices: JSON.stringify({ A: "finish, will report", B: "will finish, will report", C: "finish, will be reported", D: "will finish, will be report" }),
        ans: 'C',
        exp: '<p><strong>ตอบ 3) finish, will be reported</strong></p><p>คำแปล : ทันทีที่ผู้เข้าสอบทำแบบทดสอบเสร็จ คะแนนจะถูกรายงานทันที<br/>ประโยคแรก "As soon as the examinees . . . . the test" เป็น present simple จึงใช้คำว่า finish<br/>ประโยคที่สอง "the score . . . ." เป็น passive voice รูปประโยคคือ v. to be + v.3 จึงใช้คำว่า will be reported</p>',
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

fs.writeFileSync('insert_new_q_19.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 19...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_19.sql', { stdio: 'inherit' });
console.log('Inserted questions part 19.');
