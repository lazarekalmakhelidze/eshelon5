const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

const emailContext = `Directions : Questions 66 - 70 refer to the following letter<br /><br />From : Arun Phan (arunphan@tnet.com)<br />To : Customer Support (support@sparkypaints.com)<br />Date : March 12<br />Subject : Order #3379<br /><br />Hello,<br /><br />Thanks for sending my order #3397. I selected my top color 2 gallons online on March 10 and it arrived this morning. Unfortunately, the paint was not the one I had asked for. I had selected color SP 944 (Misty Gray) but received SP 945 (Ocean Waves). They appear right next to each other on your Web site, so the two may have been confused at your end. Could you send me the correct paint, along with additional samples that are close in color to SP 722 (Stormy Blue) ? That sample worked well in my house; the others looked too green on my walls.<br /><br />Thank you,<br />Arun Phan<br /><br />`;

async function updateReadingQuestions() {
    try {
        const snapshot = await db.collection('questions')
            .where('exam_year', 'in', ['2566', 2566])
            .where('category', '==', 'ภาษาอังกฤษ')
            .get();
            
        const batch = db.batch();
        let updateCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            let text = data.question_text || '';
            let needsUpdate = false;

            // Target questions 66, 67, 68, 69, 70
            if (text.includes('66)') || text.includes('67)') || text.includes('68)') || text.includes('69)') || text.includes('70)')) {
                // If it already has some context, let's just strip it and prepend the clean one.
                // Find where the actual question starts (e.g. "66) The word...")
                const match = text.match(/(6[6-9]\)|70\))/);
                if (match) {
                    const questionPart = text.substring(match.index);
                    const newText = emailContext + questionPart;
                    batch.update(doc.ref, { question_text: newText });
                    updateCount++;
                    console.log(`Updating reading question ${doc.id} (matched ${match[0]})`);
                }
            }
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`Successfully updated ${updateCount} reading questions.`);
        } else {
            console.log('No reading questions needed updating.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateReadingQuestions();
