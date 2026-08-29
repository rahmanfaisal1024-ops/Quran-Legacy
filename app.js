var SUPABASE_URL = 'https://fkeyxtulzphwbhtizpcj.supabase.co';
var SUPABASE_KEY = 'sb_publishable_lzcafnJtTDB23vWC1QXEsw_xzC7xzoz';
var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

var ADMIN_PASSWORD = "admin123"; 

window.addEventListener('load', function() {
  var surahGrid = document.getElementById('surahGrid');
  var emptyState = document.getElementById('emptyState');
  var createSurahBtn = document.getElementById('createSurahBtn');
  var adminBtn = document.getElementById('adminBtn');
  var themeSelect = document.getElementById('themeSelect');
  
  var surahModal = document.getElementById('surahModal');
  var surahName = document.getElementById('surahName');
  var surahNumber = document.getElementById('surahNumber');
  var saveSurah = document.getElementById('saveSurah');
  var cancelSurah = document.getElementById('cancelSurah');

  var folderModal = document.getElementById('folderModal');
  var folderTitle = document.getElementById('folderTitle');
  var closeFolder = document.getElementById('closeFolder');
  var uploadAyatBtn = document.getElementById('uploadAyatBtn');
  var downloadAllBtn = document.getElementById('downloadAllBtn');
  var ayatGrid = document.getElementById('ayatGrid');

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

  function updateAdminUI() {
    createSurahBtn.style.display = isAdmin ? 'flex' : 'none';
    uploadAyatBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    adminBtn.textContent = isAdmin ? '🔓 Admin (Logout)' : ' Admin';
    loadSurahs(); 
  }

  adminBtn.onclick = function() {
    if(isAdmin) {
      isAdmin = false;
      sessionStorage.removeItem('isAdmin');
    } else {
      var pass = prompt("Enter Admin Password:");
      if(pass === ADMIN_PASSWORD) {
        isAdmin = true;
        sessionStorage.setItem('isAdmin', 'true');
      } else if(pass !== null) {
        alert("Wrong password!");
      }
    }
    updateAdminUI();
  };

  themeSelect.onchange = function(e) { document.body.className = e.target.value; };

  async function loadSurahs() {
    var result = await db.from('surahs').select('*').order('number', { ascending: true });
    var data = result.data;
    var error = result.error;
    if (error) return console.error(error);
    
    surahGrid.innerHTML = '';
    emptyState.style.display = data.length ? 'none' : 'block';

    for (var i = 0; i < data.length; i++) {
      var surah = data[i];
      var card = document.createElement('div');
      card.className = 'folder-card';
      
      var deleteBtnHtml = isAdmin ? '<button class="delete-btn" data-id="' + surah.id + '">🗑</button>' : '';
      card.innerHTML = deleteBtnHtml + 
        '<div class="folder-icon">📁</div>' +
        '<h3>' + surah.name + '</h3>' +
        '<p>Surah #' + (surah.number || '?') + '</p>';
        
      card.onclick = function(e) {
        if(e.target.classList.contains('delete-btn')) return;
        openFolder(surah);
      };
      
      if(isAdmin) {
        var btn = card.querySelector('.delete-btn');
        btn.onclick = function(e) {
          e.stopPropagation();
          var s = surah;
          if(confirm('Delete ' + s.name + ' and all its Ayats?')) {
            db.from('surahs').delete().eq('id', s.id).then(function() {
              db.from('ayats').delete().eq('surah_id', s.id).then(function() { loadSurahs(); });
            });
          }
        };
      }
      surahGrid.appendChild(card);
    }
  }

  createSurahBtn.onclick = function() { surahModal.classList.add('active'); };
  cancelSurah.onclick = function() { surahModal.classList.remove('active'); };
  
  saveSurah.onclick = async function() {
    var name = surahName.value.trim();
    var number = surahNumber.value.trim();
    if(!name) return alert('Please enter a Surah name');
    await db.from('surahs').insert({ name: name, number: number });
    surahModal.classList.remove('active');
    surahName.value = ''; surahNumber.value = '';
    loadSurahs();
  };

  async function openFolder(surah) {
    currentSurahId = surah.id;
    folderTitle.textContent = 'Surah ' + surah.name;
    folderModal.classList.add('active');
    loadAyats();
  }
  closeFolder.onclick = function() { folderModal.classList.remove('active'); };

  async function loadAyats() {
    var result = await db.from('ayats').select('*').eq('surah_id', currentSurahId).order('ayat_number', { ascending: true });
    var data = result.data;
    var error = result.error;
    if (error) return console.error(error);

    ayatGrid.innerHTML = '';
    if(!data || data.length === 0) {
      ayatGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.7;">No Ayats uploaded yet.</p>';
      return;
    }

    for (var i = 0; i < data.length; i++) {
      var ayat = data[i];
      var card = document.createElement('div');
      card.className = 'ayat-card';
      card.innerHTML = '<div class="ayat-num">' + ayat.ayat_number + '</div>' +
                       '<div class="ayat-label">' + ayat.name + '</div>';
      card.onclick = function() { openViewer(ayat.file_url, ayat.name); };
      ayatGrid.appendChild(card);
    }
  }

  // --- DOWNLOAD WHOLE SURAH AS ZIP ---
  downloadAllBtn.onclick = async function() {
    downloadAllBtn.textContent = 'Zipping...';
    downloadAllBtn.disabled = true;
    
    try {
      var result = await db.from('ayats').select('name, file_url').eq('surah_id', currentSurahId).order('ayat_number', { ascending: true });
      var ayats = result.data;
      
      if (!ayats || ayats.length === 0) { alert('No Ayats to download.'); return; }

      var zip = new JSZip();
      var folderName = folderTitle.textContent.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      var folder = zip.folder(folderName);

      for (var i = 0; i < ayats.length; i++) {
        var ayat = ayats[i];
        var res = await fetch(ayat.file_url);
        var blob = await res.blob();
        folder.file(ayat.name + '.pdf', blob);
      }

      var content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, folderName + '_complete.zip');
    } catch (err) {
      alert('Failed to download all: ' + err.message);
    } finally {
      downloadAllBtn.textContent = '⬇ Download All (ZIP)';
      downloadAllBtn.disabled = false;
    }
  };

  uploadAyatBtn.onclick = function() { ayatModal.classList.add('active'); };
  cancelAyat.onclick = function() { 
    ayatModal.classList.remove('active'); currentAyatFile = null; selectedFileName.textContent = ''; 
  };
  
  selectFileBtn.onclick = function() { ayatFileInput.click(); };
  ayatFileInput.onchange = function(e) {
    currentAyatFile = e.target.files[0];
    if(currentAyatFile) selectedFileName.textContent = 'Selected: ' + currentAyatFile.name;
  };

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
      var fileUrl = urlResult.data.publicUrl;

      var dbResult = await db.from('ayats').insert({ surah_id: currentSurahId, ayat_number: num, name: pdfName, file_url: fileUrl });
      if(dbResult.error) throw dbResult.error;

      ayatModal.classList.remove('active'); ayatNumber.value = ''; currentAyatFile = null; selectedFileName.textContent = '';
      loadAyats();
    } catch(err) { alert('Upload failed: ' + err.message); }
    finally { saveAyat.textContent = 'Upload'; saveAyat.disabled = false; }
  };

  // --- FIXED PDF VIEWER ---
  async function openViewer(url, title) {
    if (isViewerLoading) return; 
    isViewerLoading = true;
    
    viewer.classList.add('active');
    viewerTitle.textContent = title;
    downloadBtn.href = url; 
    
    // INSTANTLY clear to prevent double pages
    pdfContainer.innerHTML = ''; 
    currentScale = 1.2;
    updateZoomDisplay();

    try {
      var res = await fetch(url);
      var buffer = await res.arrayBuffer();
      var pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      
      if (!viewer.classList.contains('active')) { isViewerLoading = false; return; }

      totalPages = pdfDoc.numPages;
      totalPagesDisplay.textContent = totalPages;
      pageInput.value = 1; pageInput.max = totalPages;

      if (observer) { observer.disconnect(); observer = null; }

      for (var i = 1; i <= totalPages; i++) {
        var page = await pdfDoc.getPage(i);
        var viewport = page.getViewport({ scale: currentScale });
        var canvas = document.createElement('canvas');
        canvas.id = 'page-canvas-' + i;
        canvas.width = viewport.width; canvas.height = viewport.height;
        var context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        pdfContainer.appendChild(canvas);
      }
      applyZoom();

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

      var canvases = document.querySelectorAll('#pdfContainer canvas');
      for (var k = 0; k < canvases.length; k++) { observer.observe(canvases[k]); }
    } catch (err) { console.error("Error loading PDF:", err); }
    finally { isViewerLoading = false; }
  }

  function updateZoomDisplay() { zoomLevel.textContent = Math.round(currentScale * 100) + '%'; }
  function applyZoom() { pdfContainer.style.transform = 'scale(' + currentScale + ')'; }

  zoomInBtn.onclick = function() { currentScale += 0.2; updateZoomDisplay(); applyZoom(); };
  zoomOutBtn.onclick = function() { if(currentScale > 0.4) { currentScale -= 0.2; updateZoomDisplay(); applyZoom(); } };
  
  closeViewer.onclick = function() { 
    viewer.classList.remove('active'); 
    isViewerLoading = false; 
    if(observer) { observer.disconnect(); observer = null; }
    pdfContainer.innerHTML = ''; 
  };

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
