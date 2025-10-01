โค้ดนี้คือ **EMK File Extractor บนเว็บเบราว์เซอร์** ที่ทำให้ผู้ใช้สามารถ:  
1. เลือก/ลากไฟล์ `.emk` มาวาง  
2. กด Unpack เพื่อแกะไฟล์  
3. ดูไฟล์ย่อยที่ถูกดึงออกมา (HEADER, MIDI, LYRIC, CURSOR ฯลฯ)  
4. ดาวน์โหลดทีละไฟล์ หรือทั้งหมดเป็น ZIP ได้ทันที
---
<p align="center">
  <img src="https://img.icons8.com/color/48/000000/html-5.png" width="28" alt="HTML"/> 
  <img src="https://img.icons8.com/color/48/000000/javascript--v1.png" width="28" alt="JavaScript"/> 
  <img src="https://img.icons8.com/color/48/000000/css3.png" width="28" alt="CSS"/> 
  <img src="https://img.icons8.com/fluency/48/000000/file.png" width="28" alt="file"/> 
  <img src="https://img.icons8.com/fluency/48/000000/microphone.png" width="28" alt="Extreme Karaoke"/> 
  <br/>
  <strong>HTML • JS • CSS • emk file • Extreme Karaoke</strong>
</p>

<p align="center">
  <a href="#1-การเก็บข้อมูล"><img src="https://img.shields.io/badge/📦 การเก็บข้อมูล-blue?style=for-the-badge"></a>
  <a href="#2-utility-functions-ฟังก์ชันอำนวยความสะดวก"><img src="https://img.shields.io/badge/🛠️ Utility Functions-green?style=for-the-badge"></a>
  <a href="#3-การแสดงผลไฟล์ที่เลือก"><img src="https://img.shields.io/badge/📄 ไฟล์ที่เลือก-orange?style=for-the-badge"></a>
  <a href="#4-การแกะไฟล์-emk-unpackfile"><img src="https://img.shields.io/badge/🗂️ การแกะไฟล์ EMK-red?style=for-the-badge"></a>
  <a href="#5-การสร้าง-ui-สำหรับไฟล์"><img src="https://img.shields.io/badge/💻 UI Files-lightgrey?style=for-the-badge"></a>
  <a href="#6-การบีบอัดกลับเป็น-zip"><img src="https://img.shields.io/badge/🗜️ ZIP-yellow?style=for-the-badge"></a>
  <a href="#7-การควบคุมเหตุการณ์-event-listeners"><img src="https://img.shields.io/badge/🎛️ Events-purple?style=for-the-badge"></a>
  <a href="#8-กระบวนการทำงานหลัก"><img src="https://img.shields.io/badge/⚡ Flow-pink?style=for-the-badge"></a>

---

# อธิบายการทำงานของโค้ด

โค้ดนี้เป็น **Web Application** สำหรับการแกะ (Unpack) ไฟล์ `.emk` ออกมาเป็นไฟล์ย่อย โดยทำงานดังนี้:

---

## 1. การเก็บข้อมูล
- `selectedFiles` : เก็บไฟล์ที่ผู้ใช้เลือก
- `extractedFiles` : เก็บไฟล์ที่ถูกแกะออกมาแล้ว

---

## 2. Utility Functions
- `hexToBytes(hex)` : แปลงข้อความ Hex ให้เป็น `Uint8Array`
- `formatFileSize(bytes)` : แปลงจำนวนไบต์ให้เป็นหน่วย B, KB, MB, GB
- `log(msg)` : แสดงข้อความ log ลงในหน้าจอ
- `updateStats()` : อัปเดตสถิติ เช่น จำนวนไฟล์, ขนาดรวม
- `updateProgress(current, total, text)` : แสดงความคืบหน้าเป็น Progress Bar

---

## 3. การแสดงผลไฟล์ที่เลือก
- `updateFileList()` : แสดงรายชื่อไฟล์ที่ผู้ใช้เลือก
- ถ้าไม่มีไฟล์ → ล้างรายการ
- ถ้ามีไฟล์ → แสดงชื่อ + ขนาด

---

