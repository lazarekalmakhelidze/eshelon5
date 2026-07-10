# QA Report: D1 migration smoke test

## Executive summary

การย้ายจาก Firebase/Firestore ไป D1 ในฝั่ง `worker` ผ่านการตรวจหลักแล้ว ทั้งด้านโค้ด, schema, และข้อมูลเก่า โดย `worker` ไม่เหลือการอ้าง `FirestoreClient` ใน `src` อีกต่อไป และข้อมูลหลักถูกย้ายเข้า D1 ครบตามชุดที่ใช้งานอยู่

การตรวจรอบสุดท้ายผ่าน `worker` typecheck, frontend build, และ browser smoke test บนหน้าแรก พบ issue ที่ต้องแก้จริง 1 จุดและแก้แล้วเรียบร้อย

## Identified issues

### High

- ไม่มี

### Medium

- `Next.js hydration mismatch` ที่ `<html>` จาก attribute ฝั่ง client เพิ่มเข้ามาหลัง SSR
  - อาการ: เปิดหน้าแรกแล้ว console แจ้ง hydration mismatch
  - ผลกระทบ: noisy console และมีความเสี่ยงทำให้ hydration warning บัง issue อื่น
  - สถานะ: แก้แล้ว

### Low

- `src/middleware.js` ใช้ชื่อไฟล์ตาม convention เก่าของ Next
  - อาการ: build เตือนว่า `middleware` ควรเปลี่ยนเป็น `proxy`
  - ผลกระทบ: ยังไม่พังตอนนี้ แต่เป็น deprecation warning
  - สถานะ: ยังไม่ได้แก้ในรอบนี้

- Browser console มี error เชิงเครื่องมือของ preview environment (`preload-browserView.js` หาไม่เจอ)
  - ผลกระทบ: ไม่ได้มาจากซอร์สแอปและไม่กระทบ flow หน้าเว็บ
  - สถานะ: ไม่ต้องแก้ในรีโป

- Browser console พบ error `[getThemeColors] Cannot destructure property 'exportedColors' of undefined`
  - ผลกระทบ: หน้าแรกยัง render ได้ตามปกติจาก smoke test แต่ควรไล่หาต้นทางเพิ่มเติมถ้าจะเก็บ console ให้สะอาด
  - สถานะ: ยังไม่พบต้นทางในซอร์สโดยตรงในรอบนี้

## Fixes applied

### Hydration mismatch

- ไฟล์: `src/app/layout.js`
- การแก้: เพิ่ม `suppressHydrationWarning` ที่ `<html>`
- เหตุผล: ตัด hydration warning ที่เกิดจาก attribute ฝั่ง client ไม่ตรงกับ SSR ระดับ root document

## Data and backend verification

- ย้าย `exam_rooms`, `exam_room_participants`, `exam_results` จาก Firestore ไป D1 แล้ว
- ย้าย `users` จาก Firestore ไป D1 แล้ว
- ย้าย collection ที่เหลือเข้าสู่ D1 แล้ว เช่น `questions`, `bookmarks`, `comments`, `friends`, `messages`, `threads`, `tickets`, `ticket_messages`, `payment_plans`, `transactions`, `assets`, `payments`, `notifications`, `contact_messages`, `businesses`, `business_posts`, `news_sources`, `system_config`
- `worker/src/firestore.ts` ถูกลบ เพราะไม่ถูกใช้อีกแล้ว

## Verification steps

- `npm run typecheck` ใน `worker` ผ่าน
- `npm run build` ที่รากโปรเจกต์ผ่าน
- เปิดหน้าแรกผ่าน browser preview ได้
- ตรวจแล้วว่าใน `worker/src` ไม่เหลือ `FirestoreClient`, `parseServiceAccount`, หรือ `firestore.` อีก

## Accessibility status

- จาก smoke test หน้าแรกยังแสดงผลและกด element หลักได้
- ยังไม่ได้พบปัญหา contrast หรือ focus state ใหม่ที่เกิดจากงานย้ายฐานข้อมูลรอบนี้
- ถ้าต้องการ QA เชิง UI ลึกกว่านี้ ควรไล่หน้า `profile`, `community`, `support`, `business`, `admin` แบบหน้า-ต่อ-หน้าอีกรอบ

## Suggested next follow-up

- เปลี่ยน `src/middleware.js` เป็น convention ใหม่ของ Next ถ้าต้องการเก็บ warning ให้หมด
- ไล่ต้นทาง `[getThemeColors]` เพิ่ม ถ้าต้องการให้ console ฝั่งหน้าเว็บสะอาด 100%
- รัน regression smoke test เพิ่มบนหน้า:
  - `/profile/bookmarks`
  - `/profile/messages`
  - `/community`
  - `/admin/users`
  - `/admin/support`
