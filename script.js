// Global variables
let selectedFiles = [];
let extractedFiles = [];

// Utility functions
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i/2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function log(msg) {
  const logElement = document.getElementById("log");
  logElement.textContent += msg + "\n";
  logElement.scrollTop = logElement.scrollHeight;
}

function clearLog() {
  document.getElementById("log").textContent = "";
}

function updateStats() {
  document.getElementById('filesCount').textContent = selectedFiles.length;
  document.getElementById('extractedCount').textContent = extractedFiles.length;
  
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  document.getElementById('totalSize').textContent = formatFileSize(totalSize);
  
  const statsElement = document.getElementById('stats');
  if (selectedFiles.length > 0) {
    statsElement.style.display = 'block';
  } else {
    statsElement.style.display = 'none';
  }
}

function updateProgress(current, total, text) {
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  const percentage = total > 0 ? (current / total) * 100 : 0;
  progressFill.style.width = percentage + '%';
  progressText.textContent = text || `${current}/${total} ไฟล์`;
}

function showSection(sectionId) {
  document.getElementById(sectionId).classList.add('show');
}

function hideSection(sectionId) {
  document.getElementById(sectionId).classList.remove('show');
}

// File handling
function updateFileList() {
  const fileList = document.getElementById('fileList');
  const dropZone = document.getElementById('dropZone');
  
  if (selectedFiles.length === 0) {
    fileList.innerHTML = '';
    dropZone.classList.remove('has-files');
    return;
  }
  
  dropZone.classList.add('has-files');
  fileList.innerHTML = selectedFiles.map(file => `
    <div class="file-item">
      <span>📄</span>
      <span>${file.name}</span>
      <small>(${formatFileSize(file.size)})</small>
    </div>
  `).join('');
}

// EMK unpacking logic
async function unpackFile(file, index, total) {
  log("📂 Processing: " + file.name);
  updateProgress(index, total, `กำลังประมวลผล: ${file.name}`);

  const arrayBuffer = await file.arrayBuffer();
  let data = new Uint8Array(arrayBuffer);

  // XOR decode
  const xorKey = hexToBytes("AFF24C9CE9EA9943");
  for (let i = 0; i < data.length; i++) {
    data[i] ^= xorKey[i % xorKey.length];
  }

  // Check magic
  const magic = hexToBytes("2e53464453");
  if (!data.slice(0, magic.length).every((b, i) => b === magic[i])) {
    log("❌ Invalid magic in " + file.name);
    return [];
  }
  log("✅ Magic OK: " + file.name);

  // Read header offsets
  const view = new DataView(data.buffer);
  const headerPos = Number(view.getBigUint64(0x22, true));
  const headerEnd = Number(view.getBigUint64(0x2a, true));
  const header = data.slice(headerPos, headerEnd);

  let off = 0;
  const readByte = () => header[off++];
  const readUShort = () => { let v = new DataView(header.buffer).getUint16(header.byteOffset + off, true); off+=2; return v; };
  const readUInt = () => { let v = new DataView(header.buffer).getUint32(header.byteOffset + off, true); off+=4; return v; };
  const readString = () => { let len = readByte(); let s = new TextDecoder().decode(header.slice(off, off+len)); off+=len; return s; };

  const checkMagic = (magic) => {
    const part = header.slice(off, off + magic.length);
    if (!part.every((b,i)=>b===magic[i])) {
      throw new Error("Invalid magic in header");
    }
    off += magic.length;
  };

  const readTag = () => {
    const tag = readByte();
    if (tag === 2) return readByte();
    if (tag === 3) return readUShort();
    if (tag === 4) return readUInt();
    if (tag === 6) return readString();
    throw new Error("Unknown tag: 0x" + tag.toString(16));
  };

  const sfdsMagic = hexToBytes("53464453"); // SFDS
  const fileEntries = [];

  while (off < header.length) {
    log("---------------------------");
    checkMagic(sfdsMagic);

    const tag = readTag();
    const uncompressedSize = readTag();
    const unk2 = readTag();
    const dataBegin = readTag();
    const dataEnd = readTag();
    const unk5 = readTag();
    const unk6 = readTag();
    off += 0x10;
    const unk7 = readTag();
    const unk8 = readTag();

    const compressedData = data.slice(dataBegin, dataEnd);
    const rawData = pako.inflate(compressedData);

    if (rawData.length !== uncompressedSize) {
      throw new Error("Invalid uncompressed size");
    }

    if (tag === "HEADER") {
      log("--- HEADER ---\n" + new TextDecoder().decode(rawData) + "\n--- END HEADER ---");
    }

    const ext = {
      "HEADER": "txt",
      "MIDI_DATA": "mid",
      "LYRIC_DATA": "lyr",
      "CURSOR_DATA": "cur",
    };
    const filename = file.name + "_" + tag + "." + (ext[tag] || "bin");
    
    const fileEntry = {
      name: filename,
      data: rawData,
      size: rawData.length,
      type: tag,
      originalFile: file.name
    };
    
    fileEntries.push(fileEntry);
    log("✅ Extracted: " + filename + " (" + formatFileSize(rawData.length) + ")");
  }
  
  return fileEntries;
}

