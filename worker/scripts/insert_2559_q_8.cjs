const fs = require('fs');
const { execSync } = require('child_process');

const htmlTable = `
<p><strong>จากข้อมูลในตาราง จงตอบคำถาม</strong></p>
<p>ข้อมูลพื้นที่เพาะปลูกพืชชนิดต่างๆ ในแต่ละภาคของประเทศไทย ปี 2559</p>
<div class="overflow-x-auto my-4 text-gray-900 dark:text-gray-100">
  <table class="w-full border-collapse border border-gray-400 dark:border-gray-600 text-sm">
    <thead>
      <tr class="bg-gray-200 dark:bg-gray-800">
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ภาค</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ข้าว (ไร่)</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ข้าวโพด (ไร่)</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ยาสูบ (ไร่)</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ยางพารา (ไร่)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">เหนือ</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">33,478</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">40,553</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">36,421</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">18,475</td>
      </tr>
      <tr class="bg-gray-50 dark:bg-gray-900">
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">กลาง</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">21,562</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">37,884</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">28,463</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">16,652</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ใต้</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">18,736</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">23,825</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">32,451</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">56,984</td>
      </tr>
      <tr class="bg-gray-50 dark:bg-gray-900">
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ตะวันออก</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">11,237</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">17,426</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">21,552</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">28,152</td>
      </tr>
    </tbody>
  </table>
</div>
`;

const questions = [
    {
        id: '444',
        text: htmlTable + '<p><strong>39. ภาคเหนือมีพื้นที่การปลูกยางพาราคิดเป็นกี่เปอร์เซ็นของพื้นที่ในการเพาะปลูกข้าวโพด</strong></p>',
        choices: JSON.stringify({ A: '43%', B: '45%', C: '47%', D: '49%' }),
        correct: 'B',
        explanation: '<p><strong>ตอบ 2) 45%</strong></p><p>ปลูกยางพาราคิดเป็นกี่เปอร์เซ็นต์ของพื้นที่ในการเพาะปลูกข้าวโพด<br/>= 18,475 × (100 / 40,553)<br/>= 45.55% (โดยประมาณ <strong>45%</strong> ตามตัวเลือก)</p>',
        catalogs: '["ตาราง"]'
    },
    {
        id: '445',
        text: htmlTable + '<p><strong>40. พื้นที่เพาะปลูกรวมทุกภาคของยางพารามากกว่าพื้นที่เพาะปลูกข้าวร้อยละเท่าใด</strong></p>',
        choices: JSON.stringify({ A: 'ร้อยละ 41', B: 'ร้อยละ 53', C: 'ร้อยละ 67', D: 'ร้อยละ 69' }),
        correct: 'A',
        explanation: '<p><strong>ตอบ 1) ร้อยละ 41</strong></p><p>พื้นที่เพาะปลูกรวมทุกภาคของยางพารา = 18,475 + 16,652 + 56,984 + 28,152 = 120,263 ไร่ (ในเฉลยปัดเป็น 120,262 ไร่)<br/>พื้นที่เพาะปลูกรวมทุกภาคของข้าว = 33,478 + 21,562 + 18,736 + 11,237 = 85,013 ไร่<br/>พื้นที่เพาะปลูกรวมทุกภาคของยางพารามากกว่าข้าว = 120,263 - 85,013 = 35,250 ไร่ (ในเฉลย 35,249 ไร่)<br/>พื้นที่เพาะปลูกรวมทุกภาคของยางพารามากกว่าพื้นที่เพาะปลูกข้าว<br/>= 35,250 × (100 / 85,013) = 41.46%<br/>คิดเป็นร้อยละ <strong>41</strong></p>',
        catalogs: '["ตาราง"]'
    }
];

let sql = '';
for (const q of questions) {
    const textEscaped = q.text.replace(/'/g, "''");
    const choicesEscaped = q.choices.replace(/'/g, "''");
    const explEscaped = q.explanation.replace(/'/g, "''");
    sql += `INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('${q.id}', '${textEscaped}', '${choicesEscaped}', '${q.correct}', '${explEscaped}', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '${q.catalogs}', '2559');\n`;
}

fs.writeFileSync('insert_new_q_8.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 8...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_8.sql', { stdio: 'inherit' });
console.log('Inserted questions part 8.');
