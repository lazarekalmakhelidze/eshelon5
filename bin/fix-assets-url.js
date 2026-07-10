import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load service account from server/.env or default path
const serviceAccountPath = 'D:\\DEV\\PreExamV2\\server\\firebase-service-account.json';
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
    console.log('Fetching assets...');
    const assetsSnapshot = await db.collection('assets').get();
    const assetsMap = {};
    assetsSnapshot.forEach(doc => {
        assetsMap[doc.id] = doc.data().downloadUrl;
    });

    console.log('Fetching system_settings...');
    const settingsDoc = await db.collection('system_settings').doc('default').get();
    if (!settingsDoc.exists) {
        console.log('No settings found!');
        return;
    }

    const data = settingsDoc.data();
    const assetConfigs = data.animation_asset_configs || {};
    let updated = false;

    for (const [key, config] of Object.entries(assetConfigs)) {
        if (!config.animationUrl && assetsMap[key]) {
            config.animationUrl = assetsMap[key];
            updated = true;
        }
    }

    if (updated) {
        console.log('Updating system_settings with animationUrl...');
        await db.collection('system_settings').doc('default').update({
            animation_asset_configs: assetConfigs
        });
        console.log('Done!');
    } else {
        console.log('No updates needed.');
    }
}

run().catch(console.error);
