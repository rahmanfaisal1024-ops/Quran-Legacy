// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://fkeyxtulzphwbhtizpcj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lzcafnJtTDB23vWC1QXEsw_xzC7xzoz';

// We use 'supabaseClient' to avoid conflicts with the global window.supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Wait for the page to fully load before running the script
document.addEventListener('DOMContentLoaded', () => {

  // DOM Elements
  const grid = document.getElementById('grid');
  const emptyState = document.getElementById('emptyState');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput');
  const uploadModal = document.getElementById('uploadModal');
  const cancelUpload = document.getElementById('cancelUpload');
  const saveUpload = document.getElementById('saveUpload');
  const surahName = document.getElementById('surahName');
  const surahNumber = document.getElementById('surahNumber');
  const searchInput = document.getElementById('searchInput');

  const viewer = document.getElementById('viewer');
  const viewerTitle = document.getElementById('viewerTitle');
  const pdfCanvas = document.getElementById('pdfCanvas');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const zoomInBtn = document.getElementById('zoomIn');
  const zoomOutBtn = document.getElementById('zoomOut');
  const closeViewer = document.getElementById('closeViewer');
  const pageInfo = document.getElementById('pageInfo');
  const thumbStrip = document.getElementById('thumbStrip');

  let pendingFile = null;
  let currentPdf = null;
  let currentPage = 1;
  let currentScale = 1.3;
  let totalPages = 0;

  // ============================================
  // UPLOAD & THUMBNAIL GENERATION
  // ============================================
  async function generateThumbnail(file) {
    const buffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    const scale = 300 / viewport.width;
    const scaledViewport = page.getViewport({ scale });
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledViewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  // ============================================
  // LOAD ALL PDFs FROM SUPABASE
  // ============================================
  async function loadLibrary() {
    try {
      const { data, error } = await supabaseClient
        .from('pdfs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      grid.innerHTML = '';
      emptyState.style.display = data.length ? 'none' : 'block';

      data.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'folder-card';
        card.style.animationDelay = `${idx * 0.08}s`;
        card.innerHTML = `
          <button class="delete-btn" data-id="${item.id}" title="Delete">🗑</button>
          <div class="folder-thumb">
            <img src="${item.thumbnail_url}" alt="${item.name}" />
          </div>
          <div class="folder-info">
            <h3>${item.name}</h3>
            <p>${item.pages} pages${item.number ? ' • #' + item.number : ''}</p>
          </div>
        `;
        card.addEventListener('click', e => {
          if (e.target.classList.contains('delete-btn')) return;
          openViewer(item);
        });
        card.querySelector('.delete-btn').addEventListener('click', async e => {
          e.stopPropagation();
          if (confirm(`Delete "${item.name}"?`)) {
            await deletePdf(item);
          }
        });
        grid.appendChild(card);
      });
    } catch (error) {
      console.error('Error loading library:', error);
      alert('Error loading PDFs. Check console for details.');
    }
  }

  // ============================================
  // UPLOAD FLOW
  // ============================================
  uploadBtn.onclick = () => fileInput.click();
  
  fileInput.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    pendingFile = file;
    surahName.value = file.name.replace(/\.pdf$/i, '');
    surahNumber.value = '';
    uploadModal.classList.add('active');
  };

  cancelUpload.onclick = () => {
    uploadModal.classList.remove('active');
    pendingFile = null;
    fileInput.value = '';
  };

  saveUpload.onclick = async () => {
    if (!pendingFile) return;
    
    saveUpload.textContent = 'Uploading...';
    saveUpload.disabled = true;

    try {
      const name = surahName.value.trim() || 'Untitled';
      const number = surahNumber.value.trim();

      // Generate thumbnail
      const thumbnailBlob = await generateThumbnail(pendingFile);
      
      // Upload PDF to Supabase Storage
      const pdfFileName = `${Date.now()}_${pendingFile.name}`;
      const { error: pdfError } = await supabaseClient.storage
        .from('pdfs')
        .upload(pdfFileName, pendingFile);

      if (pdfError) throw pdfError;

      // Upload thumbnail to Supabase Storage
      const thumbFileName = `${Date.now()}_thumb.jpg`;
      const thumbBlob = dataURLtoBlob(thumbnailBlob);
      const { error: thumbError } = await supabaseClient.storage
        .from('pdfs')
        .upload(thumbFileName, thumbBlob);

      if (thumbError) throw thumbError;

      // Get PDF page count
      const buffer = await pendingFile.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;

      // Get public URLs
      const { data: pdfUrlData } = supabaseClient.storage
        .from('pdfs')
        .getPublicUrl(pdfFileName);
      
      const { data: thumbUrlData } = supabaseClient.storage
        .from('pdfs')
        .getPublicUrl(thumbFileName);

      // Save to database
      const { error: dbError } = await supabaseClient
        .from('pdfs')
        .insert({
          name,
          number,
          pages: pdf.numPages,
          thumbnail_url: thumbUrlData.publicUrl,
          file_url: pdfUrlData.publicUrl
        });

      if (dbError) throw dbError;

      uploadModal.classList.remove('active');
      pendingFile = null;
      fileInput.value = '';
      loadLibrary();
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      saveUpload.textContent = 'Save';
      saveUpload.disabled = false;
    }
  };

  // Helper: Convert data URL to Blob
  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  }

  // ============================================
  // DELETE PDF
  // ============================================
  async function deletePdf(item) {
    try {
      // Delete from database
      const { error: dbError } = await supabaseClient
        .from('pdfs')
        .delete()
        .eq('id', item.id);

      if (dbError) throw dbError;

      // Extract filenames from URLs
      const pdfFileName = item.file_url.split('/').pop();
      const thumbFileName = item.thumbnail_url.split('/').pop();

      // Delete files from storage
      await supabaseClient.storage.from('pdfs').remove([pdfFileName, thumbFileName]);

      loadLibrary();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed: ' + error.message);
    }
  }

  // ============================================
  // SEARCH
  // ============================================
  searchInput.oninput = e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.folder-card').forEach(card => {
      const name = card.querySelector('h3').textContent.toLowerCase();
      card.style.display = name.includes(q) ? '' : 'none';
    });
  };

  // ============================================
  // PDF VIEWER
  // ============================================
  async function openViewer(item) {
    viewer.classList.add('active');
    viewerTitle.textContent = item.name;
    
    try {
      const response = await fetch(item.file_url);
      const buffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      
      currentPdf = await pdfjsLib.getDocument({ data: uint8 }).promise;
      totalPages = currentPdf.numPages;
      currentPage = 1;
      currentScale = 1.3;
      pageInfo.textContent = `1 / ${totalPages}`;
      await renderPage();
      await buildThumbnails();
    } catch (error) {
      console.error('Error opening PDF:', error);
      alert('Error loading PDF');
      viewer.classList.remove('active');
    }
  }

  async function renderPage() {
    const page = await currentPdf.getPage(currentPage);
    const viewport = page.getViewport({ scale: currentScale });
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;
    pdfCanvas.style.animation = 'none';
    void pdfCanvas.offsetWidth;
    pdfCanvas.style.animation = 'slideIn 0.4s ease';
    await page.render({ canvasContext: pdfCanvas.getContext('2d'), viewport }).promise;
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    document.querySelectorAll('.thumb-item').forEach((t, i) => {
      t.classList.toggle('active', i + 1 === currentPage);
    });
  }

  async function buildThumbnails() {
    thumbStrip.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const page = await currentPdf.getPage(i);
      const vp = page.getViewport({ scale: 0.3 });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      const wrap = document.createElement('div');
      wrap.className = 'thumb-item' + (i === 1 ? ' active' : '');
      wrap.appendChild(c);
      wrap.onclick = () => { currentPage = i; renderPage(); };
      thumbStrip.appendChild(wrap);
    }
  }

  prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderPage(); } };
  nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; renderPage(); } };
  zoomInBtn.onclick = () => { currentScale += 0.2; renderPage(); };
  zoomOutBtn.onclick = () => { if (currentScale > 0.5) { currentScale -= 0.2; renderPage(); } };
  closeViewer.onclick = () => { viewer.classList.remove('active'); currentPdf = null; };

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (!viewer.classList.contains('active')) return;
    if (e.key === 'ArrowRight') nextBtn.click();
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === 'Escape') closeViewer.click();
    if (e.key === '+' || e.key === '=') zoomInBtn.click();
    if (e.key === '-') zoomOutBtn.click();
  });

  // ============================================
  // INITIALIZE
  // ============================================
  loadLibrary();

});
