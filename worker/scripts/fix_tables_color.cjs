const fs = require('fs');
const htmlTable = `
<div class="overflow-x-auto my-4 text-gray-900 dark:text-gray-100">
  <table class="w-full border-collapse border border-gray-400 dark:border-gray-600 text-sm">
    <thead>
      <tr class="bg-gray-200 dark:bg-gray-800">
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ภูมิภาค</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">จำนวนนักท่องเที่ยว (คน) 2564</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">จำนวนนักท่องเที่ยว (คน) 2565</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">รายได้ฯ (ล้านบาท) 2564</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">รายได้ฯ (ล้านบาท) 2565</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">อาเซียน</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">85,362</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">88,140</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">4,674</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">5,830</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">เอเชียตะวันออกเฉียงเหนือ</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">45,471</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">46,470</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">2,139</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">2,785</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ยุโรป</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">265,888</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">268,484</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">2,535</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">4,310</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">อเมริกา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">33,875</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">34,985</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">21,894</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">22,667</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">เอเชียใต้</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">17,655</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">20,759</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">2,691</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">4,475</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">โอเชียเนีย</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">14,705</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">17,283</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">1,011</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">1,805</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">ตะวันออกกลาง</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">23,069</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">25,715</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">1,232</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">1,517</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center">แอฟริกา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">3,486</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">4,354</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">2,361</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-right">2,961</td>
      </tr>
    </tbody>
  </table>
</div>`.replace(/\n/g, '');

const questions = {
    376: 'ในปี 2564 จำนวนนักท่องเที่ยวจากเอเชียใต้คิดเป็นร้อยละเท่าไรของนักท่องเที่ยวจากยุโรปในปีเดียวกัน',
    377: 'ในปี 2565 ภูมิภาคที่มีจำนวนนักท่องเที่ยวมากสุดคิดเป็นกี่เท่าของภูมิภาคที่มีจำนวนนักท่องเที่ยวน้อยที่สุด',
    378: 'รายได้รวมจากการท่องเที่ยวในปี 2565 เพิ่มขึ้นจากปี 2564 ร้อยละเท่าใด',
    379: 'จำนวนนักท่องเที่ยวอเมริกา ยุโรป และแอฟริกา ในปี 2564 คิดเป็นร้อยละเท่าใดของนักท่องเที่ยวทั้งหมด',
    380: 'รายได้จากการท่องเที่ยวของภูมิภาคใดมีอัตราการเพิ่มขึ้นน้อยที่สุด'
};

let sqlContent = "";
for (const [id, qtext] of Object.entries(questions)) {
    const fullText = `จากข้อมูลในตาราง${htmlTable}<br /><br /><div class="font-bold text-lg mt-4">${qtext}</div>`;
    const escapedText = fullText.replace(/'/g, "''");
    sqlContent += `UPDATE questions SET question_text = '${escapedText}' WHERE id = ${id};\n`;
}
fs.writeFileSync('update.sql', sqlContent, 'utf-8');
const { execSync } = require('child_process');
execSync('npx wrangler d1 execute preexam --remote --file=update.sql', {stdio: 'inherit'});
console.log("Done");
