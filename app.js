var SUPABASE_URL = 'https://fkeyxtulzphwbhtizpcj.supabase.co';
var SUPABASE_KEY = 'sb_publishable_lzcafnJtTDB23vWC1QXEsw_xzC7xzoz';
var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

var ADMIN_PASSWORD = "admin123"; 

window.addEventListener('load', function() {
  // Views
  var surahView = document.getElementById('surahView');
  var ayatView = document.getElementById('ayatView');
  var backBtn = document.getElementById('backBtn');
  var monkey = document.getElementById('monkey');

  // Grids & States
  var surahGrid = document.getElementById('surahGrid');
  var emptyState = document.getElementById('emptyState');
  var ayatGrid = document.getElementById('ayatGrid');
  var ayatEmptyState = document.getElementById('ayatEmptyState');

  // Controls
  var createSurahBtn = document.getElementById('createSurahBtn');
  var adminBtn = document.getElementById('adminBtn');
  var themeSelect = document.getElementById('themeSelect');
  var uploadAyatBtn = document.getElementById('uploadAyatBtn');
  var downloadAllBtn = document.getElementById('downloadAllBtn');

  // Modals
  var surahModal = document.getElementById('surahModal');
  var surahName = document.getElementById('surahName');
  var surahNumber = document.getElementById('surahNumber');
  var saveSurah = document.getElementById('saveSurah');
  var cancelSurah = document.getElementById('cancelSurah');
  var ayatModal = document.getElementById('ayatModal');
  var ayatNumber = document.getElementById('ayatNumber');
  var ayatFileInput = document.getElementById('ayatFileInput');
  var selectFileBtn = document.getElementById('selectFileBtn');
  var selectedFileName = document.getElementById('selectedFileName');
  var saveAyat = document.getElementById('saveAyat');
  var cancelAyat = document.getElementById('cancelAyat');

  // Viewer
  var viewer = document.getElementById('viewer');
  var viewerTitle = document.getElementById('viewerTitle');
  var pdfContainer = document.getElementById('pdfContainer');
  var viewerBody = document.getElementById('viewerBody');
  var zoomInBtn = document.getElementById('zoomInBtn');
  var zoomOutBtn = document.getElementById('zoomOutBtn');
  var zoomLevel = document.getElementById('zoomLevel');
  var downloadBtn = document.getElementById('downloadBtn');
  var closeViewer = document.getElementById('closeViewer');
  var pageInput = document.getElementById('pageInput');
  var totalPagesDisplay = document.getElementById('totalPagesDisplay');
  var goToPageBtn = document.getElementById('goToPageBtn');

  var isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  var currentSurahId = null;
  var currentAyatFile = null;
  var currentScale = 1.2;
  var totalPages = 0;
  var observer = null;
  var isViewerLoading = false;

  // --- NAVIGATION ---
  function showSurahs() {
    ayatView.style.display = 'none';
    surahView.style.display = 'block';
    backBtn.style.display = 'none';
    loadSurahs();
  }

  function showAyats(surah) {
    currentSurahId = surah.id;
    surahView.style.display = 'none';
    ayatView.style.display = 'block';
    backBtn.style.display = 'inline-block';
    document.getElementById('folderTitle').textContent = 'Surah ' + surah.name; // Kept for ZIP naming
    loadAyats();
  }

  backBtn.onclick = showSurahs;

  // --- ADMIN & THEME ---
  function updateAdminUI() {
    createSurahBtn.style.display = isAdmin ? 'flex' : 'none';
    uploadAyatBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    adminBtn.textContent = isAdmin ? '🔓 Admin (Logout)' : ' Admin';
    loadSurahs(); 
  }

  adminBtn.onclick = function() {
    if(isAdmin) { isAdmin = false; sessionStorage.removeItem('isAdmin'); } 
    else {
      var pass = prompt("Enter Admin Password:");
      if(pass === ADMIN_PASSWORD) { isAdmin = true; sessionStorage.setItem('isAdmin', 'true'); } 
      else if(pass !== null) { alert("Wrong password!"); }
    }
    updateAdminUI();
  };
  themeSelect.onchange = function(e) { document.body.className = e.target.value; };

  // --- LOAD SURAHS ---
  async function loadSurahs() {
    var result = await db.from('surahs').select('*').order('number', { ascending: true });
    var data = result.data; var error = result.error;
    if (error) return console.error(error);
    
    surahGrid.innerHTML = '';
    emptyState.style.display = data.length ? 'none' : 'block';

    for (var i = 0; i < data.length; i++) {
      var surah = data[i];
      var card = document.createElement('div');
      card.className = 'folder-card';
      var deleteBtnHtml = isAdmin ? '<button class="delete-btn" data-id="' + surah.id + '">🗑</button>' : '';
      card.innerHTML = deleteBtnHtml + '<div class="folder-icon">📁</div><h3>' + surah.name + '</h3><p>Surah #' + (surah.number || '?') + '</p>';
      
      card.onclick = function(e) { if(e.target.classList.contains('delete-btn')) return; showAyats(surah); };
      if(isAdmin) {
        card.querySelector('.delete-btn').onclick = function(e) {
          e.stopPropagation(); var s = surah;
          if(confirm('Delete ' + s.name + '?')) {
            db.from('surahs').delete().eq('id', s.id).then(function() { db.from('ayats').delete().eq('surah_id', s.id).then(loadSurahs); });
          }
        };
      }
      surahGrid.appendChild(card);
    }
  }

  createSurahBtn.onclick = function() { surahModal.classList.add('active'); };
  cancelSurah.onclick = function() { surahModal.classList.remove('active'); };
  saveSurah.onclick = async function() {
    var name = surahName.value.trim(); var number = surahNumber.value.trim();
    if(!name) return alert('Please enter a Surah name');
    await db.from('surahs').insert({ name: name, number: number });
    surahModal.classList.remove('active'); surahName.value = ''; surahNumber.value = '';
    loadSurahs();
  };

  // --- LOAD AYATS ---
  async function loadAyats() {
    var result = await db.from('ayats').select('*').eq('surah_id', currentSurahId).order('ayat_number', { ascending: true });
    var data = result.data; var error = result.error;
    if (error) return console.error(error);

    ayatGrid.innerHTML = '';
    ayatEmptyState.style.display = (!data || data.length === 0) ? 'block' : 'none';

    for (var i = 0; i < data.length; i++) {
      var ayat = data[i];
      var card = document.createElement('div');
      card.className = 'ayat-card';
      card.innerHTML = '<div class="ayat-num">' + ayat.ayat_number + '</div><div class="ayat-label">' + ayat.name + '</div>';
      
      // THE MONKEY CLICK HANDLER
      card.onclick = function() { runMonkeyAndOpenPDF(ayat.file_url, ayat.name, card); };
      ayatGrid.appendChild(card);
    }
  }

  // --- THE RUNNING MONKEY & INSTANT PDF OPEN ---
  async function runMonkeyAndOpenPDF(url, title, cardElement) {
    if (isViewerLoading) return;
    isViewerLoading = true;

    // 1. Position Monkey at start (bottom left)
    monkey.style.display = 'block';
    monkey.style.transition = 'none';
    monkey.style.left = '5%';
    monkey.style.top = '90%';
    monkey.style.transform = 'scale(1) rotate(0deg)';
    void monkey.offsetWidth; // Force reflow

    // 2. Calculate target (center of clicked card)
    var rect = cardElement.getBoundingClientRect();
    var targetX = rect.left + (rect.width / 2) - 32; // 32 is half monkey size
    var targetY = rect.top + (rect.height / 2) - 32;

    // 3. Start PDF loading in background
    var pdfPromise = preparePDF(url, title);

    // 4. Start Monkey Animation (1.5 seconds fun run)
    var animDuration = 1500;
    monkey.style.transition = 'all ' + animDuration + 'ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    monkey.style.left = targetX + 'px';
    monkey.style.top = targetY + 'px';
    monkey.style.transform = 'scale(1.5) rotate(360deg)'; // Monkey spins and grows at destination

    var animPromise = new Promise(function(resolve) { setTimeout(resolve, animDuration); });

    // 5. Wait for BOTH the PDF to finish loading AND the monkey to arrive
    await Promise.all([pdfPromise, animPromise]);

    // 6. Hide monkey and show viewer IMMEDIATELY (no loading slides!)
    monkey.style.display = 'none';
    viewer.classList.add('active');
    isViewerLoading = false;
  }

  async function preparePDF(url, title) {
    var res = await fetch(url);
    var buffer = await res.arrayBuffer();
    var pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    
    totalPages = pdfDoc.numPages;
    viewerTitle.textContent = title;
    downloadBtn.href = url;
    pageInput.value = 1;
    pageInput.max = totalPages;
    totalPagesDisplay.textContent = totalPages;

    if (observer) { observer.disconnect(); observer = null; }

    // Render ALL pages into a hidden fragment first
    var fragment = document.createDocumentFragment();
    for (var i = 1; i <= totalPages; i++) {
      var page = await pdfDoc.getPage(i);
      var viewport = page.getViewport({ scale: currentScale });
      var canvas = document.createElement('canvas');
      canvas.id = 'page-canvas-' + i;
      canvas.width = viewport.width; canvas.height = viewport.height;
      var context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      fragment.appendChild(canvas);
    }

    // Inject all pages at once for instant display
    pdfContainer.innerHTML = '';
    pdfContainer.appendChild(fragment);
    applyZoom();

    // Setup page tracking observer
    var options = { root: viewerBody, threshold: 0.5 };
    observer = new IntersectionObserver(function(entries) {
      for (var j = 0; j < entries.length; j++) {
        var entry = entries[j];
        if (entry.isIntersecting) {
          var pageNum = parseInt(entry.target.id.replace('page-canvas-', ''));
          pageInput.value = pageNum;
        }
      }
    }, options);
    var canvases = pdfContainer.querySelectorAll('canvas');
    for (var k = 0; k < canvases.length; k++) { observer.observe(canvases[k]); }
  }

  // --- DOWNLOAD ALL ZIP ---
  downloadAllBtn.onclick = async function() {
    downloadAllBtn.textContent = 'Zipping...'; downloadAllBtn.disabled = true;
    try {
      var result = await db.from('ayats').select('name, file_url').eq('surah_id', currentSurahId).order('ayat_number', { ascending: true });
      var ayats = result.data;
      if (!ayats || ayats.length === 0) { alert('No Ayats to download.'); return; }
      var zip = new JSZip();
      var folderName = 'Surah_' + currentSurahId;
      var folder = zip.folder(folderName);
      for (var i = 0; i < ayats.length; i++) {
        var res = await fetch(ayats[i].file_url);
        folder.file(ayats[i].name + '.pdf', await res.blob());
      }
      saveAs(await zip.generateAsync({ type: 'blob' }), folderName + '_complete.zip');
    } catch (err) { alert('Failed: ' + err.message); }
    finally { downloadAllBtn.textContent = '⬇ Download All (ZIP)'; downloadAllBtn.disabled = false; }
  };

  // --- UPLOAD AYAT ---
  uploadAyatBtn.onclick = function() { ayatModal.classList.add('active'); };
  cancelAyat.onclick = function() { ayatModal.classList.remove('active'); currentAyatFile = null; selectedFileName.textContent = ''; };
  selectFileBtn.onclick = function() { ayatFileInput.click(); };
  ayatFileInput.onchange = function(e) { currentAyatFile = e.target.files[0]; if(currentAyatFile) selectedFileName.textContent = 'Selected: ' + currentAyatFile.name; };
  saveAyat.onclick = async function() {
    var num = parseInt(ayatNumber.value);
    if(!num || !currentAyatFile) return alert('Please enter Ayat number and select a PDF file');
    saveAyat.textContent = 'Uploading...'; saveAyat.disabled = true;
    try {
      var pdfName = currentAyatFile.name.replace(/\.pdf$/i, '');
      var fileName = 'surah_' + currentSurahId + '_ayat_' + num + '_' + Date.now() + '.pdf';
      var uploadResult = await db.storage.from('pdfs').upload(fileName, currentAyatFile);
      if(uploadResult.error) throw uploadResult.error;
      var urlResult = db.storage.from('pdfs').getPublicUrl(fileName);
      var dbResult = await db.from('ayats').insert({ surah_id: currentSurahId, ayat_number: num, name: pdfName, file_url: urlResult.data.publicUrl });
      if(dbResult.error) throw dbResult.error;
      ayatModal.classList.remove('active'); ayatNumber.value = ''; currentAyatFile = null; selectedFileName.textContent = '';
      loadAyats();
    } catch(err) { alert('Upload failed: ' + err.message); }
    finally { saveAyat.textContent = 'Upload'; saveAyat.disabled = false; }
  };

  // --- VIEWER CONTROLS ---
  function updateZoomDisplay() { zoomLevel.textContent = Math.round(currentScale * 100) + '%'; }
  function applyZoom() { pdfContainer.style.transform = 'scale(' + currentScale + ')'; }
  zoomInBtn.onclick = function() { currentScale += 0.2; updateZoomDisplay(); applyZoom(); };
  zoomOutBtn.onclick = function() { if(currentScale > 0.4) { currentScale -= 0.2; updateZoomDisplay(); applyZoom(); } };
  closeViewer.onclick = function() { viewer.classList.remove('active'); if(observer) { observer.disconnect(); observer = null; } };
  
  function goToPage() {
    var targetPage = parseInt(pageInput.value);
    if (isNaN(targetPage) || targetPage < 1) targetPage = 1;
    if (targetPage > totalPages) targetPage = totalPages;
    pageInput.value = targetPage;
    var targetCanvas = document.getElementById('page-canvas-' + targetPage);
    if (targetCanvas) { targetCanvas.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  goToPageBtn.onclick = goToPage;
  pageInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') goToPage(); });

  // Init
  updateAdminUI();
});
