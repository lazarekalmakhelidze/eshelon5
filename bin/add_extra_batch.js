const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const { db } = require('./server/config/firebase');

const newQuestions = [
    // --- ภาษาไทย (การอ่านจับใจความ) ---
    {
        question_text: "จากข้อความต่อไปนี้ข้อใดคือใจความสำคัญของบทความ\nถุงพลาสติกที่นำมาใส่อาหารสำเร็จรูปควรเป็นถุงใหม่ คือทำจากพลาสติกสังเคราะห์ใหม่ซึ่งเนื้อเรียบมัน ไม่มีสี นอกจากนี้ชนิดของถุงก็สำคัญถ้าจะใส่ของร้อนต้องใช้ถุงร้อน ถ้าจะใส่ของเย็นก็เลือกใช้ถุงสำหรับของเย็น ถุงพลาสติกที่มีสีไม่ควรนำมาใส่อาหารสำเร็จรูป เพราะสีที่ผสมอยู่ไม่ใช่สีที่รับประทานได้ ถ้านำมาบรรจุอาหารที่มีไขมัน อาหารร้อนและอาหารที่มีรสเปรี้ยว สีอาจจะละลายปนกับอาหาร เมื่อรับประทานก็จะสะสมอยู่ร่างกาย หากมีปริมาณมากจะเป็นอันตรายต่อร่างกายได้",
        choice_a: "ถุงพลาสติกที่มีสีไม่ควรนำมาใส่อาหารสำเร็จรูป", choice_b: "ถุงพลาสติกที่นำมาใส่อาหารสำเร็จรูปควรเป็นถุงใหม่", choice_c: "ควรใช้ถุงพลาสติกให้เหมาะสมกับประเภทอาหาร", choice_d: "ถุงพลาสติกที่ใช้บรรจุอาหารเป็นอันตรายต่อร่างกาย",
        correct_answer: "c",
        category: "ภาษาไทย", catalogs: ["ภาษาไทย", "การอ่านจับใจความ"]
    },
    {
        question_text: "จากข้อความต่อไปนี้ข้อใดคือประเด็นสำคัญของบทความ\nอากาศที่เราหายใจเข้าไปจะผ่านเข้าทางจมูก ผ่านลำคอ หลอดลม แล้วเข้าสู่ปอด ขณะที่อากาศผ่านจมูกต้องผ่านโพรงจมูก โพรงจมูกจะทำให้อากาศอุ่นขึ้น และขับสารเหลวออกมาเป็นน้ำมูก ดักสิ่งสกปรกจำพวกเชื้อโรค ฝุ่นละออง ไม่ให้เข้าไปในหลอดลมและปอด",
        choice_a: "ทางผ่านของลมหายใจ", choice_b: "หน้าที่ของโพรงจมูก", choice_c: "ประโยชน์ของน้ำมูก", choice_d: "การทำงานของปอด",
        correct_answer: "b",
        category: "ภาษาไทย", catalogs: ["ภาษาไทย", "การอ่านจับใจความ"]
    },
    {
        question_text: "จากข้อความต่อไปนี้ข้อใดคือวัตถุประสงค์ของผู้เขียนบทความ\nการตรวจคัดกรองความผิดปกติของโครโมโซมทารกตั้งแต่อยู่ในครรภ์ของมารดา ไม่จำเป็นต้องเจาะน้ำคร่ำ เพียงแต่เจาะเลือด 10 มิลลิลิตร จากหญิงที่ตั้งครรภ์ก็สามารถตรวจความผิดปกติทางพันธุกรรมของทารกได้ และสามารถตรวจได้ตั้งแต่อายุครรภ์ 11 สัปดาห์ขึ้นไป ให้ผลแม่นยำถึง 99% นับเป็นนวัตกรรมทางการแพทย์ที่น่าสนใจอีกหนึ่ง",
        choice_a: "แนะนำวิธีตรวจโครโมโซมของทารก", choice_b: "ชี้แจงรายละเอียดการตรวจเลือดในหญิงตั้งครรภ์", choice_c: "เปรียบเทียบนวัตกรรมทางการแพทย์ที่เกิดขึ้นใหม่", choice_d: "นำเสนอข้อมูลการตรวจความผิดปกติของทารกในครรภ์",
        correct_answer: "a",
        category: "ภาษาไทย", catalogs: ["ภาษาไทย", "การอ่านจับใจความ"]
    },

    // --- เงื่อนไขภาษา ---
    {
        question_text: "เงื่อนไขสำหรับข้อ 33 - 37\n- นักศึกษา 5 คน ได้แก่ ประสาน ประสิทธิ์ ประชิด ประชัน ประชา เป็นนักศึกษาปริญญาตรี 3 คน ปริญญาโท 2 คน\n- แต่ละคนชอบเล่นกีฬา 1 ชนิด มีคนชอบเล่นบาสเกตบอล 2 คน ว่ายน้ำ 2 คน แบดมินตัน 1 คน\n- แต่ละคนชอบดนตรี 1 ชนิด มีคนชอบดนตรีไทย 2 คน ดนตรีสากล 3 คน\n- นักศึกษาปริญญาโท ชอบบาสเกตบอล\n- คนที่ชอบบาสเกตบอล ชอบดนตรีไทย\n- ประสานและประชันศึกษาในระดับเดียวกัน แต่ชอบกีฬาต่างชนิดกัน\n- ประชาชอบเล่นดนตรีสากล\n\nข้อ 33)\nข้อสรุปที่ 1: ประสานและประสิทธิ์ศึกษาคนละระดับชั้น\nข้อสรุปที่ 2: ประชันชอบดนตรีสากลและประชิดชอบดนตรีไทย",
        choice_a: "ข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข", choice_b: "ข้อสรุปทั้งสองเป็นเท็จตามเงื่อนไข", choice_c: "ข้อสรุปทั้งสองไม่แน่ชัดหรือไม่สามารถสรุปได้", choice_d: "ข้อสรุปทั้งสองแตกต่างกัน",
        correct_answer: "a",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "เงื่อนไขภาษา"]
    },
    {
        question_text: "ข้อ 34)\nข้อสรุปที่ 1: ประสานชอบว่ายน้ำและชอบดนตรีสากล\nข้อสรุปที่ 2: ประชิดศึกษาระดับปริญญาโทและชอบบาสเกตบอล",
        choice_a: "ข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข", choice_b: "ข้อสรุปทั้งสองเป็นเท็จตามเงื่อนไข", choice_c: "ข้อสรุปทั้งสองไม่แน่ชัดหรือไม่สามารถสรุปได้", choice_d: "ข้อสรุปทั้งสองแตกต่างกัน",
        correct_answer: "d",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "เงื่อนไขภาษา"]
    },
    {
        question_text: "ข้อ 35)\nข้อสรุปที่ 1: ประชาและประชันชอบกีฬาชนิดเดียวกัน\nข้อสรุปที่ 2: มีคนเดียวที่ชอบเล่นแบดมินตันคือประสาน",
        choice_a: "ข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข", choice_b: "ข้อสรุปทั้งสองเป็นเท็จตามเงื่อนไข", choice_c: "ข้อสรุปทั้งสองไม่แน่ชัดหรือไม่สามารถสรุปได้", choice_d: "ข้อสรุปทั้งสองแตกต่างกัน",
        correct_answer: "c",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "เงื่อนไขภาษา"]
    },
    {
        question_text: "ข้อ 36)\nข้อสรุปที่ 1: ประสานและประชันชอบว่ายน้ำเหมือนกัน\nข้อสรุปที่ 2: ถ้าประสานชอบแบดมินตันประชันจะชอบว่ายน้ำ",
        choice_a: "ข้อสรุปทั้งสองเป็นจริงตามเงื่อนไข", choice_b: "ข้อสรุปทั้งสองเป็นเท็จตามเงื่อนไข", choice_c: "ข้อสรุปทั้งสองไม่แน่ชัดหรือไม่สามารถสรุปได้", choice_d: "ข้อสรุปทั้งสองแตกต่างกัน",
        correct_answer: "d",
        category: "ความสามารถในการวิเคราะห์", catalogs: ["ความสามารถในการวิเคราะห์", "เงื่อนไขภาษา"]
    },

    // --- ภาษาอังกฤษ (Vocabulary) ---
    {
        question_text: "What is the closest meaning of \"wrath\" ?",
        choice_a: "knot", choice_b: "anger", choice_c: "crime", choice_d: "smoke",
        correct_answer: "b",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Vocabulary"]
    },
    {
        question_text: "What is the closest meaning of \"pretty\" ?",
        choice_a: "plain", choice_b: "confusing", choice_c: "pleasant", choice_d: "repulsive",
        correct_answer: "c",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Vocabulary"]
    },
    {
        question_text: "What is the closest meaning of \"hub\" ?",
        choice_a: "counsel", choice_b: "elder", choice_c: "center", choice_d: "extension",
        correct_answer: "c",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Vocabulary"]
    },
    {
        question_text: "What is the closest meaning of \"accelerate\" ?",
        choice_a: "deny", choice_b: "delay", choice_c: "stimulate", choice_d: "decelerate",
        correct_answer: "c",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Vocabulary"]
    },
    {
        question_text: "What is the closest meaning of \"execute\" ?",
        choice_a: "perform", choice_b: "decide", choice_c: "wonder", choice_d: "dismiss",
        correct_answer: "a",
        category: "ภาษาอังกฤษ", catalogs: ["ภาษาอังกฤษ", "Vocabulary"]
    }
];

async function addExtraBatch() {
    try {
        const batch = db.batch();
        
        const snapshot = await db.collection('questions').orderBy('id', 'desc').limit(1).get();
        let startId = 1000;
        if (!snapshot.empty) {
            const maxId = parseInt(snapshot.docs[0].id) || parseInt(snapshot.docs[0].data().id);
            if (!isNaN(maxId)) {
                startId = maxId + 1;
            }
        }
        
        newQuestions.forEach((q, index) => {
            const docId = (startId + index).toString();
            const docRef = db.collection('questions').doc(docId);
            
            const fullQuestion = {
                id: docId,
                ...q,
                subject: 'กพ ภาค ก',
                skill: q.category, 
                exam_set: 'ข้อสอบจริง (Past Exam)',
                exam_year: '2566',
                explanation: 'ข้อสอบจริง กพ ภาค ก ปี 66',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                difficulty: 50,
                rating: 0,
                ratingCount: 0
            };
            
            batch.set(docRef, fullQuestion);
        });
        
        await batch.commit();
        console.log(`Successfully added ${newQuestions.length} extra questions starting from ID ${startId}`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

addExtraBatch();
