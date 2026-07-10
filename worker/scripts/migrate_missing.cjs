const fs = require('fs');
const { execSync } = require('child_process');

async function migrateCollection(col) {
    console.log(`Fetching ${col}...`);
    try {
        const res = await fetch(`https://preexam-api.jimwar02.workers.dev/api/admin/dump-firebase?col=${col}`);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Failed to fetch ${col}: ${res.status} ${text}`);
        }
        const data = await res.json();
        const docs = data.docs;
        
        if (!docs || docs.length === 0) {
            console.log(`No docs for ${col}`);
            return;
        }
        
        console.log(`Fetched ${docs.length} docs for ${col}. Generating SQL...`);
        let sql = ``;
        for (const doc of docs) {
            const insertData = { ...doc };
            delete insertData.id; delete insertData.doc_id; delete insertData.field_id;
            const cols = ["id", ...Object.keys(insertData)];
            const vals = [doc.id, ...Object.values(insertData).map(v => {
                if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
                if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                if (v === null || v === undefined) return 'NULL';
                return v;
            })];
            
            sql += `INSERT OR IGNORE INTO ${col} (${cols.join(", ")}) VALUES (${vals.join(", ")});\n`;
        }
        
        fs.writeFileSync(`temp_${col}.sql`, sql);
        console.log(`Saved to temp_${col}.sql. Executing via wrangler...`);
        execSync(`npx wrangler d1 execute preexam --remote --file=temp_${col}.sql`, { stdio: 'inherit' });
        console.log(`Successfully migrated ${col}`);
        fs.unlinkSync(`temp_${col}.sql`);
    } catch (e) {
        console.error(`Error processing ${col}:`, e);
    }
}

async function main() {
    const missing = ["users", "system_logs", "exam_results", "transactions", "news"];
    for (const col of missing) {
        await migrateCollection(col);
    }
}

main();
