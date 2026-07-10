const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src', 'index.ts');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Refactor questions
// firestore.createDocument("questions", { ... }) => await env.DB.prepare("INSERT INTO questions (...) VALUES (...)").run()
// Since creating questions is tricky with regex, let's target specific known patterns.
// But wait, it's actually easier to write a helper `const d1Helper = new D1Helper(env.DB)` in index.ts
// and then replace `firestore.` with `d1Helper.` for specific collections!

// Let's inject a simple D1Helper class at the top of index.ts
const d1HelperCode = `
class D1Helper {
  constructor(private db: any) {}
  async getDocument(collection: string, id: string) {
    const row = await this.db.prepare(\`SELECT * FROM \${collection} WHERE id = ?\`).bind(id).first();
    if (!row) return null;
    if (row.choices) { try { row.choices = JSON.parse(row.choices); } catch {} }
    return row;
  }
  async createDocument(collection: string, data: any, id?: string) {
    const docId = id || crypto.randomUUID();
    const cols = ['id', ...Object.keys(data)];
    const vals = [docId, ...Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : v)];
    const placeholders = cols.map(() => '?').join(', ');
    await this.db.prepare(\`INSERT INTO \${collection} (\${cols.join(', ')}) VALUES (\${placeholders})\`).bind(...vals).run();
    return { id: docId, ...data };
  }
  async updateDocument(collection: string, id: string, data: any) {
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(data)) {
      sets.push(\`\${k} = ?\`);
      vals.push(typeof v === 'object' ? JSON.stringify(v) : v);
    }
    vals.push(id);
    await this.db.prepare(\`UPDATE \${collection} SET \${sets.join(', ')} WHERE id = ?\`).bind(...vals).run();
    return { id, ...data }; // Note: partial data return
  }
  async deleteDocument(collection: string, id: string) {
    await this.db.prepare(\`DELETE FROM \${collection} WHERE id = ?\`).bind(id).run();
  }
  async runQuery(query: any) {
    // Only simple queries used for questions and seasons
    let collection = query.from[0].collectionId;
    let sql = \`SELECT * FROM \${collection}\`;
    let vals = [];
    if (query.where && query.where.fieldFilter) {
      sql += \` WHERE \${query.where.fieldFilter.field.fieldPath} = ?\`;
      const valObj = query.where.fieldFilter.value;
      vals.push(valObj.stringValue || valObj.integerValue || valObj.booleanValue);
    }
    if (query.orderBy) {
      const order = query.orderBy[0];
      sql += \` ORDER BY \${order.field.fieldPath} \${order.direction === 'DESCENDING' ? 'DESC' : 'ASC'}\`;
    }
    if (query.limit) {
      sql += \` LIMIT \${query.limit}\`;
    }
    const results = await this.db.prepare(sql).bind(...vals).all();
    return results.results.map((r: any) => {
      if (r.choices) { try { r.choices = JSON.parse(r.choices); } catch {} }
      return r;
    });
  }
}
`;

// Insert the helper after imports
if (!code.includes('class D1Helper')) {
  code = code.replace('export { RealtimeDO };', 'export { RealtimeDO };\n' + d1HelperCode);
}

// In requireAdmin and requireAuthUserId we don't have request env directly in all places,
// wait, inside the fetch handler we DO have \`env\`.
// We can instantiate \`const d1Helper = new D1Helper(env.DB);\` right inside \`async fetch(request, env) {\`
if (!code.includes('const d1Helper = new D1Helper(env.DB);')) {
  code = code.replace('async fetch(request, env) {', 'async fetch(request, env) {\n    const d1Helper = new D1Helper(env.DB);');
}

// Now replace firestore. calls for "questions" and "seasons"
code = code.replace(/firestore\.getDocument\("questions"/g, 'd1Helper.getDocument("questions"');
code = code.replace(/firestore\.createDocument\("questions"/g, 'd1Helper.createDocument("questions"');
code = code.replace(/firestore\.updateDocument\("questions"/g, 'd1Helper.updateDocument("questions"');
code = code.replace(/firestore\.deleteDocument\("questions"/g, 'd1Helper.deleteDocument("questions"');
code = code.replace(/firestore\.runQuery\(\{\s*from:\s*\[\{\s*collectionId:\s*"questions"\s*\}\].*?\}\)/g, (match) => {
  return match.replace('firestore.', 'd1Helper.');
});
// Need a more robust regex for multi-line queries
code = code.replace(/firestore\.runQuery\(([\s\S]*?collectionId:\s*"questions"[\s\S]*?)\)/g, 'd1Helper.runQuery($1)');

code = code.replace(/firestore\.getDocument\("seasons"/g, 'd1Helper.getDocument("seasons"');
code = code.replace(/firestore\.createDocument\("seasons"/g, 'd1Helper.createDocument("seasons"');
code = code.replace(/firestore\.updateDocument\("seasons"/g, 'd1Helper.updateDocument("seasons"');
code = code.replace(/firestore\.deleteDocument\("seasons"/g, 'd1Helper.deleteDocument("seasons"');
code = code.replace(/firestore\.runQuery\(([\s\S]*?collectionId:\s*"seasons"[\s\S]*?)\)/g, 'd1Helper.runQuery($1)');

fs.writeFileSync(targetFile, code);
console.log('Refactoring complete.');