## 4. การแกะไฟล์ EMK (`unpackFile`)
1. โหลดไฟล์เป็น `Uint8Array`  
2. ทำการ XOR Decode ด้วย Key: `AFF24C9CE9EA9943`  
3. ตรวจสอบ **Magic Number** (ต้องตรงกับ `.SFDS`)  
4. อ่าน Header โดยใช้ `DataView`:  
   - ตำแหน่ง Header (`headerPos`, `headerEnd`)  
   - ข้อมูลภายในใช้การอ่านแบบ Tag (`readTag()`)  
5. ตรวจสอบโครงสร้าง (เช่น `SFDS`)  
6. ข้อมูลถูกบีบอัดด้วย **zlib** → ใช้ `pako.inflate()` คลายบีบอัด  
7. สร้างไฟล์ใหม่จากข้อมูลที่ได้:  

| ไอคอน | ประเภทไฟล์   | นามสกุล | คำอธิบาย             |
|-------|--------------|---------|----------------------|
| 📝    | HEADER       | `.txt`  | ข้อมูลหัวไฟล์        |
| 🎵    | MIDI_DATA    | `.mid`  | โน้ตดนตรี MIDI       |
| 🎤    | LYRIC_DATA   | `.lyr`  | ข้อความ/เนื้อเพลง    |
| ⚡    | CURSOR_DATA  | `.cur`  | ข้อมูลเคอร์เซอร์     |
| 📄    | (อื่น ๆ)      | `.bin`  | ไฟล์ไบนารีทั่วไป     |

---

## 5. การสร้าง UI สำหรับไฟล์
- `createFileCard(fileEntry)` : แสดงผลไฟล์ที่แกะได้ พร้อมปุ่มดาวน์โหลด  
- มี Icon ตามประเภท เช่น 📝 🎵 🎤 ⚡  

---

## 6. การบีบอัดกลับเป็น ZIP
- `createZipFile()` : รวมไฟล์ทั้งหมดที่แกะได้ แล้วบีบอัดเป็น `.zip` ด้วย `JSZip`  

---

## 7. การควบคุมเหตุการณ์ (Event Listeners)
- เมื่อผู้ใช้เลือกไฟล์ (`fileInput`)  
- เมื่อกดปุ่ม "Unpack"  
- เมื่อกดปุ่ม "Download All"  
- เมื่อกดปุ่ม "Clear"  
- รองรับการลากวางไฟล์ (Drag & Drop)  

---

## 8. กระบวนการทำงานหลัก
- `unpackFiles()`  
  1. ล้าง log และไฟล์เก่า  
  2. แสดง Progress  
  3. วนลูปไฟล์ที่เลือก → เรียก `unpackFile()`  
  4. เก็บผลลัพธ์ไว้ใน `extractedFiles`  
  5. แสดงไฟล์ทั้งหมดที่ถูกแกะ  
  6. เปิดให้ดาวน์โหลดทีละไฟล์หรือทั้งหมดเป็น ZIP  

- `downloadAllAsZip()`  
  - สร้างไฟล์ ZIP แล้วให้ผู้ใช้กดดาวน์โหลด  

- `clearAll()`  
  - รีเซ็ตค่า ล้างไฟล์ ล้าง log และซ่อน UI
  
---

## เครดิต & ข้อมูลอ้างอิง

- **โค้ดต้นฉบับ (Node.js)**: [alula / Gist](https://gist.github.com/alula/2c1edc360772b3bcde4de85ca731ae71)  
- **บทความอธิบายฟอร์แมต EMK**: [Medium - Cappy Ishihara](https://medium.com/@cappy_ishihara/%E0%B8%A7%E0%B8%B4%E0%B8%98%E0%B8%B5%E0%B8%AD%E0%B9%88%E0%B8%B2%E0%B8%99%E0%B9%84%E0%B8%9F%E0%B8%A5%E0%B9%8C-emk-extreme-karaoke-%E0%B9%81%E0%B8%9A%E0%B8%9A%E0%B8%9A%E0%B9%89%E0%B8%B2%E0%B8%99%E0%B9%86-d684c5a0859d)  
- **เว็บไซต์สำหรับใช้งานเวอร์ชันเว็บ**: [EMK Unpack Online](https://voravit.serv00.net/emkunpack.html)  

> ⚠️ โค้ดถูก **ดัดแปลงจาก Node.js ให้ทำงานบน Browser (HTML/JS/CSS)**  
> โปรดให้เครดิตเจ้าของต้นฉบับเมื่อนำไปใช้งานหรือเผยแพร่ต่อ
