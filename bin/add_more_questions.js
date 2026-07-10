const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

const newQuestions = [
    // --- ภาษาอังกฤษ (Grammar & Structure) ---
    {
        question_text: "............... building do you like more?",
        choice_a: "who", choice_b: "what", choice_c: "where", choice_d: "which",
        correct_answer: "d",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Grammar"]
    },
    {
        question_text: "Hold the line, please. I will ............... you through.",
        choice_a: "put", choice_b: "tell", choice_c: "try", choice_d: "take",
        correct_answer: "a",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Vocabulary"]
    },
    {
        question_text: "People have to stand ............... a line to buy coffee.",
        choice_a: "at", choice_b: "in", choice_c: "to", choice_d: "over",
        correct_answer: "b",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Preposition"]
    },
    {
        question_text: "Asia is ............... larger than Australia.",
        choice_a: "most", choice_b: "more", choice_c: "many", choice_d: "much",
        correct_answer: "d",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Grammar"]
    },
    {
        question_text: "Hold on a minute, I ............... in 5 minutes.",
        choice_a: "return", choice_b: "have return", choice_c: "would return", choice_d: "am returning",
        correct_answer: "d",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Tense"]
    },
    // --- ภาษาอังกฤษ (Conversation) ---
    {
        question_text: "Conversation: Phone Call\nLuke: Hello? Hi, Stephanie, ............... (51) ...............\nStephanie: Hi, Luke! How are you? ............... (52) ............... stop and pick up extra paper for the computer printer?\nLuke: What did you say? ............... (53) ...............\nDid you say pick up ink for the printer? Sorry, ............... (54) ...............\nStephanie: Can you hear me now? No, I need more computer paper. Listen, I'll text you exactly what I need. Thanks, Luke. Talk to you later.\nLuke: Thanks, Stephanie. Sorry, ............... (55) ...............\n\nข้อ 51 เติมคำในช่องว่าง",
        choice_a: "How are you?", choice_b: "May I add you something?", choice_c: "Are you doing anything?", choice_d: "How are things at the office?",
        correct_answer: "a",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Conversation"]
    },
    {
        question_text: "ข้อ 52 เติมคำในช่องว่าง (อ้างอิงบทสนทนา Phone Call)",
        choice_a: "Can you please", choice_b: "Why don't you", choice_c: "How can I help you", choice_d: "Can you do such a thing",
        correct_answer: "a",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Conversation"]
    },
    {
        question_text: "ข้อ 53 เติมคำในช่องว่าง (อ้างอิงบทสนทนา Phone Call)",
        choice_a: "Can you tell me about this?", choice_b: "Can you repeat that, please?", choice_c: "Can you read it again?", choice_d: "Do you want me to confirm it?",
        correct_answer: "b",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Conversation"]
    },
    {
        question_text: "ข้อ 54 เติมคำในช่องว่าง (อ้างอิงบทสนทนา Phone Call)",
        choice_a: "the mobile phone is broken", choice_b: "the mobile phone is cutting out", choice_c: "the mobile phone is out of stock", choice_d: "the mobile phone is out of order",
        correct_answer: "b",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Conversation"]
    },
    {
        question_text: "ข้อ 55 เติมคำในช่องว่าง (อ้างอิงบทสนทนา Phone Call)",
        choice_a: "mobile is gone", choice_b: "mobile is not good", choice_c: "mobile is not mine", choice_d: "mobile has really bad reception here",
        correct_answer: "d",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Conversation"]
    },
    // --- คณิตศาสตร์ทั่วไป ---
    {
        question_text: "พ่อค้าติดป้ายราคาสินค้าไว้ 13,200 บาท ซึ่งได้กำไร 20% ถ้าลดราคาให้ลูกค้า 15% จากป้าย พ่อค้าจะได้กำไรหรือขาดทุนกี่เปอร์เซ็นต์",
        choice_a: "กำไร 2%", choice_b: "กำไร 5%", choice_c: "ขาดทุน 2%", choice_d: "ขาดทุน 5%",
        correct_answer: "a",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "คณิตศาสตร์ทั่วไป", "กำไรขาดทุน"]
    },
    {
        question_text: "A มีเงิน 85 บาท แบ่งให้ B ไป 15 บาท ทำให้ A เหลือเงิน 1/3 ของ B ถ้า B มีเงินน้อยกว่า C อยู่ 100 บาท จงหาว่าเดิม C มีเงินมากกว่า A กี่บาท",
        choice_a: "200", choice_b: "210", choice_c: "225", choice_d: "240",
        correct_answer: "c",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "คณิตศาสตร์ทั่วไป", "สมการ"]
    },
    {
        question_text: "ฟาร์มสัตว์แห่งหนึ่งนับขาไก่และขาหมูรวมกันได้ 120 ขา ถ้าจำนวนหมูมากกว่า 2 เท่าของจำนวนไก่อยู่ 5 ตัว จงหาว่าฟาร์มแห่งนี้มีหมูและไก่รวมกันกี่ตัว",
        choice_a: "25", choice_b: "30", choice_c: "35", choice_d: "40",
        correct_answer: "c",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "คณิตศาสตร์ทั่วไป", "สมการ"]
    },
    {
        question_text: "แม่ค้าขายบ๊วยได้ 1/6 ของขวด ต่อมาขายเพิ่มได้อีก 10 เม็ด ยังเหลือบ๊วยในขวดอีก 35 เม็ด จงหาว่าเดิมมีบ๊วยในขวดทั้งหมดกี่เม็ด",
        choice_a: "48", choice_b: "54", choice_c: "67", choice_d: "72",
        correct_answer: "b",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "คณิตศาสตร์ทั่วไป", "เศษส่วน"]
    },
    {
        question_text: "นมช็อคโกแลต 50 ลิตร มีความเข้มข้นของช็อคโกแลต 6% ถ้าผสมนมจืดเข้าไปอีก 10 ลิตร จะได้นมช็อคโกแลตที่มีความเข้มข้นของช็อคโกแลตกี่เปอร์เซ็นต์",
        choice_a: "2%", choice_b: "3%", choice_c: "4%", choice_d: "5%",
        correct_answer: "d",
        category: "ความสามารถทั่วไป (คณิตศาสตร์)", catalogs: ["ความสามารถทั่วไป (คณิตศาสตร์)", "คณิตศาสตร์ทั่วไป", "ร้อยละ/เปอร์เซ็นต์"]
    },
    // --- เงื่อนไขภาษา ---
    {
        question_text: "เงื่อนไขสำหรับข้อ 37 - 40\n- แบ่งผลไม้ 20 ลูก ให้รัตนา ธราพงษ์ ยงยุทธ สุดใจ แต่ละคนได้ผลไม้จำนวนเท่ากัน\n- ผลไม้มี 3 ชนิด คือ มะม่วง มังคุด และชมพู่\n- มังคุดมีจำนวนเป็น 3 เท่าของมะม่วง\n- มะม่วงมีจำนวน 3 ลูก รัตนาได้ไปทั้งหมด\n- ทุกคนได้ผลไม้คนละ 2 ชนิด และได้มังคุดอย่างน้อยคนละ 2 ลูก\n\nข้อ 37)\nข้อสรุปที่ 1 ชมพู่มีจำนวนทั้งหมด 8 ลูก\nข้อสรุปที่ 2 ยงยุทธได้มังคุด 2 ลูก",
        choice_a: "ข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข", choice_b: "ข้อสรุปทั้งสองไม่เป็นจริงตามเงื่อนไข", choice_c: "ข้อสรุปทั้งสองไม่แน่ชัด", choice_d: "ข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งเป็นจริง ไม่เป็นจริง หรือไม่แน่ชัด (ไม่เหมือนกัน)",
        correct_answer: "d",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "เงื่อนไขภาษา"]
    },
    {
        question_text: "อ้างอิงเงื่อนไขข้อ 37-40\nข้อ 38)\nข้อสรุปที่ 1 ยงยุทธได้ชมพู่มากกว่า 1 ลูก\nข้อสรุปที่ 2 สุดใจได้ชมพู่ 4 ลูก",
        choice_a: "ข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข", choice_b: "ข้อสรุปทั้งสองไม่เป็นจริงตามเงื่อนไข", choice_c: "ข้อสรุปทั้งสองไม่แน่ชัด", choice_d: "ข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งเป็นจริง ไม่เป็นจริง หรือไม่แน่ชัด (ไม่เหมือนกัน)",
        correct_answer: "d",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "เงื่อนไขภาษา"]
    },
    {
        question_text: "อ้างอิงเงื่อนไขข้อ 37-40\nข้อ 39)\nข้อสรุปที่ 1 ชมพู่มีจำนวนมากกว่ามังคุด\nข้อสรุปที่ 2 ธราพงษ์ได้มังคุดมากกว่าชมพู่",
        choice_a: "ข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข", choice_b: "ข้อสรุปทั้งสองไม่เป็นจริงตามเงื่อนไข", choice_c: "ข้อสรุปทั้งสองไม่แน่ชัด", choice_d: "ข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งเป็นจริง ไม่เป็นจริง หรือไม่แน่ชัด (ไม่เหมือนกัน)",
        correct_answer: "d",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "เงื่อนไขภาษา"]
    },
    {
        question_text: "อ้างอิงเงื่อนไขข้อ 37-40\nข้อ 40)\nข้อสรุปที่ 1 สุดใจได้มังคุดน้อยกว่ารัตนา\nข้อสรุปที่ 2 ไม่มีใครได้มังคุดมากกว่าชมพู่",
        choice_a: "ข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข", choice_b: "ข้อสรุปทั้งสองไม่เป็นจริงตามเงื่อนไข", choice_c: "ข้อสรุปทั้งสองไม่แน่ชัด", choice_d: "ข้อสรุปทั้งสองมีข้อสรุปใดข้อสรุปหนึ่งเป็นจริง ไม่เป็นจริง หรือไม่แน่ชัด (ไม่เหมือนกัน)",
        correct_answer: "b",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "เงื่อนไขภาษา"]
    },
    // --- ภาษาไทย ---
    {
        question_text: "จากข้อความต่อไปนี้ผู้เขียนมีจุดประสงค์ตามข้อใด\nปัจจุบันเชื้อเพลิงฟอสซิลถูกนำมาใช้ในการผลิตพลังงานไฟฟ้ามากที่สุดในโลกเมื่อเทียบกับเชื้อเพลิงประเภทอื่น ๆ ในขณะเดียวกันเชื้อเพลิงชนิดนี้มีราคาพุ่งสูงขึ้นเรื่อย ๆ อีกทั้งยังส่งผลกระทบต่อสิ่งแวดล้อม ดังนั้นพลังงานหมุนเวียนซึ่งเป็นพลังงานสะอาดโดยเฉพาะอย่างยิ่งพลังงานน้ำจึงเป็นทางเลือกที่น่าสนใจในการผลิตพลังงานไฟฟ้าแทนเชื้อเพลิงฟอสซิล เนื่องจากพลังงานน้ำไม่ก่อให้เกิดมลพิษทางอากาศและสร้างแก๊สเรือนกระจกในปริมาณน้อยมาก",
        choice_a: "ให้ความรู้เรื่องเชื้อเพลิงฟอสซิลที่ใช้อยู่ในปัจจุบัน", choice_b: "เสนอแนะให้เลิกใช้เชื้อเพลิงฟอสซิลเพราะราคาแพงมาก", choice_c: "ตำหนิการใช้พลังงานเดิม ๆ ที่ก่อให้เกิดมลพิษทางอากาศ", choice_d: "สนับสนุนให้ใช้พลังงานน้ำทดแทนพลังงานอื่นเพราะไม่ทำลายสิ่งแวดล้อม",
        correct_answer: "d",
        category: "ภาษาไทย", catalogs: ["ภาษาไทย", "การอ่านจับใจความ"]
    },
    {
        question_text: "จากข้อความต่อไปนี้ข้อใดคือใจความสำคัญของบทความ\nความก้าวหน้าทางงานราชการ มันเป็นรูปทรงปิรามิด คือในกรมหนึ่งมีอธิบดีเพียงคนเดียว จึงต้องอาศัยการต่อสู้ด้วยความสามารถ อันนี้ต้องขึ้นอยู่กับคุณธรรมด้วย ถ้าผู้บังคับบัญชายึดถือคุณธรรมเป็นหลัก ความสามารถก็เป็นดัชนีชี้ความก้าวหน้า คนที่ทำงานดีเด่นก็มีกำลังใจในการทำงาน แต่แวดวงข้าราชการจะไม่เป็นอย่างนี้ทุกแห่ง บางแห่งใช้ระบบพรรคพวก บางแห่งใช้ระบบเส้นสาย ดังนั้น คนทำงานมีฝีมืออาจจะผิดหวัง อาจจะทนไม่ได้จนแทบจะลาออกไป",
        choice_a: "ความก้าวหน้าทางงานราชการแต่ละแห่งไม่เหมือนกัน", choice_b: "ความก้าวหน้าของงานราชการขึ้นอยู่กับความสามารถ", choice_c: "ความก้าวหน้าของงานราชการขึ้นอยู่ผู้บังคับบัญชา", choice_d: "ความก้าวหน้าของงานราชการส่วนใหญ่ใช้ระบบพรรคพวก เส้นสาย",
        correct_answer: "a",
        category: "ภาษาไทย", catalogs: ["ภาษาไทย", "การอ่านจับใจความ"]
    }
];

async function addMoreQuestions() {
    try {
        const snapshot = await db.collection('questions').orderBy('id', 'desc').limit(1).get();
        let startId = 1000;
        if (!snapshot.empty) {
            const maxId = parseInt(snapshot.docs[0].id) || parseInt(snapshot.docs[0].data().id);
            if (!isNaN(maxId)) {
                startId = maxId + 1;
            }
        }
        
        const batch = db.batch();
        
        newQuestions.forEach((q, index) => {
            const docId = (startId + index).toString();
            const docRef = db.collection('questions').doc(docId);
            
            const fullQuestion = {
                id: docId,
                ...q,
                subject: 'กพ ภาค ก',
                skill: q.category, // using category as general skill
                exam_set: 'ข้อสอบจริง กพ พิเศษ (19 กพ 66)',
                exam_year: '2566',
                explanation: 'ข้อสอบจริง กพ ภาค ก ปี 66 (สอบพิเศษ 19 ก.พ. 66)',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                difficulty: 50,
                rating: 0,
                ratingCount: 0
            };
            
            batch.set(docRef, fullQuestion);
        });
        
        await batch.commit();
        console.log(`Successfully added ${newQuestions.length} questions starting from ID ${startId}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

addMoreQuestions();
