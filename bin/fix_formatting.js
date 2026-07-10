const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

async function fixNewlines() {
    try {
        const snapshot = await db.collection('questions')
            .where('exam_year', 'in', ['2566', 2566])
            .get();
            
        const batch = db.batch();
        let updateCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            let text = data.question_text || '';
            let explanation = data.explanation || '';
            let needsUpdate = false;
            let updates = {};

            if (text.includes('\n')) {
                updates.question_text = text.replace(/\n/g, '<br />');
                needsUpdate = true;
            }
            if (explanation.includes('\n')) {
                updates.explanation = explanation.replace(/\n/g, '<br />');
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(doc.ref, updates);
                updateCount++;
                console.log(`Updating formatting for ${doc.id}`);
            }
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`Successfully formatted ${updateCount} questions.`);
        } else {
            console.log('No formatting needed.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixNewlines();
