const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

async function removeSpecialDate() {
    try {
        const snapshot = await db.collection('questions').where('exam_year', 'in', [2566, '2566']).get();
        const batch = db.batch();
        let updateCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            let needsUpdate = false;
            let updates = {};

            if (data.explanation && data.explanation.includes('(สอบพิเศษ 19 ก.พ. 66)')) {
                updates.explanation = data.explanation.replace('(สอบพิเศษ 19 ก.พ. 66)', '').trim();
                needsUpdate = true;
            }

            if (data.exam_set && data.exam_set.includes('พิเศษ (19 กพ 66)')) {
                updates.exam_set = 'ข้อสอบจริง (Past Exam)'; // Standardize it
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(doc.ref, updates);
                updateCount++;
                console.log(`Updating doc ${doc.id}`);
            }
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`Successfully updated ${updateCount} questions.`);
        } else {
            console.log("No questions needed updating.");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

removeSpecialDate();
