UPDATE questions
SET catalogs = replace(catalogs, '"ภาษาอังกฤษ",', '')
WHERE catalogs LIKE '%"ภาษาอังกฤษ",%';

UPDATE questions
SET catalogs = replace(catalogs, '"ภาษาอังกฤษ", ', '')
WHERE catalogs LIKE '%"ภาษาอังกฤษ", %';

UPDATE questions
SET catalogs = replace(catalogs, ',"ภาษาอังกฤษ"', '')
WHERE catalogs LIKE '%,"ภาษาอังกฤษ"%';

UPDATE questions
SET catalogs = replace(catalogs, ' , "ภาษาอังกฤษ"', '')
WHERE catalogs LIKE '% , "ภาษาอังกฤษ"%';

UPDATE questions
SET catalogs = replace(catalogs, '"กฎหมาย",', '')
WHERE catalogs LIKE '%"กฎหมาย",%';

UPDATE questions
SET catalogs = replace(catalogs, '"กฎหมาย", ', '')
WHERE catalogs LIKE '%"กฎหมาย", %';

UPDATE questions
SET catalogs = replace(catalogs, ',"กฎหมาย"', '')
WHERE catalogs LIKE '%,"กฎหมาย"%';

UPDATE questions
SET catalogs = replace(catalogs, '"ความสามารถในการวิเคราะห์",', '')
WHERE catalogs LIKE '%"ความสามารถในการวิเคราะห์",%';

UPDATE questions
SET catalogs = replace(catalogs, '"ความสามารถในการวิเคราะห์", ', '')
WHERE catalogs LIKE '%"ความสามารถในการวิเคราะห์", %';

UPDATE questions
SET catalogs = replace(catalogs, ',"ความสามารถในการวิเคราะห์"', '')
WHERE catalogs LIKE '%,"ความสามารถในการวิเคราะห์"%';

-- Clean up any malformed array elements like `[ "Reading"]` or `["Reading" ]`
UPDATE questions
SET catalogs = replace(catalogs, '[ ', '[')
WHERE catalogs LIKE '%[ %';

UPDATE questions
SET catalogs = replace(catalogs, ' ]', ']')
WHERE catalogs LIKE '% ]%';

-- In case there are empty arrays or exact matches
UPDATE questions SET catalogs = '[]' WHERE catalogs = '["ภาษาอังกฤษ"]';
UPDATE questions SET catalogs = '[]' WHERE catalogs = '["กฎหมาย"]';
UPDATE questions SET catalogs = '[]' WHERE catalogs = '["ความสามารถในการวิเคราะห์"]';
