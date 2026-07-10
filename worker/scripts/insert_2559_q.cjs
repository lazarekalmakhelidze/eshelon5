const fs = require('fs');
const { execSync } = require('child_process');

const questions = [
    {
        id: '406',
        text: '<p>3 &nbsp;&nbsp;&nbsp; 5 &nbsp;&nbsp;&nbsp; 8 &nbsp;&nbsp;&nbsp; 13 &nbsp;&nbsp;&nbsp; 22 &nbsp;&nbsp;&nbsp; 39 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '60', B: '68', C: '72', D: '75' }),
        correct: 'C',
        explanation: '<p><strong>ตอบ 72</strong></p><p>จากความสัมพันธ์:<br/>3 (+2) - 5 (+3) - 8 (+5) - 13 (+9) - 22 (+17) - 39 (+33) - <strong>72</strong><br/>โดยระยะห่างของผลต่างคือเพิ่มขึ้น 2 เท่าตัว (+1, +2, +4, +8, +16)</p>'
    },
    {
        id: '407',
        text: '<p>10/8 &nbsp;&nbsp;&nbsp; 12/12 &nbsp;&nbsp;&nbsp; 14/20 &nbsp;&nbsp;&nbsp; 16/36 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '18/60', B: '18/62', C: '18/66', D: '18/68' }),
        correct: 'D',
        explanation: '<p><strong>ตอบ 4) 18/68</strong></p><p>แยกคิดเศษและส่วน:<br/><strong>เศษ:</strong> 10, 12, 14, 16, <strong>18</strong> (เพิ่มทีละ 2)<br/><strong>ส่วน:</strong> 8, 12, 20, 36, <strong>68</strong> (เอาส่วนตัวก่อนหน้า คูณ 2 แล้วลบ 4 เช่น (36 x 2) - 4 = 68)</p>'
    },
    {
        id: '408',
        text: '<p>1 &nbsp;&nbsp;&nbsp; 3 &nbsp;&nbsp;&nbsp; 4 &nbsp;&nbsp;&nbsp; 8 &nbsp;&nbsp;&nbsp; 15 &nbsp;&nbsp;&nbsp; 27 &nbsp;&nbsp;&nbsp; 50 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '92', B: '95', C: '98', D: '100' }),
        correct: 'A',
        explanation: '<p><strong>ตอบ 1) 92</strong></p><p>ผลรวมของ 3 พจน์หน้า = พจน์ถัดไป<br/>1 + 3 + 4 = 8<br/>3 + 4 + 8 = 15<br/>4 + 8 + 15 = 27<br/>8 + 15 + 27 = 50<br/>จะได้ 15 + 27 + 50 = <strong>92</strong></p>'
    },
    {
        id: '409',
        text: '<p>7 &nbsp;&nbsp;&nbsp; 11 &nbsp;&nbsp;&nbsp; 77 &nbsp;&nbsp;&nbsp; 9 &nbsp;&nbsp;&nbsp; 11 &nbsp;&nbsp;&nbsp; 99 &nbsp;&nbsp;&nbsp; 9 &nbsp;&nbsp;&nbsp; 10 &nbsp;&nbsp;&nbsp; 90 &nbsp;&nbsp;&nbsp; 8 &nbsp;&nbsp;&nbsp; 13 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '80', B: '100', C: '104', D: '111' }),
        correct: 'C',
        explanation: '<p><strong>ตอบ 3) 104</strong></p><p>แบ่งตัวเลขเป็นชุดละ 3 ตัว โดย 2 ตัวแรกคูณกันได้ตัวที่ 3<br/>7 x 11 = 77<br/>9 x 11 = 99<br/>9 x 10 = 90<br/>8 x 13 = <strong>104</strong></p>'
    },
    {
        id: '410',
        text: '<p>14 &nbsp;&nbsp;&nbsp; 15 &nbsp;&nbsp;&nbsp; 17 &nbsp;&nbsp;&nbsp; 20 &nbsp;&nbsp;&nbsp; 24 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '27', B: '28', C: '29', D: '30' }),
        correct: 'C',
        explanation: '<p><strong>ตอบ 3) 29</strong></p><p>ระยะห่างเพิ่มขึ้นทีละ 1<br/>14 (+1) - 15 (+2) - 17 (+3) - 20 (+4) - 24 (+5) - <strong>29</strong></p>'
    },
    {
        id: '411',
        text: '<p>1 &nbsp;&nbsp;&nbsp; 8 &nbsp;&nbsp;&nbsp; 18 &nbsp;&nbsp;&nbsp; 36 &nbsp;&nbsp;&nbsp; 67 &nbsp;&nbsp;&nbsp; 116 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '186', B: '188', C: '185', D: '187' }),
        correct: 'B',
        explanation: '<p><strong>ตอบ 2) 188</strong></p><p>จากความสัมพันธ์:<br/>1 (+7) - 8 (+10) - 18 (+18) - 36 (+31) - 67 (+49) - 116 (+72) - <strong>188</strong><br/>ระยะห่างชั้นที่ 2: +3, +8, +13, +18, +23 (เพิ่มทีละ 5)</p>'
    }
];

let sql = '';
for (const q of questions) {
    const textEscaped = q.text.replace(/'/g, "''");
    const choicesEscaped = q.choices.replace(/'/g, "''");
    const explEscaped = q.explanation.replace(/'/g, "''");
    sql += `INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('${q.id}', '${textEscaped}', '${choicesEscaped}', '${q.correct}', '${explEscaped}', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["อนุกรม"]', '2559');\n`;
}

fs.writeFileSync('insert_new_q.sql', sql, 'utf-8');
console.log('Running SQL insertion...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q.sql', { stdio: 'inherit' });
console.log('Inserted questions.');
