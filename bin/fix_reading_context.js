const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

const emailContext = `Directions : Questions 66 - 70 refer to the following letter<br /><br />From : Arun Phan (arunphan@tnet.com)<br />To : Customer Support (support@sparkypaints.com)<br />Date : March 12<br />Subject : Order #3379<br /><br />Hello,<br /><br />Thanks for sending my order #3397. I selected my top color 2 gallons online on March 10 and it arrived this morning. Unfortunately, the paint was not the one I had asked for. I had selected color SP 944 (Misty Gray) but received SP 945 (Ocean Waves). They appear right next to each other on your Web site, so the two may have been confused at your end. Could you send me the correct paint, along with additional samples that are close in color to SP 722 (Stormy Blue) ? That sample worked well in my house; the others looked too green on my walls.<br /><br />Thank you,<br />Arun Phan<br /><br />`;

async function fixMissingReadingContext() {
    try {
        const batch = db.batch();

        const doc368 = await db.collection('questions').doc('368').get();
        if (doc368.exists) {
            batch.update(doc368.ref, { question_text: emailContext + "68) What is most likely TRUE about order #3397?" });
        }

        const doc369 = await db.collection('questions').doc('369').get();
        if (doc369.exists) {
            batch.update(doc369.ref, { question_text: emailContext + "69) Which color does Mr. Phan indicate that he likes?" });
        }

        const doc370 = await db.collection('questions').doc('370').get();
        if (doc370.exists) {
            batch.update(doc370.ref, { question_text: emailContext + "70) What problem does Mr. Phan mention in his e-mail?" });
        }

        await batch.commit();
        console.log(`Successfully fixed questions 68-70.`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixMissingReadingContext();
