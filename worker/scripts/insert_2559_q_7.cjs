const fs = require('fs');
const { execSync } = require('child_process');

const htmlTable = `
<p><strong>จากข้อมูลในตาราง จงตอบคำถาม</strong></p>
<p>ข้อมูลปริมาณนักท่องเที่ยวที่เดินทางเข้าประเทศไทยผ่านท่าอากาศยานดอนเมือง ปี 2558-2559</p>
<div class="overflow-x-auto my-4 text-gray-900 dark:text-gray-100">
  <table class="w-full border-collapse border border-gray-400 dark:border-gray-600 text-sm">
    <thead>
      <tr class="bg-gray-200 dark:bg-gray-800">
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ลำดับ</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ประเทศ</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ปี 2558 (คน)</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ปี 2559 (คน)</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">อัตราการเพิ่ม-ลด<br/>พ.ศ. 2558-2559</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">1</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2">ไทย</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">307,626</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">256,050</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">-16.77</td>
      </tr>
      <tr class="bg-gray-50 dark:bg-gray-900">
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">2</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2">ญี่ปุ่น</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">12,578</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">?</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">-2.73</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">3</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2">มาเลเซีย</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">32,665</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">31,012</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">-5.06</td>
      </tr>
      <tr class="bg-gray-50 dark:bg-gray-900">
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">4</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2">ฟิลิปปินส์</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">125,468</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">134,539</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">7.23</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">5</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2">อเมริกา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">11,253</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">13,020</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">15.70</td>
      </tr>
      <tr class="bg-gray-50 dark:bg-gray-900">
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">6</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2">แคนาดา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">225,745</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">240,078</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">?</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">7</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2">บรูไน</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">66,578</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">58,654</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">?</td>
      </tr>
      <tr class="bg-gray-50 dark:bg-gray-900">
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">8</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2">เวียดนาม</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">15,946</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">16,452</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">?</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">9</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2">สิงคโปร์</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">10,021</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">?</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">17.83</td>
      </tr>
    </tbody>
  </table>
</div>
`;

const questions = [
    {
        id: '441',
        text: htmlTable + '<p><strong>36. ปริมาณนักท่องเที่ยวจากประเทศญี่ปุ่นในปี 2559 เป็นเท่าใด</strong></p>',
        choices: JSON.stringify({ A: '12,234 คน', B: '12,334 คน', C: '12,434 คน', D: '12,534 คน' }),
        correct: 'A',
        explanation: '<p><strong>ตอบ 1) 12,234 คน</strong></p><p>ปริมาณนักท่องเที่ยวที่ลดลง เท่ากับ 12,578 × (-2.73 / 100) ≈ -343.38 (หรือประมาณ -344 คน)<br/>ปริมาณนักท่องเที่ยวจากประเทศญี่ปุ่นในปี 2559 เท่ากับ 12,578 - 344 = <strong>12,234 คน</strong></p>',
        catalogs: '["ตาราง"]'
    },
    {
        id: '442',
        text: htmlTable + '<p><strong>37. ในช่วงปี 2558 - 2559 ประเทศใดมีอัตราการเพิ่มขึ้นของนักท่องเที่ยวน้อยที่สุด</strong></p>',
        choices: JSON.stringify({ A: 'แคนาดา', B: 'บรูไน', C: 'เวียดนาม', D: 'สิงคโปร์' }),
        correct: 'C',
        explanation: '<p><strong>ตอบ 3) เวียดนาม</strong></p><p>หาอัตราการเพิ่มขึ้นของแต่ละประเทศในตัวเลือก:<br/>- <strong>แคนาดา</strong>: ((240,078 - 225,745) / 225,745) × 100 = 6.35%<br/>- <strong>บรูไน</strong>: นักท่องเที่ยวลดลง (ไม่ใช่เพิ่มขึ้น) จึงตัดออก<br/>- <strong>เวียดนาม</strong>: ((16,452 - 15,946) / 15,946) × 100 = <strong>3.17%</strong><br/>- <strong>สิงคโปร์</strong>: อัตราการเพิ่มระบุในตารางแล้ว คือ 17.83%<br/>ดังนั้น <strong>เวียดนาม</strong> มีอัตราการเพิ่มขึ้นน้อยที่สุด</p>',
        catalogs: '["ตาราง"]'
    },
    {
        id: '443',
        text: htmlTable + '<p><strong>38. ในปี 2559 ประเทศใดมีนักท่องเที่ยวเดินทางเข้ามาน้อยที่สุด</strong></p>',
        choices: JSON.stringify({ A: 'ญี่ปุ่น', B: 'อเมริกา', C: 'เวียดนาม', D: 'สิงคโปร์' }),
        correct: 'D',
        explanation: '<p><strong>ตอบ 4) สิงคโปร์</strong></p><p>หาปริมาณนักท่องเที่ยวในปี 2559 ของแต่ละประเทศ:<br/>- <strong>ญี่ปุ่น</strong> (ข้อ 36) = 12,234 คน<br/>- <strong>อเมริกา</strong> (จากตาราง) = 13,020 คน<br/>- <strong>เวียดนาม</strong> (จากตาราง) = 16,452 คน<br/>- <strong>สิงคโปร์</strong>: 10,021 + (10,021 × 17.83/100) = 10,021 + 1,786 = <strong>11,807 คน</strong><br/>ดังนั้น <strong>สิงคโปร์</strong> มีจำนวนน้อยที่สุด</p>',
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

fs.writeFileSync('insert_new_q_7.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 7...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_7.sql', { stdio: 'inherit' });
console.log('Inserted questions part 7.');
