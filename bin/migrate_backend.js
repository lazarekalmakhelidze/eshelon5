import fs from 'fs/promises';
import path from 'path';

// การตั้งค่า
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const LOCAL_MODEL = 'qwen2.5-coder:1.5b'; // เปลี่ยนเป็น 1.5b ตามที่คุณแนะนำเพื่อประหยัด RAM

// สามารถเพิ่ม Cloud fallback ได้ เช่น Groq / OpenAI
const CLOUD_URL = 'https://api.cerebras.ai/v1/chat/completions';
const CLOUD_KEY = 'csk-hycteynvrr3k8w3ck3rcttvx5h9hjcy54ryt8edkkky8ffnd'; // ใช้คีย์ Cerebras
const CLOUD_MODEL = 'llama3.1-8b';

async function callLLM(prompt) {
  // ลองเรียก Cloud ก่อน ถ้าตั้งค่าไว้
  if (CLOUD_KEY) {
    try {
      console.log('กำลังเรียกใช้งาน Cloud AI...');
      const res = await fetch(CLOUD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CLOUD_KEY}`
        },
        body: JSON.stringify({
          model: CLOUD_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        })
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content;
      } else {
        console.warn('Cloud API Error, falling back to Local...', res.statusText);
      }
    } catch (e) {
      console.warn('Cloud API Exception, falling back to Local...', e.message);
    }
  }

  // Fallback มาใช้ Local Ollama (เครื่องไหว รัน local ได้เลย)
  console.log(`กำลังเรียกใช้งาน Local AI (${LOCAL_MODEL})...`);
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LOCAL_MODEL,
      prompt: prompt,
      stream: false,
      options: { temperature: 0.1 }
    })
  });

  if (!res.ok) {
    throw new Error(`Local LLM failed: ${res.statusText}`);
  }
  const data = await res.json();
  return data.response;
}

async function migrateControllers() {
  const sourceDir = 'D:/DEV/PreExam/server/controllers';
  const targetDir = 'D:/DEV/PreExamV2/src/app/api';

  try {
    const files = await fs.readdir(sourceDir);
    
    for (const file of files) {
      if (!file.endsWith('.js')) continue;
      
      console.log(`กำลังประมวลผลไฟล์: ${file}`);
      const filePath = path.join(sourceDir, file);
      const code = await fs.readFile(filePath, 'utf-8');
      
      const prompt = `
You are an expert developer. Convert this Express.js controller file to Next.js App Router API Route format.
The file is: ${file}

CRITICAL INSTRUCTIONS:
1. Use Next.js App Router syntax ONLY. You must export named functions: \`export async function GET(req, { params })\`, \`export async function POST(req, { params })\`, etc.
2. DO NOT use \`export default function handler\`. That is for Pages Router.
3. Import and use \`NextResponse\` from 'next/server'. Return responses like \`return NextResponse.json({ data }, { status: 200 })\`.
4. Read body using \`const body = await req.json();\`.
5. Read query params using \`const { searchParams } = new URL(req.url);\`.
6. DO NOT output any conversational text like "Here is the code" or "Note that...".
7. ONLY output the raw valid javascript code. No markdown formatting (\`\`\`javascript).
8. Keep all business logic and functionality exactly the same.

Code to convert:
${code}
      `;

      try {
        let nextjsCode = await callLLM(prompt);
        // Clean up markdown block and conversational text if LLM still outputs it
        nextjsCode = nextjsCode.replace(/^```(javascript|js|ts)?\n/gmi, '').replace(/```$/gmi, '');
        nextjsCode = nextjsCode.replace(/^(Here is|Sure|Note|Converted|This is).*?\n/gmi, '');
        nextjsCode = nextjsCode.replace(/Note that.*$/gmi, '');
        
        // สร้างโฟลเดอร์สำหรับ API
        const routeName = file.replace('Controller.js', '').replace('.js', '').toLowerCase();
        const routeDir = path.join(targetDir, routeName);
        await fs.mkdir(routeDir, { recursive: true });
        
        await fs.writeFile(path.join(routeDir, 'route.js'), nextjsCode);
        console.log(`✅ แปลงสำเร็จ: ${routeDir}/route.js`);
        
        // หน่วงเวลา 8 วินาทีเพื่อป้องกัน Cloud API Rate Limit
        console.log('รอ 8 วินาที เพื่อไม่ให้ Cloud API block...');
        await new Promise(r => setTimeout(r, 8000));
      } catch (err) {
        console.error(`❌ ล้มเหลวที่ ${file}:`, err.message);
      }
    }
  } catch (e) {
    console.error('Error reading directory:', e);
  }
}

migrateControllers();
