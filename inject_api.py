import sys

file_path = r'd:\DEV\PreExamV2\worker\src\index.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Insert /api/exam-sets public endpoint
admin_reports_idx = content.find('if (url.pathname === "/api/admin/reports"')

public_endpoints = '''
        // /api/exam-sets
        if (url.pathname === "/api/exam-sets" && request.method === "GET") {
          const sets = await listExamSets(db);
          return json({ success: true, data: sets });
        }
        
'''
content = content[:admin_reports_idx] + public_endpoints + content[admin_reports_idx:]

admin_users_idx = content.find('if (url.pathname === "/api/admin/users"')
admin_endpoints = '''
        // /api/admin/exam-sets
        if (url.pathname === "/api/admin/exam-sets" && request.method === "GET") {
          const sets = await listExamSets(db);
          return json({ success: true, data: sets });
        }
        if (url.pathname === "/api/admin/exam-sets" && request.method === "POST") {
          const body = await request.json();
          const result = await createExamSet(db, body);
          return json({ success: true, data: result }, { status: 201 });
        }
        if (url.pathname.startsWith("/api/admin/exam-sets/")) {
          const setId = url.pathname.split("/")[4];
          if (request.method === "PUT") {
            const body = await request.json();
            const result = await updateExamSet(db, setId, body);
            return json({ success: true, data: result });
          }
          if (request.method === "DELETE") {
            await deleteExamSet(db, setId);
            return json({ success: true });
          }
        }
        
'''

admin_users_idx = content.find('if (url.pathname === "/api/admin/users"')
content = content[:admin_users_idx] + admin_endpoints + content[admin_users_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
