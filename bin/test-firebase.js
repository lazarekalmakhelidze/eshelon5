const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

async function testQuery() {
    try {
        console.log("Checking threads collection...");
        const threadsRef = db.collection('threads');
        
        const snapshot1 = await threadsRef.get();
        console.log("Total docs in collection:", snapshot1.size);
        
        const snapshot2 = await threadsRef.orderBy('created_at', 'desc').get();
        console.log("Docs with created_at:", snapshot2.size);
        
        snapshot2.forEach(doc => {
            console.log(doc.id, doc.data().title);
        });

        // Test create
        console.log("Testing create thread...");
        const newRef = threadsRef.doc();
        await newRef.set({
            title: "Test Thread",
            created_at: new Date().toISOString()
        });
        console.log("Created successfully with ID:", newRef.id);
        
    } catch (e) {
        console.error("Error:", e);
    }
}

testQuery();
