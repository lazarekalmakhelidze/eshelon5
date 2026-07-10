const admin = require('firebase-admin');
const fetch = require('node-fetch');
require('dotenv').config({ path: '../../.env' }); // Adjust path if needed

// Initialize Firebase Admin (Using your existing firebase service account)
const serviceAccount = require('../../firebase-service-account.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// D1 Config
const D1_DATABASE_ID = '313bea1c-6bfa-492e-8faa-690d471ecb9d';
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function executeD1Query(query, params = []) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: query, params })
    });
    const result = await response.json();
    if (!result.success) {
        console.error("D1 Error:", result.errors);
        throw new Error(result.errors[0]?.message || 'Unknown D1 error');
    }
    return result.result[0];
}

async function migrateReports() {
    console.log("Migrating reported_content...");
    const snapshot = await db.collection('reported_content').get();
    for (const doc of snapshot.docs) {
        const data = doc.data();
        try {
            await executeD1Query(
                "INSERT INTO reported_content (id, reporter_id, target_type, target_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
                [
                    doc.id,
                    String(data.reporter_id || data.userId || 'system'),
                    String(data.target_type || data.type || 'unknown'),
                    String(data.target_id || 'unknown'),
                    String(data.reason || ''),
                    String(data.status || 'pending'),
                    data.created_at || new Date().toISOString()
                ]
            );
            console.log(`Migrated report ${doc.id}`);
        } catch (e) {
            console.error(`Failed to migrate report ${doc.id}:`, e.message);
        }
    }
}

async function migrateAssets() {
    console.log("Migrating room_assets to assets...");
    const snapshot = await db.collection('room_assets').get();
    for (const doc of snapshot.docs) {
        const data = doc.data();
        try {
            await executeD1Query(
                "INSERT INTO assets (id, type, name, url, is_premium, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
                [
                    doc.id,
                    String(data.type || 'background'),
                    String(data.name || 'Unnamed'),
                    String(data.url || ''),
                    data.is_premium ? 1 : 0,
                    data.created_at || new Date().toISOString()
                ]
            );
            console.log(`Migrated asset ${doc.id}`);
        } catch (e) {
            console.error(`Failed to migrate asset ${doc.id}:`, e.message);
        }
    }
}

async function run() {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        console.log("Skipping real migration script run: missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in env. However, the schema is prepared.");
        return;
    }
    await migrateReports();
    await migrateAssets();
    console.log("Migration finished.");
}

run().catch(console.error);
