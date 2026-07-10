require('dotenv').config({ path: './server/.env' });
const { db } = require('./server/config/firebase');

async function run() {
    console.log('Fetching system_settings...');
    const configsDoc = await db.collection('system_settings').doc('animation_asset_configs').get();
    const usageDoc = await db.collection('system_settings').doc('animation_usage_map').get();
    
    if (usageDoc.exists) {
        console.log('Usage Map:', JSON.stringify(usageDoc.data().value, null, 2));
    }
    
    if (configsDoc.exists) {
        const assetConfigs = configsDoc.data().value;
        let count = 0;
        for (const [key, config] of Object.entries(assetConfigs)) {
            if (config.animationUrl) {
                console.log(`Asset ${key} has animationUrl!`);
                count++;
            }
        }
        console.log(`Total configs with URL: ${count}`);
    } else {
        console.log('No asset configs found!');
    }
}

run().catch(console.error);
