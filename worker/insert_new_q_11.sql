INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('477', '<p><strong>72. ระงับ : อายัด :: อาทร : ....</strong></p>', '{"A":"ห่วงใย","B":"ผูกพัน","C":"ถาวร","D":"อาลัย"}', 'A', '<p><strong>ตอบ 1) ห่วงใย</strong></p><p>ความสัมพันธ์แบบ คำที่มีความหมายเหมือนกัน (ระงับ มีความหมายเหมือนกับ อายัด, ดังนั้น อาทร จึงมีความหมายเหมือนกับ ห่วงใย)</p>', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["อุปมาอุปไมย"]', '2559');
INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('478', '
<p><strong>จากข้อมูลต่อไปนี้ จงตอบคำถาม</strong></p>
<p>แผนกหนึ่ง มีพนักงาน 11 คนชื่อ ดำรง อำนาจ สมวงค์ นิสา พัฒนา จิตรา สมหมาย วิเชียร นิรุต ชื่นจิตร แก้วตา ในแผนกจะมี 2 ฝ่าย มีหัวหน้าแผนก 1 คน มีหัวหน้าฝ่าย 2 คน<br/>
- ดำรงและสมวงค์ ไม่อยู่ฝ่ายเดียวกัน<br/>
- นิสาเป็นหัวหน้าพัฒนา<br/>
- นิรุตเป็นลูกน้องของวิเชียร<br/>
- อำนาจเป็นหัวหน้าของวิเชียร<br/>
- จิตราและชื่นจิตรอยู่ฝ่ายเดียวกัน<br/>
- สมหมายอยู่คนละฝ่ายกับนิรุต<br/>
- นิสามีลูกน้องทั้งหมด 5 คน</p>
<p><strong>หลักในการทำคำตอบ</strong><br/>
<strong>ตอบ 1</strong> ถ้าข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข<br/>
<strong>ตอบ 2</strong> ถ้าข้อสรุปทั้งสองเป็นเท็จตามเงื่อนไข<br/>
<strong>ตอบ 3</strong> ถ้าข้อสรุปทั้งสองไม่แน่ชัดตามเงื่อนไข<br/>
<strong>ตอบ 4</strong> ถ้าข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง</p>
<p><strong>73.<br/>ข้อสรุปที่ 1 นิสาและจิตราอยู่ฝ่ายเดียวกัน<br/>ข้อสรุปที่ 2 อำนาจเป็นหัวหน้าแผนก</strong></p>', '{"A":"ข้อสรุปทั้งสองเป็นจริง","B":"ข้อสรุปทั้งสองเป็นเท็จ","C":"ข้อสรุปทั้งสองไม่สามารถสรุปได้แน่ชัด","D":"ข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง"}', 'A', '
<p><strong>ตารางสรุปจากเงื่อนไข:</strong></p>
<div class="overflow-x-auto my-4 text-gray-900 dark:text-gray-100">
  <table class="w-full border-collapse border border-gray-400 dark:border-gray-600 text-sm">
    <tbody>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" rowspan="2"><strong>หัวหน้าแผนก:<br/>อำนาจ</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 1<br/>(นิสา)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">พัฒนา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">สมหมาย</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">จิตรา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">ชื่นจิตร</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">(ดำรง หรือ สมวงค์)</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 2<br/>(วิเชียร)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">นิรุต</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">แก้วตา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" colspan="3">(ดำรง หรือ สมวงค์)</td>
      </tr>
    </tbody>
  </table>
</div>
<p><strong>ตอบ 1</strong> (ข้อสรุปทั้งสองเป็นจริง)</p><p>ข้อสรุปที่ 1 นิสาและจิตราอยู่ฝ่ายเดียวกัน - <strong>จริง</strong> (นิสาเป็นหัวหน้าฝ่าย 1 และจิตราอยู่ฝ่าย 1)<br/>ข้อสรุปที่ 2 อำนาจเป็นหัวหน้าแผนก - <strong>จริง</strong></p>', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["เงื่อนไขภาษา"]', '2559');
INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('479', '
<p><strong>จากข้อมูลต่อไปนี้ จงตอบคำถาม</strong></p>
<p>แผนกหนึ่ง มีพนักงาน 11 คนชื่อ ดำรง อำนาจ สมวงค์ นิสา พัฒนา จิตรา สมหมาย วิเชียร นิรุต ชื่นจิตร แก้วตา ในแผนกจะมี 2 ฝ่าย มีหัวหน้าแผนก 1 คน มีหัวหน้าฝ่าย 2 คน<br/>
- ดำรงและสมวงค์ ไม่อยู่ฝ่ายเดียวกัน<br/>
- นิสาเป็นหัวหน้าพัฒนา<br/>
- นิรุตเป็นลูกน้องของวิเชียร<br/>
- อำนาจเป็นหัวหน้าของวิเชียร<br/>
- จิตราและชื่นจิตรอยู่ฝ่ายเดียวกัน<br/>
- สมหมายอยู่คนละฝ่ายกับนิรุต<br/>
- นิสามีลูกน้องทั้งหมด 5 คน</p>
<p><strong>หลักในการทำคำตอบ</strong><br/>
<strong>ตอบ 1</strong> ถ้าข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข<br/>
<strong>ตอบ 2</strong> ถ้าข้อสรุปทั้งสองเป็นเท็จตามเงื่อนไข<br/>
<strong>ตอบ 3</strong> ถ้าข้อสรุปทั้งสองไม่แน่ชัดตามเงื่อนไข<br/>
<strong>ตอบ 4</strong> ถ้าข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง</p>
<p><strong>74.<br/>ข้อสรุปที่ 1 สมหมายเป็นลูกน้องของวิเชียร<br/>ข้อสรุปที่ 2 วิเชียรมีลูกน้องทั้งหมด 4 คน</strong></p>', '{"A":"ข้อสรุปทั้งสองเป็นจริง","B":"ข้อสรุปทั้งสองเป็นเท็จ","C":"ข้อสรุปทั้งสองไม่สามารถสรุปได้แน่ชัด","D":"ข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง"}', 'B', '
<p><strong>ตารางสรุปจากเงื่อนไข:</strong></p>
<div class="overflow-x-auto my-4 text-gray-900 dark:text-gray-100">
  <table class="w-full border-collapse border border-gray-400 dark:border-gray-600 text-sm">
    <tbody>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" rowspan="2"><strong>หัวหน้าแผนก:<br/>อำนาจ</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 1<br/>(นิสา)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">พัฒนา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">สมหมาย</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">จิตรา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">ชื่นจิตร</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">(ดำรง หรือ สมวงค์)</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 2<br/>(วิเชียร)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">นิรุต</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">แก้วตา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" colspan="3">(ดำรง หรือ สมวงค์)</td>
      </tr>
    </tbody>
  </table>
</div>
<p><strong>ตอบ 2</strong> (ข้อสรุปทั้งสองเป็นเท็จ)</p><p>ข้อสรุปที่ 1 สมหมายเป็นลูกน้องของวิเชียร - <strong>เท็จ</strong> (สมหมายอยู่ฝ่าย 1 เป็นลูกน้องนิสา)<br/>ข้อสรุปที่ 2 วิเชียรมีลูกน้องทั้งหมด 4 คน - <strong>เท็จ</strong> (ฝ่ายวิเชียรมีลูกน้องแค่ 3 คน คือ นิรุต แก้วตา และ ดำรง/สมวงค์)</p>', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["เงื่อนไขภาษา"]', '2559');
INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('480', '
<p><strong>จากข้อมูลต่อไปนี้ จงตอบคำถาม</strong></p>
<p>แผนกหนึ่ง มีพนักงาน 11 คนชื่อ ดำรง อำนาจ สมวงค์ นิสา พัฒนา จิตรา สมหมาย วิเชียร นิรุต ชื่นจิตร แก้วตา ในแผนกจะมี 2 ฝ่าย มีหัวหน้าแผนก 1 คน มีหัวหน้าฝ่าย 2 คน<br/>
- ดำรงและสมวงค์ ไม่อยู่ฝ่ายเดียวกัน<br/>
- นิสาเป็นหัวหน้าพัฒนา<br/>
- นิรุตเป็นลูกน้องของวิเชียร<br/>
- อำนาจเป็นหัวหน้าของวิเชียร<br/>
- จิตราและชื่นจิตรอยู่ฝ่ายเดียวกัน<br/>
- สมหมายอยู่คนละฝ่ายกับนิรุต<br/>
- นิสามีลูกน้องทั้งหมด 5 คน</p>
<p><strong>หลักในการทำคำตอบ</strong><br/>
<strong>ตอบ 1</strong> ถ้าข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข<br/>
<strong>ตอบ 2</strong> ถ้าข้อสรุปทั้งสองเป็นเท็จตามเงื่อนไข<br/>
<strong>ตอบ 3</strong> ถ้าข้อสรุปทั้งสองไม่แน่ชัดตามเงื่อนไข<br/>
<strong>ตอบ 4</strong> ถ้าข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง</p>
<p><strong>75.<br/>ข้อสรุปที่ 1 ดำรงและพัฒนาอยู่ฝ่ายเดียวกัน<br/>ข้อสรุปที่ 2 ถ้าดำรงเป็นลูกน้องของวิเชียรแล้วสมวงค์จะเป็นลูกน้องของนิสา</strong></p>', '{"A":"ข้อสรุปทั้งสองเป็นจริง","B":"ข้อสรุปทั้งสองเป็นเท็จ","C":"ข้อสรุปทั้งสองไม่สามารถสรุปได้แน่ชัด","D":"ข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง"}', 'D', '
<p><strong>ตารางสรุปจากเงื่อนไข:</strong></p>
<div class="overflow-x-auto my-4 text-gray-900 dark:text-gray-100">
  <table class="w-full border-collapse border border-gray-400 dark:border-gray-600 text-sm">
    <tbody>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" rowspan="2"><strong>หัวหน้าแผนก:<br/>อำนาจ</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 1<br/>(นิสา)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">พัฒนา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">สมหมาย</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">จิตรา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">ชื่นจิตร</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">(ดำรง หรือ สมวงค์)</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 2<br/>(วิเชียร)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">นิรุต</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">แก้วตา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" colspan="3">(ดำรง หรือ สมวงค์)</td>
      </tr>
    </tbody>
  </table>
</div>
<p><strong>ตอบ 4</strong> (ข้อสรุปทั้งสองไม่ตรงกัน)</p><p>ข้อสรุปที่ 1 ดำรงและพัฒนาอยู่ฝ่ายเดียวกัน - <strong>ไม่แน่ชัด</strong> (เพราะไม่ทราบแน่ชัดว่าดำรงหรือสมวงค์ใครอยู่ฝ่ายใด)<br/>ข้อสรุปที่ 2 ถ้าดำรงเป็นลูกน้องของวิเชียรแล้วสมวงค์จะเป็นลูกน้องของนิสา - <strong>จริง</strong> (เพราะดำรงและสมวงค์ต้องอยู่คนละฝ่ายกัน)</p>', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["เงื่อนไขภาษา"]', '2559');
INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('481', '
<p><strong>จากข้อมูลต่อไปนี้ จงตอบคำถาม</strong></p>
<p>แผนกหนึ่ง มีพนักงาน 11 คนชื่อ ดำรง อำนาจ สมวงค์ นิสา พัฒนา จิตรา สมหมาย วิเชียร นิรุต ชื่นจิตร แก้วตา ในแผนกจะมี 2 ฝ่าย มีหัวหน้าแผนก 1 คน มีหัวหน้าฝ่าย 2 คน<br/>
- ดำรงและสมวงค์ ไม่อยู่ฝ่ายเดียวกัน<br/>
- นิสาเป็นหัวหน้าพัฒนา<br/>
- นิรุตเป็นลูกน้องของวิเชียร<br/>
- อำนาจเป็นหัวหน้าของวิเชียร<br/>
- จิตราและชื่นจิตรอยู่ฝ่ายเดียวกัน<br/>
- สมหมายอยู่คนละฝ่ายกับนิรุต<br/>
- นิสามีลูกน้องทั้งหมด 5 คน</p>
<p><strong>หลักในการทำคำตอบ</strong><br/>
<strong>ตอบ 1</strong> ถ้าข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข<br/>
<strong>ตอบ 2</strong> ถ้าข้อสรุปทั้งสองเป็นเท็จตามเงื่อนไข<br/>
<strong>ตอบ 3</strong> ถ้าข้อสรุปทั้งสองไม่แน่ชัดตามเงื่อนไข<br/>
<strong>ตอบ 4</strong> ถ้าข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง</p>
<p><strong>76.<br/>ข้อสรุปที่ 1 สมหมายเป็นลูกน้องนิสาและชื่นจิตรเป็นลูกน้องวิเชียร<br/>ข้อสรุปที่ 2 แก้วตาเป็นลูกน้องของวิเชียรและและดำรงเป็นลูกน้องของนิสา</strong></p>', '{"A":"ข้อสรุปทั้งสองเป็นจริง","B":"ข้อสรุปทั้งสองเป็นเท็จ","C":"ข้อสรุปทั้งสองไม่สามารถสรุปได้แน่ชัด","D":"ข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง"}', 'D', '
<p><strong>ตารางสรุปจากเงื่อนไข:</strong></p>
<div class="overflow-x-auto my-4 text-gray-900 dark:text-gray-100">
  <table class="w-full border-collapse border border-gray-400 dark:border-gray-600 text-sm">
    <tbody>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" rowspan="2"><strong>หัวหน้าแผนก:<br/>อำนาจ</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 1<br/>(นิสา)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">พัฒนา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">สมหมาย</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">จิตรา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">ชื่นจิตร</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">(ดำรง หรือ สมวงค์)</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 2<br/>(วิเชียร)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">นิรุต</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">แก้วตา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" colspan="3">(ดำรง หรือ สมวงค์)</td>
      </tr>
    </tbody>
  </table>
</div>
<p><strong>ตอบ 4</strong> (ข้อสรุปทั้งสองไม่ตรงกัน)</p><p>ข้อสรุปที่ 1 สมหมายเป็นลูกน้องนิสาและชื่นจิตรเป็นลูกน้องวิเชียร - <strong>เท็จ</strong> (ชื่นจิตรต้องเป็นลูกน้องนิสา)<br/>ข้อสรุปที่ 2 แก้วตาเป็นลูกน้องของวิเชียรและดำรงเป็นลูกน้องของนิสา - <strong>ไม่แน่ชัด</strong> (แก้วตาเป็นลูกน้องวิเชียรจริง แต่ดำรงยังไม่แน่ชัดว่าอยู่ฝ่ายใด)</p>', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["เงื่อนไขภาษา"]', '2559');
INSERT INTO questions (id, question_text, choices, correct_answer, explanation, category, subject, difficulty, is_custom, created_at, updated_at, catalogs, exam_year) VALUES ('482', '
<p><strong>จากข้อมูลต่อไปนี้ จงตอบคำถาม</strong></p>
<p>แผนกหนึ่ง มีพนักงาน 11 คนชื่อ ดำรง อำนาจ สมวงค์ นิสา พัฒนา จิตรา สมหมาย วิเชียร นิรุต ชื่นจิตร แก้วตา ในแผนกจะมี 2 ฝ่าย มีหัวหน้าแผนก 1 คน มีหัวหน้าฝ่าย 2 คน<br/>
- ดำรงและสมวงค์ ไม่อยู่ฝ่ายเดียวกัน<br/>
- นิสาเป็นหัวหน้าพัฒนา<br/>
- นิรุตเป็นลูกน้องของวิเชียร<br/>
- อำนาจเป็นหัวหน้าของวิเชียร<br/>
- จิตราและชื่นจิตรอยู่ฝ่ายเดียวกัน<br/>
- สมหมายอยู่คนละฝ่ายกับนิรุต<br/>
- นิสามีลูกน้องทั้งหมด 5 คน</p>
<p><strong>หลักในการทำคำตอบ</strong><br/>
<strong>ตอบ 1</strong> ถ้าข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข<br/>
<strong>ตอบ 2</strong> ถ้าข้อสรุปทั้งสองเป็นเท็จตามเงื่อนไข<br/>
<strong>ตอบ 3</strong> ถ้าข้อสรุปทั้งสองไม่แน่ชัดตามเงื่อนไข<br/>
<strong>ตอบ 4</strong> ถ้าข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง</p>
<p><strong>77.<br/>ข้อสรุปที่ 1 ชื่นจิตรเป็นลูกน้องของนิสา สมวงค์เป็นลูกน้องวิเชียรและนิสาเป็นลูกน้องของอำนาจ<br/>ข้อสรุปที่ 2 ดำรงเป็นลูกน้องของนิสาหรือวิเชียร</strong></p>', '{"A":"ข้อสรุปทั้งสองเป็นจริง","B":"ข้อสรุปทั้งสองเป็นเท็จ","C":"ข้อสรุปทั้งสองไม่สามารถสรุปได้แน่ชัด","D":"ข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งที่เป็นจริง เป็นเท็จ หรือไม่แน่ชัด ไม่ตรงกับอีกข้อสรุปหนึ่ง"}', 'D', '
<p><strong>ตารางสรุปจากเงื่อนไข:</strong></p>
<div class="overflow-x-auto my-4 text-gray-900 dark:text-gray-100">
  <table class="w-full border-collapse border border-gray-400 dark:border-gray-600 text-sm">
    <tbody>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" rowspan="2"><strong>หัวหน้าแผนก:<br/>อำนาจ</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 1<br/>(นิสา)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">พัฒนา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">สมหมาย</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">จิตรา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">ชื่นจิตร</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">(ดำรง หรือ สมวงค์)</td>
      </tr>
      <tr>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle bg-gray-200 dark:bg-gray-800"><strong>หัวหน้าฝ่าย 2<br/>(วิเชียร)</strong></td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">นิรุต</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle">แก้วตา</td>
        <td class="border border-gray-400 dark:border-gray-600 px-3 py-2 text-center align-middle" colspan="3">(ดำรง หรือ สมวงค์)</td>
      </tr>
    </tbody>
  </table>
</div>
<p><strong>ตอบ 4</strong> (ข้อสรุปทั้งสองไม่ตรงกัน)</p><p>ข้อสรุปที่ 1 ชื่นจิตรเป็นลูกน้องของนิสา สมวงค์เป็นลูกน้องวิเชียรและนิสาเป็นลูกน้องของอำนาจ - <strong>ไม่แน่ชัด</strong> (เพราะสมวงค์ยังไม่แน่ชัดว่าอยู่ฝ่ายใด)<br/>ข้อสรุปที่ 2 ดำรงเป็นลูกน้องของนิสาหรือวิเชียร - <strong>จริง</strong> (ดำรงต้องเป็นลูกน้องของใครคนใดคนหนึ่งแน่นอน)</p>', 'ก.พ.', 'ความรู้ความสามารถทั่วไป', 50, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '["เงื่อนไขภาษา"]', '2559');
