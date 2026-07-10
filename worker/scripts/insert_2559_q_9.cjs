const fs = require('fs');
const { execSync } = require('child_process');

const template = (colA, colB, colC) => `
<p><strong>ให้พิจารณาเปรียบเทียบข้อมูลระหว่างสดมภ์ ก. กับสดมภ์ ข. และสดมภ์ ค.</strong></p>
<p><strong>หลักในการทำคำตอบ</strong><br/>
1. ถ้าค่าในสดมภ์ ก มากกว่าค่าในสดมภ์ ข<br/>
2. ถ้าค่าในสดมภ์ ข มากกว่าค่าในสดมภ์ ก<br/>
3. ถ้าค่าในสดมภ์ ก เท่ากับค่าในสดมภ์ ข<br/>
4. ถ้าไม่สามารถสรุปได้ว่าค่าในสดมภ์ ก หรือสดมภ์ ข มีค่ามากกว่ากัน</p>
<div class="overflow-x-auto my-4 text-gray-900 dark:text-gray-100">
  <table class="w-full border-collapse border border-gray-400 dark:border-gray-600 text-sm">
    <thead>
      <tr class="bg-gray-200 dark:bg-gray-800">
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center w-1/3">สดมภ์ ก</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center w-1/3">สดมภ์ ข</th>
        <th class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center w-1/3">สดมภ์ ค</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">${colA}</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">${colB}</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">${colC}</td>
      </tr>
    </tbody>
  </table>
</div>
`;

const choices = JSON.stringify({
    A: "สดมภ์ ก > สดมภ์ ข",
    B: "สดมภ์ ข > สดมภ์ ก",
    C: "สดมภ์ ก = สดมภ์ ข",
    D: "ไม่สามารถสรุปได้"
});

