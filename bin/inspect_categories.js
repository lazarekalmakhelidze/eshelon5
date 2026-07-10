const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

async function listCategories() {
    try {
        const snapshot = await db.collection('questions').where('id', '>=', '220').where('id', '<=', '300').get();
        const cats = new Set();
        const catalogs = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.category) cats.add(data.category);
            if (Array.isArray(data.catalogs)) {
                data.catalogs.forEach(c => catalogs.add(c));
            }
        });
        
        console.log("Categories:", Array.from(cats));
        console.log("Catalogs:", Array.from(catalogs));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listCategories();
