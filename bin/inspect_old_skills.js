const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

async function checkOldSkills() {
    try {
        const snapshot = await db.collection('questions').where('id', '<', 220).get();
        const skills = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.skill) skills.add(data.category + " -> " + data.skill.trim());
        });
        
        console.log("Old Category -> Skills:", Array.from(skills));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkOldSkills();
