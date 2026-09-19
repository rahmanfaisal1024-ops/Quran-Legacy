var SUPABASE_URL = 'https://fkeyxtulzphwbhtizpcj.supabase.co';
var SUPABASE_KEY = 'sb_publishable_lzcafnJtTDB23vWC1QXEsw_xzC7xzoz';
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

var ADMIN_PASSWORD = "admin123"; 

document.addEventListener('DOMContentLoaded', function() {
  // UI Elements
  var surahView = document.getElementById('surahView');
  var ayatView = document.getElementById('ayatView');
  var backBtn = document.getElementById('backBtn');
  var mainLoader = document.getElementById('mainLoader');
  var surahGrid = document.getElementById('surahGrid');
  var emptyState = document.getElementById('emptyState');
  var ayatGrid = document.getElementById('ayatGrid');
  var ayatEmptyState = document.getElementById('ayatEmptyState');
  
  // Auth Elements
  var authBtn = document.getElementById('authBtn');
  var authModal = document.getElementById('authModal');
  var closeAuth = document.getElementById('closeAuth');
  var tabLogin = document.getElementById('tabLogin');
  var tabSignup = document.getElementById('tabSignup');
  var authTitle = document.getElementById('authTitle');
  var authEmail = document.getElementById('authEmail');
  var authPassword = document.getElementById('authPassword');
  var submitAuth = document.getElementById('submitAuth');
  var googleAuthBtn = document.getElementById('googleAuthBtn');
  var authMessage = document.getElementById('authMessage');
  var userEmailDisplay = document.getElementById('userEmailDisplay');
  var adminBtn = document.getElementById('adminBtn');
  
  // Comment Elements
  var commentsModal = document.getElementById('commentsModal');
  var closeComments = document.getElementById('closeComments');
  var commentsTitle = document.getElementById('commentsTitle');
  var commentsList = document.getElementById('commentsList');
  var commentInput = document.getElementById('commentInput');
  var postCommentBtn = document.getElementById('postCommentBtn');
  var currentCommentAyatId = null;

  // Other Elements
  var createSurahBtn = document.getElementById('createSurahBtn');
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
  var currentUser = null;
  var currentSurahId = null;
  var currentAyatFile = null;
  var currentScale = 1.2;
  var totalPages = 0;
  var observer = null;
  var isViewerLoading = false;
  var isLoginMode = true;

  // --- AUTHENTICATION LOGIC ---
  supabase.auth.getSession().then(({ data: { session } }) => {
    currentUser = session?.user || null;
    updateAuthUI();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
  });

  function updateAuthUI() {
    if (currentUser) {
      authBtn.textContent = 'Logout';
      userEmailDisplay.style.display = 'inline';
      userEmailDisplay.textContent = currentUser.email;
      adminBtn.style.display = 'inline-block'; // Show admin button for logged in users (or keep your logic)
    } else {
      authBtn.textContent = 'Login / Sign Up';
      userEmailDisplay.style.display = 'none';
      adminBtn.style.display = 'none';
    }
    loadSurahs();
  }

  authBtn.onclick = function() {
    if (currentUser) {
      supabase.auth.signOut();
    } else {
      authModal.classList.add('active');
      authMessage.textContent = '';
    }
  };
  closeAuth.onclick = function() { authModal.classList.remove('active'); };

  tabLogin.onclick = function() {
    isLoginMode = true;
    authTitle.textContent = 'Login';
    submitAuth.textContent = 'Login';
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    authMessage.textContent = '';
  };
  tabSignup.onclick = function() {
    isLoginMode = false;
    authTitle.textContent = 'Sign Up';
    submitAuth.textContent = 'Sign Up';
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    authMessage.textContent = '';
  };

  submitAuth.onclick = async function() {
    var email = authEmail.value.trim();
    var password = authPassword.value;
    if (!email || !password) return authMessage.textContent = 'Please fill all fields';
    
    submitAuth.disabled = true;
    var res;
    if (isLoginMode) {
      res = await supabase.auth.signInWithPassword({ email, password });
    } else {
      res = await supabase.auth.signUp({ email, password });
      if (!res.error) authMessage.style.color = 'green';
    }
    
    if (res.error) {
      authMessage.style.color = 'red';
      authMessage.textContent = res.error.message;
    } else if (!isLoginMode) {
      authMessage.style.color = 'green';
      authMessage.textContent = 'Check your email to confirm signup!';
    }
    submitAuth.disabled = false;
  };

  googleAuthBtn.onclick = async function() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  // --- COMMENTS LOGIC ---
  function openCommentsModal(ayatId, ayatName) {
    if (!currentUser) {
      alert('Please login to view and post comments!');
      authModal.classList.add('active');
      return;
    }
    currentCommentAyatId = ayatId;
    commentsTitle.textContent = 'Comments for ' + ayatName;
    commentsModal.classList.add('active');
    loadComments(ayatId);
  }
  closeComments.onclick = function() { commentsModal.classList.remove('active'); };

  async function loadComments(ayatId) {
    commentsList.innerHTML = '<div class="loader" style="width:30px; height:30px;"></div>';
    var res = await supabase.from('comments').select('*').eq('ayat_id', ayatId).order('created_at', { ascending: false });
    commentsList.innerHTML = '';
    if (res.error || !res.data || res.data.length === 0) {
      commentsList.innerHTML = '<p style="text-align:center; opacity:0.7;">No comments yet. Be the first!</p>';
      return;
    }
    res.data.forEach(c => {
      var div = document.createElement('div');
      div.className = 'comment-item';
      var deleteBtn = c.user_id === currentUser.id ? '<button onclick="deleteComment(\''+c.id+'\')" style="float:right; background:none; border:none; color:red; cursor:pointer;">🗑</button>' : '';
      div.innerHTML = deleteBtn + '<div class="comment-email">' + (c.user_email || 'Anonymous') + '</div><div class="comment-text">' + c.content + '</div><div class="comment-date">' + new Date(c.created_at).toLocaleDateString() + '</div>';
      commentsList.appendChild(div);
    });
  }

  window.deleteComment = async function(id) {
    if(confirm('Delete this comment?')) {
      await supabase.from('comments').delete().eq('id', id);
      loadComments(currentCommentAyatId);
    }
  };

  postCommentBtn.onclick = async function() {
    var content = commentInput.value.trim();
    if (!content) return alert('Please write a comment');
    postCommentBtn.disabled = true;
    var res = await supabase.from('comments').insert({
      ayat_id: currentCommentAyatId,
      user_id: currentUser.id,
      user_email: currentUser.email,
      content: content
    });
    if (res.error) alert('Error: ' + res.error.message);
    else {
      commentInput.value = '';
      loadComments(currentCommentAyatId);
    }
    postCommentBtn.disabled = false;
  };

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
    ayatGrid.innerHTML = '<div class="loader"></div>';
    ayatEmptyState.style.display = 'none';
    loadAyats();
  }
  backBtn.onclick = showSurahs;

  adminBtn.onclick = function() {
    if(isAdmin) { isAdmin = false; sessionStorage.removeItem('isAdmin'); } 
    else {
      var pass = prompt("Enter Admin Password:");
      if(pass === ADMIN_PASSWORD) { isAdmin = true; sessionStorage.setItem('isAdmin', 'true'); } 
      else if(pass !== null) { alert("Wrong password!"); }
    }
    loadSurahs();
  };
  themeSelect.onchange = function(e) { document.body.className = e.target.value; };

  // --- LOAD SURAHS ---
  async function loadSurahs() {
    var result = await supabase.from('surahs').select('*').order('number', { ascending: true });
    var data = result.data; var error = result.error;
    
    if(mainLoader) mainLoader.style.display = 'none';

    if (error) { 
      console.error(error); 
      surahGrid.innerHTML = '<p style="color:red;">Error loading Surahs. Check console.</p>';
      return; 
    }
    
    surahGrid.innerHTML = '';
    emptyState.style.display = data.length ? 'none' : 'block';

    for (var i = 0; i < data.length; i++) {
      var surah = data[i];
      var card = document.createElement('div');
      card.className = 'folder-card';
      var deleteBtnHtml = isAdmin ? '<button class="delete-btn" data-id="' + surah.id + '"></button>' : '';
      card.innerHTML = deleteBtnHtml + '<div class="folder-icon">📁</div><h3>' + surah.name + '</h3><p>Surah #' + (surah.number || '?') + '</p>';
      
      card.onclick = function(e) { if(e.target.classList.contains('delete-btn')) return; showAyats(surah); };
      if(isAdmin) {
        card.querySelector('.delete-btn').onclick = function(e) {
          e.stopPropagation(); var s = surah;
          if(confirm('Delete ' + s.name + '?')) {
            supabase.from('surahs').delete().eq('id', s.id).then(function() { supabase.from('ayats').delete().eq('surah_id', s.id).then(loadSurahs); });
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
    await supabase.from('surahs').insert({ name: name, number: number });
    surahModal.classList.remove('active'); surahName.value = ''; surahNumber.value = '';
    loadSurahs();
  };

  // --- LOAD AYATS ---
  async function loadAyats() {
    var result = await supabase.from('ayats').select('*').eq('surah_id', currentSurahId).order('ayat_number', { ascending: true });
    var data = result.data; var error = result.error;
    if (error) return console.error(error);

    ayatGrid.innerHTML = ''; 
    ayatEmptyState.style.display = (!data || data.length === 0) ? 'block' : 'none';

    for (var i = 0; i < data.length; i++) {
      var ayat = data[i];
      var card = document.createElement('div');
      card.className = 'ayat-card';
      card.innerHTML = '<div class="ayat-num">' + ayat.ayat_number + '</div><div class="ayat-label">' + ayat.name + '</div>' +
                       '<button class="comment-btn">💬 Comments</button>';
      
      // Open PDF
      card.onclick = function(e) { 
        if(!e.target.classList.contains('comment-btn')) openViewer(ayat.file_url, ayat.name); 
      };
      // Open Comments
      card.querySelector('.comment-btn').onclick = function(e) {
        e.stopPropagation();
        openCommentsModal(ayat.id, ayat.name);
      };
      ayatGrid.appendChild(card);
    }
  }

  // --- PDF VIEWER ---
  async function openViewer(url, title) {
    if (isViewerLoading) return;
    isViewerLoading = true;
    viewer.classList.add('active');
    viewerTitle.textContent = title;
    downloadBtn.href = url;
    pdfContainer.innerHTML = '<div class="loader" style="margin-top: 100px;"></div>';
    currentScale = 1.2;
    updateZoomDisplay();

    try {
      var res = await fetch(url);
      var buffer = await res.arrayBuffer();
      var pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      totalPages = pdfDoc.numPages;
      pageInput.value = 1; pageInput.max = totalPages;
      totalPagesDisplay.textContent = totalPages;
      pdfContainer.innerHTML = '';

      var canvasesData = [];
      for (var i = 1; i <= totalPages; i++) {
        var page = await pdfDoc.getPage(i);
        var viewport = page.getViewport({ scale: currentScale });
        var canvas = document.createElement('canvas');
        canvas.id = 'page-canvas-' + i;
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.style.background = '#fff'; canvas.dataset.pageNum = i;
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
              pData.page.render({ canvasContext: canvas.getContext('2d'), viewport: pData.viewport }).promise.then(function() { canvas.dataset.rendered = 'true'; });
              observer.unobserve(canvas);
            }
            pageInput.value = pageNum;
          }
        });
      }, { root: viewerBody, rootMargin: '300px', threshold: 0.1 });
      for (var k = 0; k < canvasesData.length; k++) observer.observe(canvasesData[k].canvas);
    } catch (err) { pdfContainer.innerHTML = '<p style="color:white;">Error loading PDF.</p>'; }
    finally { isViewerLoading = false; }
  }

  downloadAllBtn.onclick = async function() {
    downloadAllBtn.textContent = 'Zipping...'; downloadAllBtn.disabled = true;
    try {
      var result = await supabase.from('ayats').select('name, file_url').eq('surah_id', currentSurahId).order('ayat_number', { ascending: true });
      var ayats = result.data;
      if (!ayats || ayats.length === 0) { alert('No Ayats to download.'); return; }
      var zip = new JSZip(); var folder = zip.folder('Surah_' + currentSurahId);
      for (var i = 0; i < ayats.length; i++) { var res = await fetch(ayats[i].file_url); folder.file(ayats[i].name + '.pdf', await res.blob()); }
      saveAs(await zip.generateAsync({ type: 'blob' }), 'Surah_' + currentSurahId + '_complete.zip');
    } catch (err) { alert('Failed: ' + err.message); }
    finally { downloadAllBtn.textContent = '⬇ Download All (ZIP)'; downloadAllBtn.disabled = false; }
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
      var uploadResult = await supabase.storage.from('pdfs').upload(fileName, currentAyatFile);
      if(uploadResult.error) throw uploadResult.error;
      var urlResult = supabase.storage.from('pdfs').getPublicUrl(fileName);
      var dbResult = await supabase.from('ayats').insert({ surah_id: currentSurahId, ayat_number: num, name: pdfName, file_url: urlResult.data.publicUrl });
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
    if (targetCanvas) targetCanvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  goToPageBtn.onclick = goToPage;
  pageInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') goToPage(); });

  updateAuthUI();
});
