const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

async function inspect() {
    try {
        const q197 = await db.collection('questions').doc('197').get();
        console.log("Question 197:");
        console.log(q197.data());

        const q220 = await db.collection('questions').doc('220').get();
        console.log("\nQuestion 220:");
        console.log(q220.data());
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

inspect();
