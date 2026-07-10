const fs = require('fs');
let code = fs.readFileSync('worker/src/index.ts', 'utf8');

const regex = /const fetchLogs = async \(value: any\) => \{[\s\S]*?return results \|\| \[\];\s*\};/m;

const replacement = `const fetchLogs = async (value: any) => {
            const rawUserId = value?.stringValue ?? value?.integerValue ?? value;
            const { results: results1 } = await env.DB
              .prepare("SELECT * FROM system_logs WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 10")
              .bind(String(rawUserId))
              .all();
              
            const { results: results2 } = await env.DB
              .prepare("SELECT doc_id as id, json_extract(data, '$.action') as action, json_extract(data, '$.user_id') as user_id, json_extract(data, '$.details') as details, json_extract(data, '$.created_at') as created_at FROM firestore_documents WHERE collection_path = 'system_logs' AND json_extract(data, '$.user_id') = ? ORDER BY datetime(created_at) DESC LIMIT 10")
              .bind(String(rawUserId))
              .all();

            const combined = [...(results1 || []), ...(results2 || [])].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 10);
            return combined;
          };`;

if (regex.test(code)) {
  fs.writeFileSync('worker/src/index.ts', code.replace(regex, replacement));
  console.log('Successfully replaced fetchLogs');
} else {
  console.log('Target block not found. Cannot replace.');
}
