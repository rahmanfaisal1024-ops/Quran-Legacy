var SUPABASE_URL = 'https://fkeyxtulzphwbhtizpcj.supabase.co';
var SUPABASE_KEY = 'sb_publishable_lzcafnJtTDB23vWC1QXEsw_xzC7xzoz';
var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

var ADMIN_PASSWORD = "admin123"; 

// CHANGED: Use DOMContentLoaded instead of 'load' for instant UI rendering
document.addEventListener('DOMContentLoaded', function() {
  var mainLoader = document.getElementById('mainLoader');
  var monkey = document.getElementById('monkey');
  
  // Load monkey image in background AFTER UI is visible
  monkey.src = "https://media.tenor.com/On7kvXhzml4AAAAj/running-monkey.gif";

  var surahView = document.getElementById('surahView');
  var ayatView = document.getElementById('ayatView');
  var backBtn = document.getElementById('backBtn');

  var surahGrid = document.getElementById('surahGrid');
  var emptyState = document.getElementById('emptyState');
  var ayatGrid = document.getElementById('ayatGrid');
  var ayatEmptyState = document.getElementById('ayatEmptyState');

  var createSurahBtn = document.getElementById('createSurahBtn');
  var adminBtn = document.getElementById('adminBtn');
  var themeSelect = document.getElementById('themeSelect');
  var uploadAyatBtn = document.getElementById('uploadAyatBtn');
  var downloadAllBtn = document.getElementById('downloadAllBtn');

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
    document.getElementById('folderTitle').textContent = 'Surah ' + surah.name;
    ayatGrid.innerHTML = '<div class="loader"></div>';
    ayatEmptyState.style.display = 'none';
    loadAyats();
  }

  backBtn.onclick = showSurahs;

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

  async function loadSurahs() {
    var result = await db.from('surahs').select('*').order('number', { ascending: true });
    var data = result.data; var error = result.error;
    
    // Hide main loader once data is fetched
    if(mainLoader) mainLoader.classList.add('hidden');

    if (error) { console.error(error); return; }
    
    surahGrid.innerHTML = '';
    emptyState.style.display = data.length ? 'none' : 'block';

    for (var i = 0; i < data.length; i++) {
      var surah = data[i];
      var card = document.createElement('div');
      card.className = 'folder-card';
      var deleteBtnHtml = isAdmin ? '<button class="delete-btn" data-id="' + surah.id + '"></button>' : '';
      card.innerHTML = deleteBtnHtml + '<div class="folder-icon"></div><h3>' + surah.name + '</h3><p>Surah #' + (surah.number || '?') + '</p>';
      
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
      card.onclick = function() { runMonkeyAndOpenPDF(ayat.file_url, ayat.name, card); };
      ayatGrid.appendChild(card);
    }
  }

  async function runMonkeyAndOpenPDF(url, title, cardElement) {
    if (isViewerLoading) return;
    isViewerLoading = true;

    var rect = cardElement.getBoundingClientRect();
    var targetX = rect.left + (rect.width / 2) - 35;
    var targetY = rect.top + (rect.height / 2) - 35;

    var pdfPromise = preparePDF(url, title);

    monkey.style.transition = 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    monkey.style.left = targetX + 'px';
    monkey.style.top = targetY + 'px';
    monkey.style.bottom = 'auto';
    monkey.style.right = 'auto';
    monkey.style.animation = 'none'; 

    var animPromise = new Promise(function(resolve) { setTimeout(resolve, 1200); });
    await Promise.all([pdfPromise, animPromise]);

    monkey.style.transition = 'all 0.8s ease-in-out';
    monkey.style.left = 'auto';
    monkey.style.top = 'auto';
    monkey.style.bottom = '20px';
    monkey.style.right = '20px';
    monkey.style.animation = 'idleBreathe 2s infinite ease-in-out'; 

    isViewerLoading = false;
  }

  async function preparePDF(url, title) {
    viewer.classList.add('active');
    viewerTitle.textContent = title;
    downloadBtn.href = url;
    pdfContainer.innerHTML = '<div class="loader" style="margin-top: 100px;"></div>';
    currentScale = 1.2;
    updateZoomDisplay();

    var res = await fetch(url);
    var buffer = await res.arrayBuffer();
    var pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    
    totalPages = pdfDoc.numPages;
    pageInput.value = 1;
    pageInput.max = totalPages;
    totalPagesDisplay.textContent = totalPages;

    pdfContainer.innerHTML = '';

    var canvasesData = [];
    for (var i = 1; i <= totalPages; i++) {
      var page = await pdfDoc.getPage(i);
      var viewport = page.getViewport({ scale: currentScale });
      var canvas = document.createElement('canvas');
      canvas.id = 'page-canvas-' + i;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.background = '#fff';
      canvas.dataset.pageNum = i;
      pdfContainer.appendChild(canvas);
      canvasesData.push({ canvas: canvas, page: page, viewport: viewport });
    }

    applyZoom();

    if (observer) observer.disconnect();

    observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var canvas = entry.target;
          var pageNum = parseInt(canvas.dataset.pageNum);
          var pData = canvasesData.find(function(c) { return c.canvas === canvas; });
          
          if (pData && !canvas.dataset.rendered) {
            var context = canvas.getContext('2d');
            pData.page.render({ canvasContext: context, viewport: pData.viewport }).promise.then(function() {
              canvas.dataset.rendered = 'true';
            });
            observer.unobserve(canvas);
          }
          pageInput.value = pageNum;
        }
      });
    }, { root: viewerBody, rootMargin: '300px', threshold: 0.1 });

    for (var k = 0; k < canvasesData.length; k++) {
      observer.observe(canvasesData[k].canvas);
    }
  }

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
    finally { downloadAllBtn.textContent = ' Download All (ZIP)'; downloadAllBtn.disabled = false; }
  };

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

  updateAdminUI();
});