const qData = [
    { id: '446', a: '1/x', b: '1/y', c: 'x &lt; y และ x, y &gt; 1', ans: 'A', exp: 'x, y &gt; 1 และ x &lt; y หมายความว่าตัวส่วน y มากกว่า x ส่งผลให้เศษส่วน 1/y มีค่าน้อยกว่า 1/x ดังนั้น ก &gt; ข' },
    { id: '447', a: 'A', b: 'B', c: 'A คือ จำนวนที่หารด้วย 3 ลงตัว<br/>B คือ จำนวนที่หารด้วย 11 ลงตัว', ans: 'D', exp: 'เนื่องจากไม่ระบุค่าที่แน่นอนของ A และ B (อาจเป็นค่าบวก ลบ หรือ 0) จึงไม่สามารถเปรียบเทียบได้' },
    { id: '448', a: '10% ของ 250', b: 'x²', c: '2x + 10 = 5x - 5', ans: 'C', exp: 'ก = 25<br/>ค: 3x = 15 ➞ x = 5<br/>ข: 5² = 25<br/>ดังนั้น ก = ข' },
    { id: '449', a: '4 เท่าของพื้นที่สี่เหลี่ยมจัตุรัส a', b: 'พื้นที่สี่เหลี่ยมจัตุรัส b', c: '- เส้นรอบรูปสี่เหลี่ยมจัตุรัส a ยาว m หน่วย<br/>- ความยาวด้านของสี่เหลี่ยมจัตุรัส b ยาว ด้านละ m หน่วย', ans: 'B', exp: 'ก: ด้าน a = m/4, พื้นที่ a = m²/16 ➞ 4 เท่า = m²/4<br/>ข: ด้าน b = m, พื้นที่ b = m²<br/>ดังนั้น m² &gt; m²/4 ทำให้ ข &gt; ก' },
    { id: '450', a: '√25', b: 'พื้นที่สี่เหลี่ยมจัตุรัสยาวด้านละ 5 หน่วย', c: '-', ans: 'B', exp: 'ก: √25 = 5<br/>ข: 5 × 5 = 25<br/>ดังนั้น ข &gt; ก' },
    { id: '451', a: 'A³', b: '1 / (A⁻³)', c: 'A ≠ 0', ans: 'C', exp: '1 / (A⁻³) มีค่าเท่ากับ A³ พอดี ดังนั้น ก = ข' },
    { id: '452', a: '2 เท่าของความยาวเส้นทแยงมุมทั้งหมดของสี่เหลี่ยมจัตุรัส ที่มีเส้นทแยงมุมยาว a', b: 'เส้นรอบรูปของสี่เหลี่ยมจัตุรัส ที่มีความยาวด้านละ a', c: '-', ans: 'C', exp: 'ก: สี่เหลี่ยมจัตุรัสมีเส้นทแยงมุม 2 เส้น ผลรวมความยาวเส้นทแยงมุม = 2a ➞ 2 เท่าของผลรวม = 4a<br/>ข: เส้นรอบรูปสี่เหลี่ยมจัตุรัสที่มีด้าน a = 4a<br/>ดังนั้น ก = ข' },
    { id: '453', a: 'ก', b: 'ค', c: 'ก.มีเงินเป็น 3 เท่าของข.<br/>และ ข.มีเงินเป็น 1/3 เท่าของค.<br/>จงหาอัตราส่วน ของเงิน ก : ข : ค', ans: 'C', exp: 'ก = 3ข และ ข = ค/3 (นั่นคือ ค = 3ข)<br/>ดังนั้น ก และ ค ต่างก็มีเงินเท่ากับ 3ข<br/>ส่งผลให้ ก = ข (หมายถึงสดมภ์ ก เท่ากับ สดมภ์ ข)' },
    { id: '454', a: '4A', b: 'B + 15', c: 'A คือจำนวนที่หารด้วย 7 ลงตัว<br/>B คือจำนวนที่หารด้วย 15 ลงตัว', ans: 'D', exp: 'ไม่สามารถระบุค่า A และ B ที่แน่นอนได้ จึงไม่สามารถเปรียบเทียบได้' },
    { id: '455', a: '1/y', b: '1/x', c: 'x = 2y, x &gt; 1<br/>และ y &gt; 1', ans: 'A', exp: 'จาก x = 2y และ y &gt; 1 แสดงว่า x &gt; y<br/>เมื่อ x &gt; y จะได้ 1/y &gt; 1/x (ตัวส่วนน้อยกว่า ค่าจะมากกว่า)<br/>ดังนั้น ก &gt; ข' },
    { id: '456', a: '2 เท่าของเส้นทแยงมุมของรูปสี่เหลี่ยมจัตุรัส', b: 'ความยาวรอบรูปของสี่เหลี่ยมจัตุรัส', c: 'สี่เหลี่ยมจัตุรัสมีความยาวด้านเท่ากับ a', ans: 'B', exp: 'ก: เส้นทแยงมุม = a√2 ➞ 2 เท่า = 2a√2 (ประมาณ 2.828a)<br/>ข: ความยาวรอบรูป = 4a<br/>ดังนั้น 4a &gt; 2.828a ทำให้ ข &gt; ก' },
    { id: '457', a: '7000 &lt; K &lt; 600000', b: '60000', c: 'K = 6.1 × 10ⁿ<br/>เมื่อ n เป็นจำนวนเต็มบวก', ans: 'D', exp: 'ไม่สามารถหาค่า K ที่แน่นอนได้ (ถ้า n=4 จะได้ K=61000 ซึ่งมากกว่า ข, แต่ถ้า n=5 จะได้ K=610000) จึงสรุปไม่ได้' },
    { id: '458', a: '70% ของ 300', b: '27A', c: 'A = 2³', ans: 'B', exp: 'ก: 70% ของ 300 = 210<br/>ค: A = 8<br/>ข: 27 × 8 = 216<br/>ดังนั้น ข &gt; ก' },
    { id: '459', a: '4(A + 4B) / C', b: '(4A + 16B) / D', c: 'C = 2D', ans: 'D', exp: 'ก = (4A + 16B) / 2D = 0.5 × ((4A + 16B) / D)<br/>เนื่องจากไม่ทราบว่า (4A + 16B) / D เป็นบวก ลบ หรือศูนย์ จึงไม่สามารถเปรียบเทียบได้' },
    { id: '460', a: '(3⁵)^(1/5)', b: '3', c: '-', ans: 'C', exp: '(3⁵)^(1/5) = 3¹ = 3<br/>ดังนั้น ก = ข' }
];

let sql = '';
for (const q of qData) {
    const textEscaped = template(q.a, q.b, q.c).replace(/'/g, "''");
    const choicesEscaped = choices.replace(/'/g, "''");
    const explEscaped = ('<p><strong>ตอบ ' + (q.ans === 'A' ? '1) สดมภ์ ก > สดมภ์ ข' : q.ans === 'B' ? '2) สดมภ์ ข > สดมภ์ ก' : q.ans === 'C' ? '3) สดมภ์ ก = สดมภ์ ข' : '4) ไม่สามารถสรุปได้') + '</strong></p><p>' + q.exp + '</p>').replace(/'/g, "''");
    
    sql += `INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('${q.id}', '${textEscaped}', '${choicesEscaped}', '${q.ans}', '${explEscaped}', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["สดมภ์", "คณิตศาสตร์ทั่วไป"]', '2559');\n`;
}

fs.writeFileSync('insert_new_q_9.sql', sql, 'utf-8');
console.log('Running SQL insertion for part 9...');
execSync('npx wrangler d1 execute preexam --remote --file=insert_new_q_9.sql', { stdio: 'inherit' });
console.log('Inserted questions part 9.');
