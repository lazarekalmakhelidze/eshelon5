const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

const cond37_40 = `เงื่อนไขสำหรับข้อ 37 - 40<br />- แบ่งผลไม้ 20 ลูก ให้รัตนา ธราพงษ์ ยงยุทธ สุดใจ แต่ละคนได้ผลไม้จำนวนเท่ากัน<br />- ผลไม้มี 3 ชนิด คือ มะม่วง มังคุด และชมพู่<br />- มังคุดมีจำนวนเป็น 3 เท่าของมะม่วง<br />- มะม่วงมีจำนวน 3 ลูก รัตนาได้ไปทั้งหมด<br />- ทุกคนได้ผลไม้คนละ 2 ชนิด และได้มังคุดอย่างน้อยคนละ 2 ลูก<br /><br />`;

async function updateCondition37_40() {
    try {
        const batch = db.batch();

        // Question 37 (ID 338)
        const doc338 = await db.collection('questions').doc('338').get();
        if (doc338.exists) {
            batch.update(doc338.ref, { question_text: cond37_40 + "ข้อ 37)<br />ข้อสรุปที่ 1: ชมพู่มีจำนวนทั้งหมด 8 ลูก<br />ข้อสรุปที่ 2: ยงยุทธได้มังคุด 2 ลูก" });
        }

        // Question 38 (ID 339)
        const doc339 = await db.collection('questions').doc('339').get();
        if (doc339.exists) {
            batch.update(doc339.ref, { question_text: cond37_40 + "ข้อ 38)<br />ข้อสรุปที่ 1: ยงยุทธได้ชมพู่มากกว่า 1 ลูก<br />ข้อสรุปที่ 2: สุดใจได้ชมพู่ 4 ลูก" });
        }

        // Question 39 (ID 340)
        const doc340 = await db.collection('questions').doc('340').get();
        if (doc340.exists) {
            batch.update(doc340.ref, { question_text: cond37_40 + "ข้อ 39)<br />ข้อสรุปที่ 1: ชมพู่มีจำนวนมากกว่ามังคุด<br />ข้อสรุปที่ 2: ธราพงษ์ได้มังคุดมากกว่าชมพู่" });
        }

        // Question 40 (ID 341)
        const doc341 = await db.collection('questions').doc('341').get();
        if (doc341.exists) {
            batch.update(doc341.ref, { question_text: cond37_40 + "ข้อ 40)<br />ข้อสรุปที่ 1: สุดใจได้มังคุดน้อยกว่ารัตนา<br />ข้อสรุปที่ 2: ไม่มีใครได้มังคุดมากกว่าชมพู่" });
        }

        await batch.commit();
        console.log(`Successfully updated conditions for questions 37-40.`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateCondition37_40();
