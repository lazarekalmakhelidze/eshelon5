import { FirestoreClient, parseServiceAccount } from "./src/firestore.js";
import { execSync } from "child_process";
import fs from "fs";

async function main() {
    const res = await fetch("https://preexam-api.jimwar02.workers.dev/api/admin/dump-firebase-config");
    const data = await res.json();
    const parsedConfig = parseServiceAccount({ FIREBASE_SERVICE_ACCOUNT: data.config });
    if (!parsedConfig) throw new Error("No config");
    
    const client = new FirestoreClient(parsedConfig);
    
    const missing = ["users", "system_logs", "exam_results", "transactions", "news"];
    for (const col of missing) {
        console.log(`Fetching ${col}...`);
        const docs = await client.runQuery({ from: [{ collectionId: col }] });
        console.log(`Fetched ${docs.length} docs for ${col}`);
        
        let sql = ``;
        for (const doc of docs) {
            const insertData = { ...doc };
            delete insertData.id; delete insertData.doc_id; delete insertData.field_id;
            const cols = ["id", ...Object.keys(insertData)];
            const vals = [`'${doc.id.replace(/'/g, "''")}'`, ...Object.values(insertData).map(v => {
                if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
                if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                if (v === null || v === undefined) return 'NULL';
                return v;
            })];
            sql += `INSERT OR IGNORE INTO ${col} (${cols.join(", ")}) VALUES (${vals.join(", ")});\n`;
        }
        
        fs.writeFileSync(`temp_${col}.sql`, sql);
        console.log(`Executing wrangler for ${col}...`);
        execSync(`npx wrangler d1 execute preexam --remote --file=temp_${col}.sql`, { stdio: 'inherit' });
        fs.unlinkSync(`temp_${col}.sql`);
    }
}

main().catch(console.error);
