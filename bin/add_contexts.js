const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

const cond33_37 = `เงื่อนไขสำหรับข้อ 33 - 37
- นักศึกษา 5 คน ได้แก่ ประสาน ประสิทธิ์ ประชิด ประชัน ประชา เป็นนักศึกษาปริญญาตรี 3 คน ปริญญาโท 2 คน
- แต่ละคนชอบเล่นกีฬา 1 ชนิด มีคนชอบเล่นบาสเกตบอล 2 คน ว่ายน้ำ 2 คน แบดมินตัน 1 คน
- แต่ละคนชอบดนตรี 1 ชนิด มีคนชอบดนตรีไทย 2 คน ดนตรีสากล 3 คน
- นักศึกษาปริญญาโท ชอบบาสเกตบอล
- คนที่ชอบบาสเกตบอล ชอบดนตรีไทย
- ประสานและประชันศึกษาในระดับเดียวกัน แต่ชอบกีฬาต่างชนิดกัน
- ประชาชอบเล่นดนตรีสากล\n\n`;

const cond41_45 = `เงื่อนไขสำหรับข้อ 41 - 45\nA/B = 3 = (C+D) = E\nC ≯ F ≯ G (ทุกตัวอักษรมีค่ามากกว่าศูนย์)\n\n`;

const cond46_50 = `เงื่อนไขสำหรับข้อ 46 - 50\n3P ≯ 2J > R = U+V ≮ S\nM > 3U = R > N ≠ L = V (ทุกตัวอักษรมีค่ามากกว่าศูนย์)\n\n`;

const cond28_32 = `จากข้อมูลในตาราง ใช้ตอบคำถามข้อ 28 - 32
| ภูมิภาค | จำนวนนักท่องเที่ยว (คน) 2564 | จำนวนนักท่องเที่ยว (คน) 2565 | รายได้ฯ (ล้านบาท) 2564 | รายได้ฯ (ล้านบาท) 2565 |
|---|---|---|---|---|
| อาเซียน | 85,362 | 88,140 | 4,674 | 5,830 |
| เอเชียตะวันออกเฉียงเหนือ | 45,471 | 46,470 | 2,139 | 2,785 |
| ยุโรป | 265,888 | 268,484 | 2,535 | 4,310 |
| อเมริกา | 33,875 | 34,985 | 21,894 | 22,667 |
| เอเชียใต้ | 17,655 | 20,759 | 2,691 | 4,475 |
| โอเชียเนีย | 14,705 | 17,283 | 1,011 | 1,805 |
| ตะวันออกกลาง | 23,069 | 25,715 | 1,232 | 1,517 |
| แอฟริกา | 3,486 | 4,354 | 2,361 | 2,961 |\n\n`;

async function addContexts() {
    try {
        const snapshot = await db.collection('questions')
            .where('exam_year', '==', '2566')
            .get();
            
        const batch = db.batch();
        let updateCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            let text = data.question_text || '';
            let needsUpdate = false;

            // 33-36
            if (text.startsWith('ข้อ 34)') || text.startsWith('ข้อ 35)') || text.startsWith('ข้อ 36)')) {
                text = cond33_37 + text;
                needsUpdate = true;
            }
            // 41-45
            if (text.startsWith('ข้อ 42)') || text.startsWith('ข้อ 43)') || text.startsWith('ข้อ 44)') || text.startsWith('ข้อ 45)')) {
                text = cond41_45 + text;
                needsUpdate = true;
            }
            // 46-50
            if (text.startsWith('ข้อ 47)') || text.startsWith('ข้อ 48)') || text.startsWith('ข้อ 49)') || text.startsWith('ข้อ 50)')) {
                text = cond46_50 + text;
                needsUpdate = true;
            }
            // 28-32
            if (text.includes('ข้อ 28)')) {
                text = text.replace('จากข้อมูลในตาราง ใช้ตอบคำถามข้อ 28 - 32\n(ตารางจำนวนนักท่องเที่ยวและรายได้)\n\n', cond28_32);
                needsUpdate = true;
            }
            if (text.startsWith('ข้อ 29)') || text.startsWith('ข้อ 30)') || text.startsWith('ข้อ 31)') || text.startsWith('ข้อ 32)')) {
                text = cond28_32 + text;
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(doc.ref, { question_text: text });
                updateCount++;
                console.log(`Updating ${doc.id}`);
            }
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`Updated ${updateCount} questions.`);
        } else {
            console.log('No questions to update.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

addContexts();
