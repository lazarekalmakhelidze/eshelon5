import json

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'toast.success("ดึงรูปแบบอัตโนมัติ เรียบร้อยแล้ว (เฉพาะข้อที่มี)");' in line:
        new_lines.append(line)
        skip = True
        continue
    if skip:
        if 'const handleCatalogToggle = (catalog) => {' in line:
            skip = False
        else:
            continue
    new_lines.append(line)

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Fixed!")
