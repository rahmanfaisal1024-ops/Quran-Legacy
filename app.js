// ============================================
// CONFIGURATION
// ============================================
var SUPABASE_URL = 'https://fkeyxtulzphwbhtizpcj.supabase.co';
var SUPABASE_KEY = 'sb_publishable_lzcafnJtTDB23vWC1QXEsw_xzC7xzoz';
var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const ADMIN_PASSWORD = "admin123"; 

window.addEventListener('load', function() {
  // Elements
  const surahGrid = document.getElementById('surahGrid');
  const emptyState = document.getElementById('emptyState');
  const createSurahBtn = document.getElementById('createSurahBtn');
  const adminBtn = document.getElementById('adminBtn');
  const themeSelect = document.getElementById('themeSelect');
  
  const surahModal = document.getElementById('surahModal');
  const surahName = document.getElementById('surahName');
  const surahNumber = document.getElementById('surahNumber');
  const saveSurah = document.getElementById('saveSurah');
  const cancelSurah = document.getElementById('cancelSurah');

  const folderModal = document.getElementById('folderModal');
  const folderTitle = document.getElementById('folderTitle');
  const closeFolder = document.getElementById('closeFolder');
  const uploadAyatBtn = document.getElementById('uploadAyatBtn');
  const ayatGrid = document.getElementById('ayatGrid');

  const ayatModal = document.getElementById('ayatModal');
  const ayatNumber = document.getElementById('ayatNumber');
  const ayatFileInput = document.getElementById('ayatFileInput');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const selectedFileName = document.getElementById('selectedFileName');
  const saveAyat = document.getElementById('saveAyat');
  const cancelAyat = document.getElementById('cancelAyat');

  const viewer = document.getElementById('viewer');
  const viewerTitle = document.getElementById('viewerTitle');
  const pdfContainer = document.getElementById('pdfContainer');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomLevel = document.getElementById('zoomLevel');
  const downloadBtn = document.getElementById('downloadBtn');
  const closeViewer = document.getElementById('closeViewer');

  let isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  let currentSurahId = null;
  let currentAyatFile = null;
  let currentScale = 1.2;

  // --- ADMIN & THEME ---
  function updateAdminUI() {
    createSurahBtn.style.display = isAdmin ? 'flex' : 'none';
    uploadAyatBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    adminBtn.textContent = isAdmin ? '🔓 Admin (Logout)' : '🔒 Admin';
    loadSurahs(); 
  }

  adminBtn.onclick = () => {
    if(isAdmin) {
      isAdmin = false;
      sessionStorage.removeItem('isAdmin');
    } else {
      let pass = prompt("Enter Admin Password:");
      if(pass === ADMIN_PASSWORD) {
        isAdmin = true;
        sessionStorage.setItem('isAdmin', 'true');
      } else if(pass !== null) {
        alert("Wrong password!");
      }
    }
    updateAdminUI();
  };

  themeSelect.onchange = (e) => { document.body.className = e.target.value; };

  // --- LOAD SURAHS ---
  async function loadSurahs() {
    const { data, error } = await db.from('surahs').select('*').order('number', { ascending: true });
    if (error) return console.error(error);
    
    surahGrid.innerHTML = '';
    emptyState.style.display = data.length ? 'none' : 'block';

    data.forEach(surah => {
      const card = document.createElement('div');
      card.className = 'folder-card';
      card.innerHTML = `
        ${isAdmin ? `<button class="delete-btn" data-id="${surah.id}">🗑</button>` : ''}
        <div class="folder-icon">📁</div>
        <h3>${surah.name}</h3>
        <p>Surah #${surah.number || '?'}</p>
      `;
      card.onclick = (e) => {
        if(e.target.classList.contains('delete-btn')) return;
        openFolder(surah);
      };
      if(isAdmin) {
        card.querySelector('.delete-btn').onclick = async (e) => {
          e.stopPropagation();
          if(confirm(`Delete ${surah.name} and all its Ayats?`)) {
            await db.from('surahs').delete().eq('id', surah.id);
            await db.from('ayats').delete().eq('surah_id', surah.id);
            loadSurahs();
          }
        };
      }
      surahGrid.appendChild(card);
    });
  }

  createSurahBtn.onclick = () => surahModal.classList.add('active');
  cancelSurah.onclick = () => surahModal.classList.remove('active');
  saveSurah.onclick = async () => {
    const name = surahName.value.trim();
    const number = surahNumber.value.trim();
    if(!name) return alert('Please enter a Surah name');
    await db.from('surahs').insert({ name, number });
    surahModal.classList.remove('active');
    surahName.value = ''; surahNumber.value = '';
    loadSurahs();
  };

  async function openFolder(surah) {
    currentSurahId = surah.id;
    folderTitle.textContent = `Surah ${surah.name}`;
    folderModal.classList.add('active');
    loadAyats();
  }
  closeFolder.onclick = () => folderModal.classList.remove('active');

  async function loadAyats() {
    const { data, error } = await db.from('ayats').select('*').eq('surah_id', currentSurahId).order('ayat_number', { ascending: true });
    if (error) return console.error(error);

    ayatGrid.innerHTML = '';
    if(!data.length) ayatGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.7;">No Ayats uploaded yet.</p>';

    data.forEach(ayat => {
      const card = document.createElement('div');
      card.className = 'ayat-card';
      card.innerHTML = `<div class="ayat-num">${ayat.ayat_number}</div><div class="ayat-label">${ayat.name}</div>`;
      card.onclick = () => openViewer(ayat.file_url, ayat.name);
      ayatGrid.appendChild(card);
    });
  }

  uploadAyatBtn.onclick = () => ayatModal.classList.add('active');
  cancelAyat.onclick = () => { ayatModal.classList.remove('active'); currentAyatFile = null; selectedFileName.textContent = ''; };
  
  selectFileBtn.onclick = () => ayatFileInput.click();
  ayatFileInput.onchange = (e) => {
    currentAyatFile = e.target.files[0];
    if(currentAyatFile) selectedFileName.textContent = `Selected: ${currentAyatFile.name}`;
  };

  saveAyat.onclick = async () => {
    const num = parseInt(ayatNumber.value);
    if(!num || !currentAyatFile) return alert('Please enter Ayat number and select a PDF file');
    
    saveAyat.textContent = 'Uploading...';
    saveAyat.disabled = true;

    try {
      const pdfName = currentAyatFile.name.replace(/\.pdf$/i, '');
      const fileName = `surah_${currentSurahId}_ayat_${num}_${Date.now()}.pdf`;
      
      const { error: uploadError } = await db.storage.from('pdfs').upload(fileName, currentAyatFile);
      if(uploadError) throw uploadError;

      const { data: urlData } = db.storage.from('pdfs').getPublicUrl(fileName);

      const { error: dbError } = await db.from('ayats').insert({
        surah_id: currentSurahId,
        ayat_number: num,
        name: pdfName, 
        file_url: urlData.publicUrl
      });
      if(dbError) throw dbError;

      ayatModal.classList.remove('active');
      ayatNumber.value = ''; currentAyatFile = null; selectedFileName.textContent = '';
      loadAyats();
    } catch(err) {
      alert('Upload failed: ' + err.message);
    } finally {
      saveAyat.textContent = 'Upload'; saveAyat.disabled = false;
    }
  };

  // --- EDGE-STYLE CONTINUOUS VIEWER ---
  async function openViewer(url, title) {
    viewer.classList.add('active');
    viewerTitle.textContent = title;
    downloadBtn.href = url; 
    pdfContainer.innerHTML = ''; 
    currentScale = 1.2;
    updateZoomDisplay();

    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

    // Render ALL pages continuously
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      pdfContainer.appendChild(canvas);
    }
    applyZoom();
  }

  function updateZoomDisplay() {
    zoomLevel.textContent = Math.round(currentScale * 100) + '%';
  }

  function applyZoom() {
    pdfContainer.style.transform = `scale(${currentScale})`;
  }

  zoomInBtn.onclick = () => { currentScale += 0.2; updateZoomDisplay(); applyZoom(); };
  zoomOutBtn.onclick = () => { if(currentScale > 0.4) { currentScale -= 0.2; updateZoomDisplay(); applyZoom(); } };
  closeViewer.onclick = () => viewer.classList.remove('active');

  updateAdminUI();
});