function createFileCard(fileEntry) {
  const typeIcons = {
    "HEADER": "📝",
    "MIDI_DATA": "🎵",
    "LYRIC_DATA": "🎤",
    "CURSOR_DATA": "⚡"
  };
  
  const icon = typeIcons[fileEntry.type] || "📄";
  
  const card = document.createElement('div');
  card.className = 'file-card';
  card.innerHTML = `
    <div class="file-name">${icon} ${fileEntry.name}</div>
    <div class="file-info">
      <div>ขนาด: ${formatFileSize(fileEntry.size)}</div>
      <div>ประเภท: ${fileEntry.type}</div>
      <div>จากไฟล์: ${fileEntry.originalFile}</div>
    </div>
    <div class="file-actions">
      <button class="btn btn-primary btn-sm download-btn">
        <span>💾</span> ดาวน์โหลด
      </button>
    </div>
  `;
  
  const downloadBtn = card.querySelector('.download-btn');
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([fileEntry.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileEntry.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  
  return card;
}

async function createZipFile() {
  const zip = new JSZip();
  
  extractedFiles.forEach(fileEntry => {
    zip.file(fileEntry.name, fileEntry.data);
  });
  
  const blob = await zip.generateAsync({type: "blob"});
  return blob;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize event listeners
  document.getElementById('fileInput').addEventListener('change', handleFileSelect);
  document.getElementById('unpackBtn').addEventListener('click', unpackFiles);
  document.getElementById('downloadAllBtn').addEventListener('click', downloadAllAsZip);
  document.getElementById('clearBtn').addEventListener('click', clearAll);
  
  // Initialize drag and drop
  initDragAndDrop();
});

function handleFileSelect(e) {
  selectedFiles = Array.from(e.target.files);
  updateFileList();
  updateStats();
  document.getElementById('unpackBtn').disabled = selectedFiles.length === 0;
}

function initDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
  });
  
  dropZone.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = Array.from(dt.files);
  
  selectedFiles = files;
  updateFileList();
  updateStats();
  document.getElementById('unpackBtn').disabled = selectedFiles.length === 0;
}

async function unpackFiles() {
  clearLog();
  extractedFiles = [];
  document.getElementById('filesGrid').innerHTML = '';
  
  showSection('progressSection');
  showSection('logSection');
  
  const unpackBtn = document.getElementById('unpackBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  
  unpackBtn.disabled = true;
  downloadAllBtn.disabled = true;
  
  try {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      updateProgress(i, selectedFiles.length, `กำลังประมวลผล: ${file.name}`);
      
      try {
        const fileEntries = await unpackFile(file, i, selectedFiles.length);
        extractedFiles = extractedFiles.concat(fileEntries);
      } catch (err) {
        log("❌ Error in " + file.name + ": " + err.message);
      }
    }
    
    updateProgress(selectedFiles.length, selectedFiles.length, "เสร็จสิ้น!");
    
    // Display extracted files
    if (extractedFiles.length > 0) {
      showSection('filesSection');
      const filesGrid = document.getElementById('filesGrid');
      extractedFiles.forEach(fileEntry => {
        filesGrid.appendChild(createFileCard(fileEntry));
      });
      downloadAllBtn.disabled = false;
    }
    
    log("🎉 การแกะไฟล์เสร็จสมบูรณ์! แกะได้ทั้งหมด " + extractedFiles.length + " ไฟล์");
    
  } finally {
    unpackBtn.disabled = false;
    updateStats();
  }
}

async function downloadAllAsZip() {
  if (extractedFiles.length === 0) return;
  
  const downloadBtn = document.getElementById('downloadAllBtn');
  const originalText = downloadBtn.innerHTML;
  downloadBtn.innerHTML = '<span>⏳</span> กำลังสร้าง ZIP...';
  downloadBtn.disabled = true;
  
  try {
    const zipBlob = await createZipFile();
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emk_extracted_files.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    log("💾 ดาวน์โหลดไฟล์ ZIP เสร็จสิ้น!");
  } catch (err) {
    log("❌ เกิดข้อผิดพลาดในการสร้างไฟล์ ZIP: " + err.message);
  } finally {
    downloadBtn.innerHTML = originalText;
    downloadBtn.disabled = false;
  }
}

function clearAll() {
  selectedFiles = [];
  extractedFiles = [];
  updateFileList();
  updateStats();
  clearLog();
  
  document.getElementById('filesGrid').innerHTML = '';
  document.getElementById('unpackBtn').disabled = true;
  document.getElementById('downloadAllBtn').disabled = true;
  
  hideSection('progressSection');
  hideSection('logSection');
  hideSection('filesSection');
}