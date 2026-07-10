const fs = require('fs');
const { execSync } = require('child_process');

const questions = [
    {
        id: '412',
        text: '<p>1 &nbsp;&nbsp;&nbsp; 2 &nbsp;&nbsp;&nbsp; 3 &nbsp;&nbsp;&nbsp; 6 &nbsp;&nbsp;&nbsp; 11 &nbsp;&nbsp;&nbsp; 20 &nbsp;&nbsp;&nbsp; 37 &nbsp;&nbsp;&nbsp; 68 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '112', B: '115', C: '120', D: '125' }),
        correct: 'D',
        explanation: '<p><strong>ตอบ 4) 125</strong></p><p>ผลรวมของ 3 พจน์หน้า = พจน์ถัดไป<br/>20 + 37 + 68 = <strong>125</strong></p>'
    },
    {
        id: '413',
        text: '<p>1 &nbsp;&nbsp;&nbsp; 3 &nbsp;&nbsp;&nbsp; 5 &nbsp;&nbsp;&nbsp; 9 &nbsp;&nbsp;&nbsp; 17 &nbsp;&nbsp;&nbsp; 31 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '55', B: '56', C: '57', D: '58' }),
        correct: 'C',
        explanation: '<p><strong>ตอบ 3) 57</strong></p><p>ผลรวมของ 3 พจน์หน้า = พจน์ถัดไป<br/>1 + 3 + 5 = 9<br/>3 + 5 + 9 = 17<br/>5 + 9 + 17 = 31<br/>9 + 17 + 31 = <strong>57</strong></p>'
    },
    {
        id: '414',
        text: '<p>1 &nbsp;&nbsp;&nbsp; 7/3 &nbsp;&nbsp;&nbsp; 12/3 &nbsp;&nbsp;&nbsp; 18/3 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '25/3', B: '27/3', C: '2', D: '4' }),
        correct: 'A',
        explanation: '<p><strong>ตอบ 1) 25/3</strong></p><p>แปลงพจน์แรก (1) ให้เป็นเศษส่วนที่มีส่วนเป็น 3 จะได้ 3/3<br/>พิจารณาเฉพาะตัวเศษ: 3, 7, 12, 18<br/>ระยะห่างตัวเศษเพิ่มขึ้นทีละ 1 (+4, +5, +6)<br/>ดังนั้นตัวเศษถัดไปคือ 18 + 7 = 25<br/>ส่วนยังคงเป็น 3 เหมือนเดิม จึงตอบ <strong>25/3</strong></p>'
    },
    {
        id: '415',
        text: '<p>2 &nbsp;&nbsp;&nbsp; 3 &nbsp;&nbsp;&nbsp; 4 &nbsp;&nbsp;&nbsp; 5 &nbsp;&nbsp;&nbsp; 6 &nbsp;&nbsp;&nbsp; 8 &nbsp;&nbsp;&nbsp; 8 &nbsp;&nbsp;&nbsp; 12 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '8', B: '10', C: '12', D: '14' }),
        correct: 'B',
        explanation: '<p><strong>ตอบ 2) 10</strong></p><p>เป็นอนุกรม 2 ชุดสลับกัน<br/>ชุดที่ 1 (ตำแหน่งคี่): 2, 4, 6, 8, <strong>10</strong> (เพิ่มทีละ 2)<br/>ชุดที่ 2 (ตำแหน่งคู่): 3, 5, 8, 12 (เพิ่มทีละ +2, +3, +4)<br/>ตัวที่หายไปคือลำดับคี่ของชุดที่ 1 จึงตอบ <strong>10</strong></p>'
    },
    {
        id: '416',
        text: '<p>-7 &nbsp;&nbsp;&nbsp; -1 &nbsp;&nbsp;&nbsp; 7 &nbsp;&nbsp;&nbsp; 17 &nbsp;&nbsp;&nbsp; 29 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '38', B: '40', C: '43', D: '45' }),
        correct: 'C',
        explanation: '<p><strong>ตอบ 3) 43</strong></p><p>ระยะห่างผลต่างเพิ่มขึ้นทีละ 2<br/>-7 (+6) -> -1 (+8) -> 7 (+10) -> 17 (+12) -> 29 (+14) -> <strong>43</strong></p>'
    },
    {
        id: '417',
        text: '<p>2 &nbsp;&nbsp;&nbsp; 5 &nbsp;&nbsp;&nbsp; 12 &nbsp;&nbsp;&nbsp; 28 &nbsp;&nbsp;&nbsp; 58 &nbsp;&nbsp;&nbsp; 107 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '156', B: '169', C: '180', D: '195' }),
        correct: 'C',
        explanation: '<p><strong>ตอบ 3) 180</strong></p><p>ระยะห่างเพิ่มขึ้นหลายชั้น<br/>ชั้นที่ 1: +3, +7, +16, +30, +49, <strong>+73</strong><br/>ชั้นที่ 2: +4, +9, +14, +19, <strong>+24</strong><br/>ชั้นที่ 3: +5, +5, +5, <strong>+5</strong><br/>ชั้นที่ 3 เพิ่มทีละ 5 คงที่ จึงได้ชั้นที่สองเป็น 19+5=24 และชั้นแรกเป็น 49+24=73<br/>ดังนั้นคำตอบคือ 107 + 73 = <strong>180</strong></p>'
    }
];

let sql = '';
for (const q of questions) {
    const textEscaped = q.text.replace(/'/g, "''");
    const choicesEscaped = q.choices.replace(/'/g, "''");
    const explEscaped = q.explanation.replace(/'/g, "''");
    sql += `INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('${q.id}', '${textEscaped}', '${choicesEscaped}', '${q.correct}', '${explEscaped}', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["อนุกรม"]', '2559');\n`;
}

fs.writeFileSync('insert_new_q_2.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 2...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_2.sql', { stdio: 'inherit' });
console.log('Inserted questions part 2.');
