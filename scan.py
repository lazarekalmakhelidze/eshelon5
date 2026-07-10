import json

with open('d:/DEV/PreExamV2/src/views/admin/ExamSetManager.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'const createMutation = useMutation({' in line:
        print(f"Insert queries at {i}")
    if 'const handleCreate = (e) => {' in line:
        print(f"Insert logic functions at {i}")
    if '<!-- Catalog Checkboxes would go here -->' in line or '<div>' in line and 'rules' in lines[i+1]:
        print(f"Insert UI near {i}")
