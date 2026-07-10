const fs = require('fs');
const { execSync } = require('child_process');

const qData = [
    {
        id: '499',
        text: '<p><strong>Conversation 1</strong><br/>In the cafeteria<br/>Robert : What do you want to do today ?<br/>Amy : . . . <strong>(1)</strong> . . .<br/>Robert : What\'s that ?<br/>Amy : . . . (2) . . . to people you don\'t know very well. It\'s good for networking and social events.<br/>Robert : . . . (3) . . . It must help fill up silences and make the situation more comfortable.<br/>Amy : It does. You can talk about the weather, news, sports, movies anything not too serious.</p><p><strong>1. เลือกคำตอบเพื่อเติมลงในช่องว่าง (1)</strong></p>',
        choices: JSON.stringify({ A: "I'd do it again", B: "I'd like to practice small talk", C: "I'd rather keep quiet", D: "I'd better speak faster" }),
        ans: 'B',
        exp: '<p><strong>ตอบ 2) I\'d like to practice small talk (ฉันต้องการฝึกการพูดคุยเล็กๆน้อยๆ)</strong></p><p>เนื่องจากในประโยคถัดมา Robert ถามว่า "What\'s that?" (นั่นคืออะไร) และ Amy อธิบายต่อว่ามันคือการคุยกับคนที่ไม่ค่อยรู้จักดี ซึ่งก็คือความหมายของคำว่า "small talk" นั่นเอง</p>',
        catalogs: '["บทสนทนา (Conversation)"]'
    },
    {
        id: '500',
        text: '<p><strong>Conversation 1</strong><br/>In the cafeteria<br/>Robert : What do you want to do today ?<br/>Amy : . . . (1) . . .<br/>Robert : What\'s that ?<br/>Amy : . . . <strong>(2)</strong> . . . to people you don\'t know very well. It\'s good for networking and social events.<br/>Robert : . . . (3) . . . It must help fill up silences and make the situation more comfortable.<br/>Amy : It does. You can talk about the weather, news, sports, movies anything not too serious.</p><p><strong>2. เลือกคำตอบเพื่อเติมลงในช่องว่าง (2)</strong></p>',
        choices: JSON.stringify({ A: "It's a story told", B: "It's a speech given", C: "It's a way of listening", D: "It's a skill for talking" }),
        ans: 'D',
        exp: '<p><strong>ตอบ 4) It\'s a skill for talking (มันเป็นทักษะสำหรับการพูด)</strong></p><p>คำอธิบายความหมายของ Small talk คือทักษะการพูดคุยกับคนอื่น (skill for talking to people you don\'t know very well)</p>',
        catalogs: '["บทสนทนา (Conversation)"]'
    },
    {
        id: '501',
        text: '<p><strong>Conversation 1</strong><br/>In the cafeteria<br/>Robert : What do you want to do today ?<br/>Amy : . . . (1) . . .<br/>Robert : What\'s that ?<br/>Amy : . . . (2) . . . to people you don\'t know very well. It\'s good for networking and social events.<br/>Robert : . . . <strong>(3)</strong> . . . It must help fill up silences and make the situation more comfortable.<br/>Amy : It does. You can talk about the weather, news, sports, movies anything not too serious.</p><p><strong>3. เลือกคำตอบเพื่อเติมลงในช่องว่าง (3)</strong></p>',
        choices: JSON.stringify({ A: "That is skillful", B: "That is the real deal", C: "That could be useful", D: "That avoids the problem" }),
        ans: 'C',
        exp: '<p><strong>ตอบ 3) That could be useful (มันอาจจะมีประโยชน์)</strong></p><p>Robert เห็นด้วยและเสริมว่า มันคงช่วยเติมเต็มความเงียบและทำให้สถานการณ์ผ่อนคลายขึ้นได้ ซึ่งสอดคล้องกับคำว่า "มันน่าจะมีประโยชน์" (useful)</p>',
        catalogs: '["บทสนทนา (Conversation)"]'
    },
    {
        id: '502',
        text: '<p><strong>Conversation 2</strong><br/>Tour assistant : Ladies and gentleman. . . . <strong>(4)</strong> . . . before we board for the cruise.<br/>Tourist : Sorry to interrupt, but . . . (5) . . . I can\'t hear you.<br/>Tour assistant : Certainly. . . . (6) . . . to always have your passport with you or else you won\'t be allowed to get on the boat.<br/>Tourist : . . . (7) . . . I don\'t have my passport. What should I do ?<br/>Tour assistant : (Sighing) . . . (8) . . .</p><p><strong>4. เลือกคำตอบเพื่อเติมลงในช่องว่าง (4)</strong></p>',
        choices: JSON.stringify({ A: "Listen to my description", B: "I think it's a good instruction", C: "Let me tell you my intention", D: "I've got some information for you" }),
        ans: 'D',
        exp: '<p><strong>ตอบ 4) I\'ve got some information for you (ฉันมีข้อมูลมาแจ้งให้ทราบ)</strong></p><p>บริบทคือไกด์ทัวร์กำลังจะประกาศข้อมูลสำคัญก่อนขึ้นเรือ การเกริ่นนำว่ามีข้อมูลจะแจ้งให้ทราบจึงเหมาะสมที่สุด</p>',
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

fs.writeFileSync('insert_new_q_17.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 17...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_17.sql', { stdio: 'inherit' });
console.log('Inserted questions part 17.');
