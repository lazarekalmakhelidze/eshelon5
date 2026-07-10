const fs = require('fs');
const { execSync } = require('child_process');

const getReadingText = () => {
    let t = '<p><strong>Reading 2</strong></p>';
    t += '<p>The Great Sphinx of Giza in Egypt is a 20.22 meter tall stone figure of a lion with the head of a human. The structure of the Sphinx is cut entirely out of rock. Some people believe that there is a hidden area inside which people can enter, but no one has yet found a way to get in. Many stories have been told about the Great Sphinx as if it were a living creature and had the human qualities of being strong and wise.</p>';
    t += '<p>There is one story about a young man who fell asleep next to the Great Sphinx. The man had gone hunting that day and he was tired. As he slept, the man dreamt that he would become the King of Egypt if he cleared away the desert sand that was partially covering the Sphinx.</p>';
    t += '<p>But the story oddly had no ending. What do you think happened? Did the boy clean the sand away from the Sphinx ? Did he become King of Egypt ? No one seems to know.</p>';
    t += '<p>Over time, wind and sand have worn away part of the Great Sphinx\'s nose as well as other areas. However, it is now being restored to look much like it once did.</p>';
    return t;
};

const qData = [
    {
        id: '522',
        text: getReadingText() + '<p><strong>24. What is the story mainly about ?</strong></p>',
        choices: JSON.stringify({ A: "A lion", B: "An animal", C: "A king", D: "A statue" }),
        ans: 'D',
        exp: '<p><strong>ตอบ 4) A statue</strong></p><p>What is the story mainly about ? ใจความสำคัญของเรื่องคืออะไร<br/>1. A lion สิงโต<br/>2. An animal สัตว์<br/>3. A king กษัตริย์<br/>4. A statue รูปปั้น<br/>เนื้อเรื่องทั้งหมดกล่าวถึงรูปปั้นสฟิงซ์ (The Great Sphinx of Giza)</p>',
        catalogs: '["บทความ (Reading)"]'
    },
    {
        id: '523',
        text: getReadingText() + '<p><strong>25. Which of the following is TRUE about the young man in the story ?</strong></p>',
        choices: JSON.stringify({ A: "He became King of Egypt.", B: "The day's hunting tired him out.", C: "He dreamt that the Sphinx came alive.", D: "He thought he saw the Sphinx's nose." }),
        ans: 'B',
        exp: '<p><strong>ตอบ 2) The day\'s hunting tired him out.</strong></p><p>Which of the following is TRUE about the young man in the story ? ข้อใดเป็นจริงเกี่ยวกับชายหนุ่มในเรื่อง<br/>1. He became King of Egypt. เขาได้ขึ้นเป็นกษัตริย์แห่งอียิปต์<br/>2. The day\'s hunting tired him out. การล่าสัตว์ในวันนั้นทำให้เขาเหนื่อยล้า<br/>3. He dreamt that the Sphinx came alive. เขาฝันว่าสฟิงซ์มีชีวิต<br/>4. He thought he saw the Sphinx\'s nose. เขาคิดว่าเขาเห็นจมูกของสฟิงซ์<br/>จากเนื้อเรื่อง "The man had gone hunting that day and he was tired."</p>',
        catalogs: '["บทความ (Reading)"]'
    },
    {
        id: '524',
        text: getReadingText() + '<p><strong>26. What might the young man have done after he woke up ?</strong></p>',
        choices: JSON.stringify({ A: "Cleared the sand from the Sphinx.", B: "Revolted against the King of Egypt.", C: "Brought the Sphinx to life.", D: "Moved the Sphinx away." }),
        ans: 'A',
        exp: '<p><strong>ตอบ 1) Cleared the sand from the Sphinx.</strong></p><p>What might the young man have done after he woke up ? ชายหนุ่มทำอะไรหลังจากที่เขาตื่น<br/>1. Cleared the sand from the Sphinx. เอาทรายออกจากสฟิงซ์<br/>2. Revolted against the King of Egypt. ก่อกบฏกษัตริย์แห่งอียิปต์<br/>3. Brought the Sphinx to life. ทำให้สฟิงซ์มีชีวิต<br/>4. Moved the Sphinx away. ย้ายสฟิงซ์ออกไป<br/>จากความฝันของเขาที่ว่าเขาจะเป็นกษัตริย์ถ้าเอาทรายออกจากสฟิงซ์ เขาจึงน่าจะตื่นมาทำสิ่งนั้น</p>',
        catalogs: '["บทความ (Reading)"]'
    },
    {
        id: '525',
        text: getReadingText() + '<p><strong>27. What happened to the young man at the end of the story ?</strong></p>',
        choices: JSON.stringify({ A: "He disappeared.", B: "He stayed near the Sphinx.", C: "The King of Egypt sent him away.", D: "It is still unknown." }),
        ans: 'D',
        exp: '<p><strong>ตอบ 4) It is still unknown.</strong></p><p>What happened to the young man at the end of the story ? เกิดอะไรขึ้นกับชายหนุ่มเมื่อเรื่องราวจบลง<br/>1. He disappeared. เขาหายตัวไป<br/>2. He stayed near the Sphinx. เขาพักอยู่ใกล้กับสฟิงซ์<br/>3. The King of Egypt sent him away. กษัตริย์แห่งอียิปต์ทรงขับไล่เขาออกไป<br/>4. It is still unknown. ยังไม่ทราบแน่ชัด<br/>จากเนื้อเรื่อง "But the story oddly had no ending... No one seems to know."</p>',
        catalogs: '["บทความ (Reading)"]'
    },
    {
        id: '526',
        text: getReadingText() + '<p><strong>28. What would be the best title for this passage ?</strong></p>',
        choices: JSON.stringify({ A: "The King of Egypt", B: "The Egyptian Desert", C: "The Sphinx and Its Story", D: "The Restoration of the Sphinx" }),
        ans: 'C',
        exp: '<p><strong>ตอบ 3) The Sphinx and Its Story</strong></p><p>What would be the best title for this passage ? หัวข้อใดเหมาะสมที่สุดสำหรับบทความนี้<br/>1. The King of Egypt กษัตริย์แห่งอียิปต์<br/>2. The Egyptian Desert ทะเลทรายอียิปต์<br/>3. The Sphinx and Its Story สฟิงซ์และเรื่องราวของมัน<br/>4. The Restoration of the Sphinx การบูรณะสฟิงซ์<br/>เนื้อหาโดยรวมกล่าวถึงเรื่องราวต่างๆ ที่เกี่ยวข้องกับสฟิงซ์</p>',
        catalogs: '["บทความ (Reading)"]'
    }
];

let sql = '';
for (const q of qData) {
    const textEscaped = q.text.replace(/'/g, "''");
    const choicesEscaped = q.choices.replace(/'/g, "''");
    const explEscaped = q.exp.replace(/'/g, "''");
    
    sql += `INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('${q.id}', '${textEscaped}', '${choicesEscaped}', '${q.ans}', '${explEscaped}', 'ก.พ.', 'ภาษาอังกฤษ', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '${q.catalogs}', '2559');\n`;
}

fs.writeFileSync('insert_new_q_22.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 22...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_22.sql', { stdio: 'inherit' });
console.log('Inserted questions part 22.');
