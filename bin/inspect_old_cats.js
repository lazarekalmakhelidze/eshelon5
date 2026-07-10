const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

async function checkOldCats() {
    try {
        const snapshot = await db.collection('questions').where('id', '<', 220).get();
        const cats = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.category) cats.add(data.category);
        });
        
        console.log("Old Categories:", Array.from(cats));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkOldCats();
