const fs = require('fs');
const { execSync } = require('child_process');

const conv2Text = (target) => {
    let t = '<p><strong>Conversation 2</strong><br/>Tour assistant : Ladies and gentleman. . . . (4) . . . before we board for the cruise.<br/>Tourist : Sorry to interrupt, but . . . ';
    t += target === 5 ? '<strong>(5)</strong>' : '(5)';
    t += ' . . . I can\'t hear you.<br/>Tour assistant : Certainly. . . . ';
    t += target === 6 ? '<strong>(6)</strong>' : '(6)';
    t += ' . . . to always have your passport with you or else you won\'t be allowed to get on the boat.<br/>Tourist : . . . ';
    t += target === 7 ? '<strong>(7)</strong>' : '(7)';
    t += ' . . . I don\'t have my passport. What should I do ?<br/>Tour assistant : (Sighing) . . . ';
    t += target === 8 ? '<strong>(8)</strong>' : '(8)';
    t += ' . . .</p>';
    return t;
};

const qData = [
    {
        id: '503',
        text: conv2Text(5) + '<p><strong>5. เลือกคำตอบเพื่อเติมลงในช่องว่าง (5)</strong></p>',
        choices: JSON.stringify({ A: "can you lower your volume ?", B: "could you please speak a little louder ?", C: "would you like to speak out ?", D: "do you mind making a loud noise ?" }),
        ans: 'B',
        exp: '<p><strong>ตอบ 2) could you please speak a little louder ? (คุณกรุณาพูดให้ดังขึ้นอีกหน่อยได้ไหม)</strong></p><p>นักท่องเที่ยวบอกว่าไม่ได้ยิน (I can\'t hear you) จึงต้องขอให้ไกด์พูดให้ดังขึ้น</p>',
        catalogs: '["บทสนทนา (Conversation)"]'
    },
    {
        id: '504',
        text: conv2Text(6) + '<p><strong>6. เลือกคำตอบเพื่อเติมลงในช่องว่าง (6)</strong></p>',
        choices: JSON.stringify({ A: "Please be sure", B: "Don't remember", C: "It's a pleasure", D: "Do you hear me" }),
        ans: 'A',
        exp: '<p><strong>ตอบ 1) Please be sure (กรุณาตรวจสอบให้แน่ใจ)</strong></p><p>ไกด์ย้ำเตือนให้แน่ใจว่าต้องพกพาสปอร์ตติดตัวไว้เสมอ (to always have your passport with you)</p>',
        catalogs: '["บทสนทนา (Conversation)"]'
    },
    {
        id: '505',
        text: conv2Text(7) + '<p><strong>7. เลือกคำตอบเพื่อเติมลงในช่องว่าง (7)</strong></p>',
        choices: JSON.stringify({ A: "How great !", B: "Truly,", C: "Oh, no!", D: "Hopefully" }),
        ans: 'C',
        exp: '<p><strong>ตอบ 3) Oh, no! (โอ้ ไม่นะ)</strong></p><p>นักท่องเที่ยวเพิ่งรู้ตัวว่าไม่มีพาสปอร์ต จึงใช้อุทานเพื่อแสดงความตกใจกับปัญหา</p>',
        catalogs: '["บทสนทนา (Conversation)"]'
    },
    {
        id: '506',
        text: conv2Text(8) + '<p><strong>8. เลือกคำตอบเพื่อเติมลงในช่องว่าง (8)</strong></p>',
        choices: JSON.stringify({ A: "You made my day.", B: "Are you serious ?", C: "Is it your mistake ?", D: "I don't mind." }),
        ans: 'B',
        exp: '<p><strong>ตอบ 2) Are you serious ? (คุณพูดจริงไหม)</strong></p><p>ไกด์มีอาการถอนหายใจ (Sighing) และถามด้วยความเหนื่อยใจหรือตกใจว่าคุณพูดจริงหรือเปล่าที่ไม่ได้พกพาสปอร์ตมา ซึ่งเป็นเรื่องสำคัญมากก่อนขึ้นเรือ</p>',
        catalogs: '["บทสนทนา (Conversation)"]'
    }
];

let sql = '';
for (const q of qData) {
    const textEscaped = q.text.replace(/'/g, "''");
    const choicesEscaped = q.choices.replace(/'/g, "''");
    const explEscaped = q.exp.replace(/'/g, "''");
    
    sql += `INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('${q.id}', '${textEscaped}', '${choicesEscaped}', '${q.ans}', '${explEscaped}', 'ก.พ.', 'ภาษาอังกฤษ', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '${q.catalogs}', '2559');\n`;
}

fs.writeFileSync('insert_new_q_18.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 18...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_18.sql', { stdio: 'inherit' });
console.log('Inserted questions part 18.');
