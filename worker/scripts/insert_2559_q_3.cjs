const fs = require('fs');
const { execSync } = require('child_process');

const questions = [
    {
        id: '418',
        text: '<p>1 &nbsp;&nbsp;&nbsp; 9 &nbsp;&nbsp;&nbsp; 25 &nbsp;&nbsp;&nbsp; 49 &nbsp;&nbsp;&nbsp; 81 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '121', B: '123', C: '127', D: '129' }),
        correct: 'A',
        explanation: '<p><strong>ตอบ 1) 121</strong></p><p>ตัวเลขในอนุกรมคือเลขยกกำลังสองของจำนวนคี่:<br/>1² = 1<br/>3² = 9<br/>5² = 25<br/>7² = 49<br/>9² = 81<br/>ดังนั้นตัวต่อไปคือ 11² = <strong>121</strong></p>'
    },
    {
        id: '419',
        text: '<p>2 &nbsp;&nbsp;&nbsp; 5 &nbsp;&nbsp;&nbsp; 10 &nbsp;&nbsp;&nbsp; 4 &nbsp;&nbsp;&nbsp; 20 &nbsp;&nbsp;&nbsp; 80 &nbsp;&nbsp;&nbsp; 8 &nbsp;&nbsp;&nbsp; 80 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '670', B: '650', C: '680', D: '640' }),
        correct: 'D',
        explanation: '<p><strong>ตอบ 4) 640</strong></p><p>จัดกลุ่มชุดละ 3 ตัว โดย 2 ตัวแรกคูณกันได้ตัวที่ 3<br/>2 x 5 = 10<br/>4 x 20 = 80<br/>8 x 80 = <strong>640</strong></p>'
    },
    {
        id: '420',
        text: '<p>11 &nbsp;&nbsp;&nbsp; 99 &nbsp;&nbsp;&nbsp; 187 &nbsp;&nbsp;&nbsp; 352 &nbsp;&nbsp;&nbsp; 660 &nbsp;&nbsp;&nbsp; 1,166 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '1,728', B: '1,914', C: '1,835', D: '1,683' }),
        correct: 'B',
        explanation: '<p><strong>ตอบ 2) 1,914</strong></p><p>ทุกตัวมี 11 เป็นตัวประกอบ:<br/>11x1, 11x9, 11x17, 11x32, 11x60, 11x106, ...<br/>พิจารณาตัวคูณ: 1, 9, 17, 32, 60, 106<br/>ระยะห่างชั้นที่ 1: +8, +8, +15, +28, +46<br/>ระยะห่างชั้นที่ 2: +0, +7, +13, +18<br/>ระยะห่างชั้นที่ 3: +7, +6, +5<br/>ระยะห่างชั้นที่ 3 ลดลงทีละ 1 ดังนั้นตัวต่อไปคือ +4<br/>ไล่กลับขึ้นไป: 18+4=22, 46+22=68, 106+68=174<br/>คำตอบคือ 11 x 174 = <strong>1,914</strong></p>'
    },
    {
        id: '421',
        text: '<p>1/3 &nbsp;&nbsp;&nbsp; 4 &nbsp;&nbsp;&nbsp; 5/16 &nbsp;&nbsp;&nbsp; 21/25 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '46/368', B: '46/441', C: '42/441', D: '42/368' }),
        correct: 'B',
        explanation: '<p><strong>ตอบ 2) 46/441</strong></p><p>จัดรูปตัวเลข 4 ใหม่เป็น 4/1² (หรือ 4/1) จะได้ความสัมพันธ์ดังนี้:<br/>เศษตัวถัดไป = เศษพจน์หน้า + ส่วนพจน์หน้า<br/>ส่วนตัวถัดไป = (เศษพจน์หน้า)²<br/>1/3 -> เศษ: 1+3=4, ส่วน: 1²=1 -> 4/1<br/>4/1 -> เศษ: 4+1=5, ส่วน: 4²=16 -> 5/16<br/>5/16 -> เศษ: 5+16=21, ส่วน: 5²=25 -> 21/25<br/>21/25 -> เศษ: 21+25=46, ส่วน: 21²=441 -> <strong>46/441</strong></p>'
    },
    {
        id: '422',
        text: '<p>8 &nbsp;&nbsp;&nbsp; 2 &nbsp;&nbsp;&nbsp; 4 &nbsp;&nbsp;&nbsp; 12 &nbsp;&nbsp;&nbsp; 3 &nbsp;&nbsp;&nbsp; 4 &nbsp;&nbsp;&nbsp; 20 &nbsp;&nbsp;&nbsp; 4 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '6', B: '7', C: '5', D: '4' }),
        correct: 'C',
        explanation: '<p><strong>ตอบ 3) 5</strong></p><p>จัดกลุ่มชุดละ 3 ตัว โดยตัวแรกเป็นผลคูณของตัวที่สองและสาม (ตัวแรก = ตัวที่สอง x ตัวที่สาม)<br/>8 = 2 x 4<br/>12 = 3 x 4<br/>20 = 4 x <strong>5</strong></p>'
    },
    {
        id: '423',
        text: '<p>2,500 &nbsp;&nbsp;&nbsp; 625 &nbsp;&nbsp;&nbsp; 250 &nbsp;&nbsp;&nbsp; 175 &nbsp;&nbsp;&nbsp; 160 &nbsp;&nbsp;&nbsp; .....</p>',
        choices: JSON.stringify({ A: '125', B: '139', C: '145', D: '157' }),
        correct: 'D',
        explanation: '<p><strong>ตอบ 4) 157</strong></p><p>หาผลต่างของแต่ละพจน์:<br/>2,500 - 625 = -1875<br/>625 - 250 = -375<br/>250 - 175 = -75<br/>175 - 160 = -15<br/>สังเกตความสัมพันธ์ของผลต่าง: หาร 5 ทุกช่วง (-1875/5 = -375, -375/5 = -75, -75/5 = -15)<br/>ดังนั้นผลต่างตัวต่อไปคือ -15 / 5 = -3<br/>160 - 3 = <strong>157</strong></p>'
    }
];

let sql = '';
for (const q of questions) {
    const textEscaped = q.text.replace(/'/g, "''");
    const choicesEscaped = q.choices.replace(/'/g, "''");
    const explEscaped = q.explanation.replace(/'/g, "''");
    sql += `INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('${q.id}', '${textEscaped}', '${choicesEscaped}', '${q.correct}', '${explEscaped}', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["อนุกรม"]', '2559');\n`;
}

fs.writeFileSync('insert_new_q_3.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 3...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_3.sql', { stdio: 'inherit' });
console.log('Inserted questions part 3.');
