const { db } = require('./server/config/firebase');

async function run() {
    const snapshot = await db.collection('room_assets').get();
    snapshot.forEach(doc => {
        console.log(`Asset: ${doc.id}`);
        console.log(doc.data());
    });
}

run().catch(console.error);
