const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

async function fixDatabase() {
    try {
        const snapshot = await db.collection('questions').get();
        let updatedCount = 0;
        
        const batch = db.batch();
        let batchCount = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            let needsUpdate = false;
            let newCategory = data.category;
            let newCatalogs = data.catalogs;
            
            // Check if catalogs is a string representation of an array
            if (typeof newCatalogs === 'string') {
                try {
                    const parsed = JSON.parse(newCatalogs);
                    if (Array.isArray(parsed)) {
                        newCatalogs = parsed;
                    } else {
                        newCatalogs = [newCatalogs];
                    }
                } catch(e) {
                    newCatalogs = [newCatalogs];
                }
                needsUpdate = true;
            }
            
            // If it's undefined or null, default to empty array
            if (!newCatalogs) {
                newCatalogs = [];
                needsUpdate = true;
            }
            
            // Mapping Logic
            if (newCategory === 'ความรู้พื้นฐานในการปฏิบัติราชการ') {
                newCategory = 'กฎหมาย';
                if (!newCatalogs.includes('กฎหมาย')) newCatalogs.unshift('กฎหมาย');
                needsUpdate = true;
            } else if (newCategory === 'วิชาความสามารถในการศึกษา วิเคราะห์ และสรุปเหตุผล') {
                newCategory = 'ความสามารถในการวิเคราะห์';
                if (!newCatalogs.includes('ความสามารถในการวิเคราะห์')) newCatalogs.unshift('ความสามารถในการวิเคราะห์');
                needsUpdate = true;
            } else if (newCategory === 'นักวิชาการตรวจสอบภายใน') {
                newCategory = 'ความสามารถเฉพาะตำแหน่ง';
                if (!newCatalogs.includes('นักวิชาการตรวจสอบภายใน')) newCatalogs.unshift('นักวิชาการตรวจสอบภายใน');
                needsUpdate = true;
            } else if (newCategory === 'ภาษาอังกฤษ') {
                if (!newCatalogs.includes('ภาษาอังกฤษ')) newCatalogs.unshift('ภาษาอังกฤษ');
                // needsUpdate = true if catalogs was modified, handled below by checking differences
            }
            
            // Clean up old catalog names from the array
            const filteredCatalogs = newCatalogs.map(c => {
                if (typeof c !== 'string') return c;
                if (c === 'ความรู้พื้นฐานในการปฏิบัติราชการ') return 'กฎหมาย';
                if (c === 'วิชาความสามารถในการศึกษา วิเคราะห์ และสรุปเหตุผล') return 'ความสามารถในการวิเคราะห์';
                return c.trim();
            });
            
            // Remove duplicates
            const uniqueCatalogs = [...new Set(filteredCatalogs)];
            
            // Check if anything actually changed
            if (
                data.category !== newCategory || 
                JSON.stringify(data.catalogs) !== JSON.stringify(uniqueCatalogs)
            ) {
                batch.update(doc.ref, {
                    category: newCategory,
                    catalogs: uniqueCatalogs
                });
                
                updatedCount++;
                batchCount++;
                console.log(`Will update doc ${doc.id}: category -> ${newCategory}, catalogs -> ${JSON.stringify(uniqueCatalogs)}`);
            }
            
            // Firestore batches are limited to 500 operations
            if (batchCount === 490) {
                // Not implementing full batch pagination here since total questions < 500
            }
        });
        
        if (batchCount > 0) {
            console.log(`Committing batch of ${batchCount} updates...`);
            await batch.commit();
            console.log("Successfully updated.");
        } else {
            console.log("No documents needed updating.");
        }
        
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

fixDatabase();
