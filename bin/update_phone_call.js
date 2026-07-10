const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

const phoneCallConv = `Conversation : Phone Call<br /><br />Luke : Hello? Hi, Stephanie, .................(51).................<br />Stephanie: Hi, Luke! How are you? .................(52)................. stop and pick up extra paper for the computer printer?<br />Luke : What did you say? .................(53).................<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Did you say pick up ink for the printer? Sorry, .................(54).................<br />Stephanie: Can you hear me now? No, I need more computer paper.<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Listen, I'll text you exactly what I need. Thanks, Luke. Talk to you later.<br />Luke : Thanks, Stephanie. Sorry, .................(55).................<br /><br />`;

async function updatePhoneCallQuestions() {
    try {
        const batch = db.batch();

        const updates = [
            { id: '328', text: phoneCallConv + "ข้อ 51)" },
            { id: '329', text: phoneCallConv + "ข้อ 52)" },
            { id: '330', text: phoneCallConv + "ข้อ 53)" },
            { id: '331', text: phoneCallConv + "ข้อ 54)" },
            { id: '332', text: phoneCallConv + "ข้อ 55)" },
        ];

        for (const update of updates) {
            const docRef = db.collection('questions').doc(update.id);
            const doc = await docRef.get();
            if (doc.exists) {
                batch.update(docRef, { question_text: update.text });
            }
        }

        await batch.commit();
        console.log(`Successfully updated Phone Call conversation for questions 51-55.`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updatePhoneCallQuestions();
