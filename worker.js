export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/' || path === '/index.html') {
        return new Response(getHTML(), {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Permissions-Policy': 'clipboard-read=(self), clipboard-write=(self)',
            ...corsHeaders
          }
        });
      }

      if (path === '/api/upload' && request.method === 'POST') {
        return await handleUpload(request, env, corsHeaders);
      }

      if (path === '/api/list' && request.method === 'GET') {
        return await handleList(request, env, corsHeaders);
      }

      if (path.startsWith('/api/delete/') && request.method === 'DELETE') {
        return await handleDelete(request, env, corsHeaders, path);
      }

      if (path.startsWith('/img/')) {
        return await handleImage(request, env, path);
      }

      if (path === '/api/stats' && request.method === 'GET') {
        return await handleStats(request, env, corsHeaders);
      }

      if (path === '/api/rename' && request.method === 'POST') {
        return await handleRename(request, env, corsHeaders);
      }

      if (path === '/api/batch-delete' && request.method === 'POST') {
        return await handleBatchDelete(request, env, corsHeaders);
      }

      if (path === '/api/tags' && request.method === 'GET') {
        return await handleGetTags(request, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

function verifyPassword(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.substring(7);
  return token === env.PASSWORD;
}

async function handleUpload(request, env, corsHeaders) {
  if (!verifyPassword(request, env)) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const customName = formData.get('customName') || '';
  const tags = formData.get('tags') || '';

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const validTypes = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/bmp'];
  if (!validTypes.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split('.').pop();
  const filename = `${timestamp}_${randomStr}.${extension}`;

  const normalizedTags = tags.split(',').map(t => t.trim()).filter(Boolean).join(',');

  await env.IMAGES.put(filename, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      originalName: file.name,
      customName: customName.trim(),
      uploadTime: new Date().toISOString(),
      size: file.size.toString(),
      tags: normalizedTags,
    }
  });

  const imageUrl = `${new URL(request.url).origin}/img/${filename}`;

  return new Response(JSON.stringify({
    success: true, filename, url: imageUrl, size: file.size, type: file.type,
    customName: customName.trim(), tags: normalizedTags
  }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

async function handleList(request, env, corsHeaders) {
  if (!verifyPassword(request, env)) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '1000');
  const cursor = url.searchParams.get('cursor') || undefined;

  const options = { limit, include: ['customMetadata'] };
  if (cursor) options.cursor = cursor;

  const listed = await env.IMAGES.list(options);

  const images = listed.objects.map((obj) => {
    const metadata = obj.customMetadata || {};
    return {
      key: obj.key,
      url: `${new URL(request.url).origin}/img/${obj.key}`,
      size: parseInt(metadata.size || obj.size || 0),
      uploadTime: metadata.uploadTime || obj.uploaded.toISOString(),
      originalName: metadata.originalName || obj.key,
      customName: metadata.customName || '',
      tags: metadata.tags || '',
    };
  });

  return new Response(JSON.stringify({
    images,
    truncated: listed.truncated === true,
    cursor: listed.cursor || null
  }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

async function handleDelete(request, env, corsHeaders, path) {
  if (!verifyPassword(request, env)) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const filename = path.replace('/api/delete/', '');
  await env.IMAGES.delete(filename);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function handleImage(request, env, path) {
  const filename = path.replace('/img/', '');
  const object = await env.IMAGES.get(filename);
  if (!object) return new Response('Image not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(object.body, { headers });
}

async function handleStats(request, env, corsHeaders) {
  if (!verifyPassword(request, env)) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  let cursor;
  let totalSize = 0;
  let totalImages = 0;
  let safetyLimit = 0;

  do {
    const listed = await env.IMAGES.list({ limit: 1000, include: ['customMetadata'], cursor });
    for (const obj of listed.objects) {
      const metadata = obj.customMetadata || {};
      totalSize += parseInt(metadata.size || obj.size || 0);
      totalImages += 1;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
    safetyLimit++;
    if(safetyLimit > 3) break;
  } while (cursor);

  return new Response(JSON.stringify({
    totalImages,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
  }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

async function handleRename(request, env, corsHeaders) {
  if (!verifyPassword(request, env)) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const { filename, customName, tags } = await request.json();
  const object = await env.IMAGES.get(filename);
  if (!object) {
    return new Response(JSON.stringify({ error: 'Image not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const oldMetadata = object.customMetadata || {};
  const normalizedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean).join(',') : '';
  
  await env.IMAGES.put(filename, object.body, {
    httpMetadata: object.httpMetadata,
    customMetadata: {
      ...oldMetadata,
      customName: (customName || '').trim(),
      tags: normalizedTags,
    }
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function handleBatchDelete(request, env, corsHeaders) {
  if (!verifyPassword(request, env)) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const { filenames } = await request.json();
  if (!Array.isArray(filenames) || filenames.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid file list' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  if (filenames.length <= 1000) {
    await env.IMAGES.delete(filenames);
  } else {
    for (let i = 0; i < filenames.length; i += 1000) {
      const chunk = filenames.slice(i, i + 1000);
      await env.IMAGES.delete(chunk);
    }
  }

  return new Response(JSON.stringify({ success: true, deleted: filenames.length }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function handleGetTags(request, env, corsHeaders) {
  if (!verifyPassword(request, env)) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  let cursor;
  const tagCount = {};
  let safetyLimit = 0;
  
  do {
    const listed = await env.IMAGES.list({ limit: 1000, include: ['customMetadata'], cursor });
    for (const obj of listed.objects) {
      const metadata = obj.customMetadata || {};
      const tags = metadata.tags || '';
      if (tags) {
        tags.split(',').forEach(tag => {
          const trimmed = tag.trim();
          if (trimmed) tagCount[trimmed] = (tagCount[trimmed] || 0) + 1;
        });
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined;
    safetyLimit++;
    if(safetyLimit > 3) break;
  } while (cursor);

  const tagList = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return new Response(JSON.stringify({ tags: tagList }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ImgNaondo - Image Hosting</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .header { background: #2c3e50; color: white; padding: 15px 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header-content { display: flex; justify-content: space-between; align-items: center; max-width: 1400px; margin: 0 auto; }
    .header h1 { font-size: 24px; font-weight: 600; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .login-box { max-width: 400px; margin: 100px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .login-box h2 { margin-bottom: 20px; text-align: center; }
    input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; margin-bottom: 10px; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #3498db; }
    button { padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: background 0.2s; }
    button:hover { background: #2980b9; }
    button:disabled { background: #95a5a6; cursor: not-allowed; }
    .btn-danger { background: #e74c3c; }
    .btn-danger:hover { background: #c0392b; }
    .btn-success { background: #27ae60; }
    .btn-success:hover { background: #229954; }
    .toolbar { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .toolbar-section { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .stats { display: flex; gap: 15px; margin-left: auto; font-size: 14px; color: #666; }
    .upload-box { background: white; border: 2px dashed #ddd; border-radius: 8px; padding: 40px; text-align: center; cursor: pointer; margin-bottom: 20px; transition: all 0.2s; }
    .upload-box:hover { border-color: #3498db; background: #f8f9fa; }
    .upload-box.dragging { border-color: #3498db; background: #e3f2fd; }
    .tag-cloud { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .tag-cloud-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .tag-cloud-header h3 { font-size: 16px; font-weight: 600; }
    .tag-cloud-toggle { background: transparent; color: #3498db; padding: 5px 10px; font-size: 13px; }
    .tag-cloud-content { display: flex; flex-wrap: wrap; gap: 8px; max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
    .tag-cloud-content.expanded { max-height: 500px; }
    .tag-item { display: inline-flex; align-items: center; padding: 6px 12px; background: #ecf0f1; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; user-select: none; }
    .tag-item:hover { background: #3498db; color: white; transform: translateY(-2px); }
    .tag-item.active { background: #3498db; color: white; }
    .tag-item .tag-count { margin-left: 6px; font-size: 11px; opacity: 0.8; font-weight: 600; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
    .image-card { background: white; border-radius: 8px; overflow: visible; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; transition: transform 0.2s, box-shadow 0.2s; }
    .image-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
    .image-card.selected { outline: 3px solid #3498db; }
    .image-card img { width: 100%; height: 200px; object-fit: cover; display: block; cursor: zoom-in; border-top-left-radius: 8px; border-top-right-radius: 8px; }
    .image-info { padding: 12px; }
    .image-name { font-weight: 600; margin-bottom: 5px; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .image-meta { font-size: 12px; color: #666; margin-bottom: 3px; }
    .image-tags { font-size: 12px; margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 4px; }
    .image-tag { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 10px; }
    .image-actions { display: flex; gap: 5px; flex-wrap: wrap; }
    .image-actions button { flex: 1; padding: 6px 10px; font-size: 12px; min-width: 60px; }
    .checkbox { position: absolute; top: 10px; left: 10px; width: 20px; height: 20px; cursor: pointer; z-index: 10; }
    .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1000; align-items: center; justify-content: center; }
    .modal.show { display: flex; }
    .modal-content { background: white; padding: 25px; border-radius: 8px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; }
    .modal-content h3 { margin-bottom: 15px; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 500; font-size: 14px; }
    .toast { position: fixed; bottom: 20px; right: 20px; background: #333; color: white; padding: 12px 20px; border-radius: 4px; font-size: 14px; z-index: 2000; animation: slideIn 0.3s; }
    @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .hidden { display: none !important; }
    .search-box { flex: 1; max-width: 300px; }
    select { width: auto; padding: 8px 12px; margin-bottom: 0; }
    .bulk-actions { display: none; gap: 10px; align-items: center; }
    .bulk-actions.show { display: flex; }
    .no-images { text-align: center; padding: 60px 20px; color: #999; font-size: 16px; }
    .upload-inputs { margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .upload-inputs input { max-width: 250px; display: inline-block; margin-bottom: 0; }
    .footer { text-align: center; padding: 20px; margin-top: 40px; font-size: 14px; color: #666; border-top: 1px solid #eee; }
    .footer a { color: #3498db; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    .lightbox.modal { align-items: center; justify-content: center; }
    .lightbox-img { max-width: 85vw; max-height: 85vh; border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,.35); }
    .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); border: none; background: rgba(0,0,0,.5); color: #fff; font-size: 28px; padding: 8px 12px; border-radius: 8px; cursor: pointer; z-index: 1001; }
    .lightbox-nav.prev { left: 20px; }
    .lightbox-nav.next { right: 20px; }

    .copy-dropdown { position: relative; }
    .copy-dropdown-menu {
      position: absolute;
      right: 0;
      bottom: calc(100% + 5px);
      background: #fff;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 5px;
      min-width: 150px;
      z-index: 50;
      opacity: 0;
      transform: translateY(10px) scale(0.95);
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.15s ease-out, transform 0.15s ease-out;
    }
    .copy-dropdown.open .copy-dropdown-menu {
      opacity: 1;
      transform: translateY(0) scale(1);
      visibility: visible;
      pointer-events: auto;
    }
    .copy-dropdown-menu button {
      width: 100%;
      padding: 8px 12px;
      background: transparent;
      color: #333;
      text-align: left;
      border: none;
      border-radius: 4px;
      font-size: 13px;
    }
    .copy-dropdown-menu button:hover {
      background: #f0f0f0;
    }
    .loader { text-align: center; padding: 16px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <h1>🖼️ ImgNaondo Image Hosting</h1>
      <button id="logoutButton" class="hidden btn-danger" onclick="logout()" style="padding: 8px 15px;">Logout</button>
    </div>
  </div>
  <div id="loginSection" class="login-box">
    <h2>Login</h2>
    <input type="password" id="passwordInput" placeholder="Enter access password" onkeypress="if(event.key==='Enter')login()">
    <button style="width: 100%;" onclick="login()">Login</button>
  </div>
  <div id="mainSection" class="container hidden">
    <div class="upload-box" id="uploadArea">
      <div style="font-size: 48px; margin-bottom: 10px;">☁️</div>
      <h3>Click or Drag & Drop Images Here</h3>
      <p style="color: #666; margin-top: 8px;">Supports JPG, PNG, GIF, WebP, SVG, BMP</p>
      <input type="file" id="fileInput" accept="image/*" multiple style="display: none;" onchange="handleFileSelect(this.files)">
      <div class="upload-inputs">
        <input type="text" id="uploadCustomName" placeholder="Custom Name (optional)" onclick="event.stopPropagation()">
        <input type="text" id="uploadTags" placeholder="Tags (comma-separated)" onclick="event.stopPropagation()">
      </div>
      <button onclick="event.stopPropagation(); document.getElementById('fileInput').click()" style="margin-top: 15px;">Select Files</button>
      <div id="uploadProgress" style="margin-top: 15px; color: #666; font-size: 14px;"></div>
    </div>
    <div class="tag-cloud" id="tagCloud">
      <div class="tag-cloud-header">
        <h3>🏷️ Tag Cloud</h3>
        <button class="tag-cloud-toggle" onclick="toggleTagCloud()">Expand</button>
      </div>
      <div class="tag-cloud-content" id="tagCloudContent"></div>
    </div>
    <div class="toolbar">
      <div class="toolbar-section">
        <input type="text" id="searchInput" class="search-box" placeholder="Search by name or tag...">
        <select id="sortSelect" onchange="applyFilters()">
          <option value="time-desc">Newest First</option>
          <option value="time-asc">Oldest First</option>
          <option value="size-desc">Largest First</option>
          <option value="size-asc">Smallest First</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
        </select>
        <button onclick="toggleSelectMode()">Bulk Select</button>
      </div>
      <div class="bulk-actions" id="bulkActions">
        <button class="btn-danger" onclick="batchDelete()">Delete Selected</button>
        <button onclick="selectAll()">Select All</button>
        <button onclick="deselectAll()">Deselect</button>
        <span id="selectedCount" style="color: #666;">Selected: 0</span>
      </div>
      <div class="stats">
        <span>📊 Total: <strong id="totalImages">0</strong></span>
        <span>💾 Storage: <strong id="totalSize">0 MB</strong></span>
      </div>
    </div>
    <div class="gallery" id="gallery"></div>
    <div id="infiniteLoader" class="loader hidden">Loading...</div>
    <div id="endMessage" class="loader hidden">No more images.</div>
  </div>
  <div class="modal" id="editModal" onclick="if(event.target===this)closeEditModal()">
    <div class="modal-content">
      <h3>Edit Image Info</h3>
      <div class="form-group">
        <label>Custom Name</label>
        <input type="text" id="editCustomName">
      </div>
      <div class="form-group">
        <label>Tags (comma-separated)</label>
        <input type="text" id="editTags" placeholder="landscape, travel, 2024">
      </div>
      <div class="form-group">
        <label>Original Filename</label>
        <input type="text" id="editOriginalName" disabled>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn-success" onclick="saveEdit()">Save</button>
        <button onclick="closeEditModal()">Cancel</button>
      </div>
    </div>
  </div>
  <div class="modal lightbox" id="lightbox" onclick="if(event.target===this)closeLightbox()">
    <button class="lightbox-nav prev" onclick="prevImage(event)">‹</button>
    <img id="lightboxImg" class="lightbox-img" src="" alt="">
    <button class="lightbox-nav next" onclick="nextImage(event)">›</button>
  </div>
  <footer class="footer">
    <p>&copy; <span id="currentYear"></span> Created by <a href="https://github.com/xdanielf/" target="_blank" rel="noopener noreferrer">xdanielf</a>.</p>
  </footer>
  <script>
    const PASSWORD_KEY = 'imgnaondo_password';
    const LOGIN_TIME_KEY = 'imgnaondo_login_time';
    const SESSION_DURATION = 24 * 60 * 60 * 1000;
    const PAGE_SIZE = 50;
    const SCROLL_THRESHOLD = 300;
    
    let password = '';
    let fullLibrary = [];
    let filteredLibrary = [];
    let renderedCount = 0;
    
    let selectedImages = new Set();
    let selectMode = false;
    let currentEditKey = '';
    let activeTag = null;
    let tagCloudExpanded = false;
    let isLoadingLibrary = false;
    let lightboxIndex = -1;

    function checkExistingLogin() {
      const storedPassword = localStorage.getItem(PASSWORD_KEY);
      const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
      if (storedPassword && loginTime && (Date.now() - parseInt(loginTime) < SESSION_DURATION)) {
        password = storedPassword;
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('mainSection').classList.remove('hidden');
        document.getElementById('logoutButton').classList.remove('hidden');
        loadData();
      } else {
        logout(false);
      }
    }

    function logout(reload = true) {
      localStorage.removeItem(PASSWORD_KEY);
      localStorage.removeItem(LOGIN_TIME_KEY);
      password = '';
      if (reload) location.reload();
    }

    async function login() {
      const inputPassword = document.getElementById('passwordInput').value;
      if (!inputPassword) return showToast('Please enter the password');
      try {
        const res = await fetch('/api/stats', { headers: { 'Authorization': 'Bearer ' + inputPassword } });
        if (res.ok) {
          password = inputPassword;
          localStorage.setItem(PASSWORD_KEY, password);
          localStorage.setItem(LOGIN_TIME_KEY, Date.now());
          document.getElementById('loginSection').classList.add('hidden');
          document.getElementById('mainSection').classList.remove('hidden');
          document.getElementById('logoutButton').classList.remove('hidden');
          loadData();
        } else {
          showToast('Incorrect password');
        }
      } catch (error) {
        showToast('Login failed: ' + error.message);
      }
    }

    async function loadData() {
      fullLibrary = [];
      filteredLibrary = [];
      renderedCount = 0;
      document.getElementById('gallery').innerHTML = '';
      document.getElementById('endMessage').classList.add('hidden');
      
      loadStats();
      await fetchFullLibrary();
    }

    async function fetchFullLibrary() {
      if (isLoadingLibrary) return;
      isLoadingLibrary = true;
      showBottomLoader(true);
      
      let cursor = null;
      let hasMore = true;
      let isFirstPage = true;

      try {
        while (hasMore) {
          const qs = new URLSearchParams({ limit: '1000' });
          if (cursor) qs.set('cursor', cursor);
          
          const res = await fetch('/api/list?' + qs.toString(), {
            headers: { 'Authorization': 'Bearer ' + password }
          });
          
          if (!res.ok) throw new Error('Failed to fetch list');
          
          const data = await res.json();
          
          const newItems = data.images.map(img => ({
            ...img,
            _searchStr: (img.customName + ' ' + img.originalName + ' ' + (img.tags||'')).toLowerCase()
          }));
          
          fullLibrary.push(...newItems);
          
          if (isFirstPage) {
            loadTags();
            applyFilters();
            isFirstPage = false;
          } else {
            updateStatsUI();
          }

          cursor = data.cursor;
          hasMore = data.truncated && !!cursor;
          
          if(hasMore) await new Promise(r => setTimeout(r, 50));
        }
        
        updateStatsUI();
        if (fullLibrary.length > renderedCount) {
             applyFilters(false);
        }
        document.getElementById('endMessage').classList.remove('hidden');

      } catch (e) {
        console.error(e);
        showToast('Error loading image library');
      } finally {
        isLoadingLibrary = false;
        showBottomLoader(false);
      }
    }

    function applyFilters(resetRender = true) {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      const sortBy = document.getElementById('sortSelect').value;

      let temp = fullLibrary;
      
      if (activeTag) {
        const tagSearch = activeTag.toLowerCase();
        temp = temp.filter(img => (img.tags || '').toLowerCase().includes(tagSearch));
      }

      if (searchTerm) {
        temp = temp.filter(img => img._searchStr.includes(searchTerm));
      }

      temp.sort((a, b) => {
        switch (sortBy) {
          case 'time-desc': return new Date(b.uploadTime) - new Date(a.uploadTime);
          case 'time-asc': return new Date(a.uploadTime) - new Date(b.uploadTime);
          case 'size-desc': return b.size - a.size;
          case 'size-asc': return a.size - b.size;
          case 'name-asc': return (a.customName || a.originalName).localeCompare(b.customName || b.originalName);
          case 'name-desc': return (b.customName || b.originalName).localeCompare(a.customName || a.originalName);
          default: return 0;
        }
      });

      filteredLibrary = temp;
      
      if (resetRender) {
        document.getElementById('gallery').innerHTML = '';
        renderedCount = 0;
        renderNextBatch();
      }
      
      const totalSpan = document.getElementById('totalImages');
      if (filteredLibrary.length !== fullLibrary.length) {
        totalSpan.textContent = \`\${filteredLibrary.length} / \${fullLibrary.length}\`;
      } else {
        totalSpan.textContent = fullLibrary.length;
      }
    }

    function renderNextBatch() {
      const gallery = document.getElementById('gallery');
      
      if (filteredLibrary.length === 0) {
        gallery.innerHTML = '<div class="no-images">No images found.</div>';
        return;
      }

      const start = renderedCount;
      const end = Math.min(renderedCount + PAGE_SIZE, filteredLibrary.length);
      
      if (start >= end) return;

      const fragment = document.createDocumentFragment();
      
      for (let i = start; i < end; i++) {
        const img = filteredLibrary[i];
        const card = document.createElement('div');
        card.className = 'image-card' + (selectedImages.has(img.key) ? ' selected' : '');
        
        const displayName = img.customName || img.originalName;
        const safeName = displayName.replace(/"/g, '&quot;');
        const tagsHtml = img.tags ? img.tags.split(',').map(tag => \`<span class="image-tag">\${tag.trim()}</span>\`).join('') : '';
        
        card.innerHTML = \`
          \${selectMode ? \`<input type="checkbox" class="checkbox" \${selectedImages.has(img.key) ? 'checked' : ''} onchange="toggleSelect('\${img.key}')">\` : ''}
          <img src="\${img.url}" alt="\${safeName}" loading="lazy"
               onclick="openLightbox('\${img.key}')"
               onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZWVlIi8+PC9zdmc+'">
          <div class="image-info">
            <div class="image-name" title="\${safeName}">\${displayName}</div>
            <div class="image-meta">\${formatSize(img.size)} • \${new Date(img.uploadTime).toLocaleDateString()}</div>
            \${tagsHtml ? \`<div class="image-tags">\${tagsHtml}</div>\` : ''}
            <div class="image-actions">
              <div class="copy-dropdown">
                <button onclick="toggleCopyMenu(event)">Copy ▾</button>
                <div class="copy-dropdown-menu" onclick="event.stopPropagation()">
                  <button onclick="handleCopy('\${img.key}', 'url')">URL</button>
                  <button onclick="handleCopy('\${img.key}', 'html')">HTML</button>
                  <button onclick="handleCopy('\${img.key}', 'md')">Markdown</button>
                </div>
              </div>
              <button onclick="openEdit('\${img.key}')">Edit</button>
              <button class="btn-danger" onclick="deleteImage('\${img.key}')">Del</button>
            </div>
          </div>
        \`;
        fragment.appendChild(card);
      }
      
      gallery.appendChild(fragment);
      renderedCount = end;

      if (renderedCount >= filteredLibrary.length) {
        document.getElementById('infiniteLoader').classList.add('hidden');
        document.getElementById('endMessage').classList.remove('hidden');
      } else {
        document.getElementById('infiniteLoader').classList.remove('hidden');
        document.getElementById('endMessage').classList.add('hidden');
      }
    }

    window.addEventListener('scroll', () => {
      const scrollBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      if (scrollBottom < SCROLL_THRESHOLD) {
        renderNextBatch();
      }
    });

    function handleCopy(key, type) {
       const img = fullLibrary.find(i => i.key === key);
       if(img) {
         const alt = img.customName || img.originalName;
         copyInFormat(img.url, alt, type);
       }
       document.querySelectorAll('.copy-dropdown.open').forEach(el => el.classList.remove('open'));
    }

    async function loadStats() {
    }
    
    function updateStatsUI() {
        let totalSize = 0;
        fullLibrary.forEach(img => totalSize += (img.size || 0));
        document.getElementById('totalImages').textContent = fullLibrary.length;
        document.getElementById('totalSize').textContent = (totalSize / (1024 * 1024)).toFixed(2) + ' MB';
    }

    async function loadTags() {
       const tagCounts = {};
       fullLibrary.forEach(img => {
           if(img.tags) {
               img.tags.split(',').forEach(t => {
                   const tag = t.trim();
                   if(tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
               });
           }
       });
       
       allTags = Object.entries(tagCounts)
         .map(([tag, count]) => ({ tag, count }))
         .sort((a, b) => b.count - a.count);
       
       renderTagCloud();
    }

    function renderTagCloud() {
      const container = document.getElementById('tagCloudContent');
      if (!allTags || allTags.length === 0) {
        container.innerHTML = '<div style="color: #999; text-align: center; padding: 20px 0;">No tags yet</div>';
        return;
      }
      container.innerHTML = allTags.map(({tag, count}) => {
        const escapedTag = tag.replace(/'/g, "\\'");
        return \`<div class="tag-item \${activeTag === tag ? 'active' : ''}" onclick="filterByTag('\${escapedTag}')">\${tag}<span class="tag-count">\${count}</span></div>\`;
      }).join('');
    }

    function filterByTag(tag) {
      if (activeTag === tag) { 
          activeTag = null; 
          document.getElementById('searchInput').value = ''; 
      } else { 
          activeTag = tag; 
          document.getElementById('searchInput').value = tag;
      }
      renderTagCloud();
      applyFilters();
    }

    function handleFileSelect(files) { if (files.length > 0) uploadFiles(files); }

    async function uploadFiles(files) {
      const customName = document.getElementById('uploadCustomName').value.trim();
      const tags = document.getElementById('uploadTags').value.trim();
      const uploadButton = document.querySelector('#uploadArea button');
      const uploadProgress = document.getElementById('uploadProgress');
      
      uploadButton.disabled = true; 
      
      let successCount = 0;
      
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          uploadProgress.textContent = \`Uploading \${i + 1} of \${files.length}...\`;
          const formData = new FormData();
          formData.append('file', file);
          if (customName) formData.append('customName', files.length > 1 ? \`\${customName}_\${i + 1}\` : customName);
          if (tags) formData.append('tags', tags);

          const res = await fetch('/api/upload', {
             method: 'POST', headers: { 'Authorization': 'Bearer ' + password }, body: formData
          });
          const data = await res.json();
          
          if (data.success) {
             successCount++;
             const newImage = {
                 key: data.filename,
                 url: data.url,
                 size: data.size,
                 uploadTime: new Date().toISOString(),
                 originalName: file.name,
                 customName: data.customName,
                 tags: data.tags,
                 _searchStr: (data.customName + ' ' + file.name + ' ' + data.tags).toLowerCase()
             };
             fullLibrary.unshift(newImage);
          }
        }
      } catch(e) { console.error(e); }
      finally {
          uploadButton.disabled = false;
          uploadProgress.textContent = '';
          document.getElementById('uploadCustomName').value = '';
          document.getElementById('uploadTags').value = '';
          document.getElementById('fileInput').value = '';
      }
      
      if (successCount > 0) {
          showToast(\`Uploaded \${successCount} images\`);
          loadTags();
          applyFilters();
          updateStatsUI();
      }
    }

    async function deleteImage(key) {
      if (!confirm('Delete this image?')) return;
      try {
        const res = await fetch(\`/api/delete/\${key}\`, {
          method: 'DELETE', headers: { 'Authorization': 'Bearer ' + password }
        });
        if (res.ok) {
          fullLibrary = fullLibrary.filter(i => i.key !== key);
          selectedImages.delete(key);
          
          showToast('Deleted');
          loadTags();
          applyFilters(false);
          applyFilters(true);
          updateStatsUI();
        }
      } catch (e) { showToast(e.message); }
    }
    
    async function batchDelete() {
        if (!selectMode || selectedImages.size === 0) return showToast('No images selected');
        if (!confirm(\`Delete \${selectedImages.size} images?\`)) return;
        
        const keys = Array.from(selectedImages);
        
        try {
            const res = await fetch('/api/batch-delete', {
                method: 'POST',
                headers: {'Authorization': 'Bearer ' + password, 'Content-Type': 'application/json'},
                body: JSON.stringify({ filenames: keys })
            });
            if(res.ok) {
                const delSet = new Set(keys);
                fullLibrary = fullLibrary.filter(i => !delSet.has(i.key));
                selectedImages.clear();
                document.getElementById('selectedCount').textContent = 'Selected: 0';
                
                showToast('Batch delete successful');
                loadTags();
                applyFilters();
                updateStatsUI();
            }
        } catch(e) { showToast('Batch delete failed'); }
    }

    async function saveEdit() {
      const customName = document.getElementById('editCustomName').value.trim();
      const tags = document.getElementById('editTags').value.trim();
      
      try {
        const res = await fetch('/api/rename', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + password, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: currentEditKey, customName, tags })
        });
        if (res.ok) {
           const item = fullLibrary.find(i => i.key === currentEditKey);
           if (item) {
               item.customName = customName;
               item.tags = tags;
               item._searchStr = (item.customName + ' ' + item.originalName + ' ' + item.tags).toLowerCase();
           }
           closeEditModal();
           showToast('Saved');
           loadTags();
           applyFilters(false);
           applyFilters();
        }
      } catch(e) { showToast(e.message); }
    }

    function showBottomLoader(show) {
      const el = document.getElementById('infiniteLoader');
      if (show) el.classList.remove('hidden'); else el.classList.add('hidden');
    }
    
    function toggleSelectMode() {
      selectMode = !selectMode;
      if (!selectMode) {
        selectedImages.clear();
        document.getElementById('bulkActions').classList.remove('show');
        document.getElementById('selectedCount').textContent = 'Selected: 0';
      } else {
        document.getElementById('bulkActions').classList.add('show');
      }
      document.getElementById('gallery').innerHTML = '';
      renderedCount = 0;
      renderNextBatch();
    }

    function toggleSelect(key) {
      if (selectedImages.has(key)) selectedImages.delete(key);
      else selectedImages.add(key);
      document.getElementById('selectedCount').textContent = \`Selected: \${selectedImages.size}\`;
    }
    
    function selectAll() {
      filteredLibrary.forEach(img => selectedImages.add(img.key));
      document.getElementById('selectedCount').textContent = \`Selected: \${selectedImages.size}\`;
      const scroll = window.scrollY;
      document.getElementById('gallery').innerHTML = '';
      renderedCount = 0;
      renderNextBatch();
      window.scrollTo(0, scroll);
    }
    
    function deselectAll() {
      selectedImages.clear();
      document.getElementById('selectedCount').textContent = 'Selected: 0';
      const scroll = window.scrollY;
      document.getElementById('gallery').innerHTML = '';
      renderedCount = 0;
      renderNextBatch();
      window.scrollTo(0, scroll);
    }

    function openEdit(key) {
      const img = fullLibrary.find(i => i.key === key);
      if (!img) return;
      currentEditKey = key;
      document.getElementById('editCustomName').value = img.customName || '';
      document.getElementById('editTags').value = img.tags || '';
      document.getElementById('editOriginalName').value = img.originalName;
      document.getElementById('editModal').classList.add('show');
    }
    function closeEditModal() { document.getElementById('editModal').classList.remove('show'); }
    
    function openLightbox(key) {
      lightboxIndex = filteredLibrary.findIndex(i => i.key === key);
      if (lightboxIndex < 0) return;
      updateLightbox();
      document.getElementById('lightbox').classList.add('show');
    }
    function updateLightbox() {
      const img = filteredLibrary[lightboxIndex];
      if (!img) return;
      const el = document.getElementById('lightboxImg');
      el.src = img.url;
      el.alt = img.customName || img.originalName;
    }
    function prevImage(e) { e && e.stopPropagation(); if (lightboxIndex > 0) { lightboxIndex--; updateLightbox(); } }
    function nextImage(e) { e && e.stopPropagation(); if (lightboxIndex < filteredLibrary.length - 1) { lightboxIndex++; updateLightbox(); } }
    function closeLightbox() { document.getElementById('lightbox').classList.remove('show'); }

    function toggleTagCloud() {
      tagCloudExpanded = !tagCloudExpanded;
      const content = document.getElementById('tagCloudContent');
      const btn = document.querySelector('.tag-cloud-toggle');
      if (tagCloudExpanded) { content.classList.add('expanded'); btn.textContent = 'Collapse'; }
      else { content.classList.remove('expanded'); btn.textContent = 'Expand'; }
    }
    
    function showToast(msg) {
      const t = document.createElement('div'); t.className='toast'; t.textContent=msg;
      document.body.appendChild(t); setTimeout(()=>t.remove(), 2500);
    }
    
    function toggleCopyMenu(e) {
      e.stopPropagation();
      const wrap = e.target.closest('.copy-dropdown');
      document.querySelectorAll('.copy-dropdown.open').forEach(el => { if (el !== wrap) el.classList.remove('open'); });
      wrap.classList.toggle('open');
    }
    
    async function attemptCopy(text) {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return; }
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position='fixed'; ta.style.left='-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    
    function buildCopyText(url, alt, fmt) {
      switch (fmt) {
        case 'url': return url;
        case 'html': return \`<img src="\${url}" alt="\${alt}">\`;
        case 'md': return \`![\${alt}](\${url})\`;
        default: return url;
      }
    }
    async function copyInFormat(url, alt, fmt) {
      try { await attemptCopy(buildCopyText(url, alt, fmt)); showToast('✓ Copied'); }
      catch (e) { showToast('✗ Copy failed'); }
    }
    
    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    document.addEventListener('click', () => document.querySelectorAll('.copy-dropdown.open').forEach(el => el.classList.remove('open')));
    
    document.getElementById('searchInput').addEventListener('input', () => {
        applyFilters();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeEditModal(); closeLightbox(); }
      else if (document.getElementById('lightbox').classList.contains('show')) {
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'ArrowRight') nextImage();
      }
    });
    
    window.addEventListener('paste', async (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items || !items.length) return;
      const files = [];
      const mimeToExt = {'image/jpeg':'jpg','image/png':'png','image/gif':'gif','image/webp':'webp','image/bmp':'bmp','image/svg+xml':'svg'};
      for (const it of items) {
        if (it.type && it.type.startsWith('image/')) {
          const blob = it.getAsFile();
          const ext = mimeToExt[blob.type] || blob.type.split('/')[1] || 'png';
          files.push(new File([blob], \`pasted_\${Date.now()}.\${ext}\`, { type: blob.type }));
        }
      }
      if (files.length && password) uploadFiles(files);
      else if (files.length) showToast('Please login first');
    });

    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragging'); });
    uploadArea.addEventListener('dragleave', (e) => { if (e.target === uploadArea) uploadArea.classList.remove('dragging'); });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault(); uploadArea.classList.remove('dragging');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) uploadFiles(files);
    });

    document.addEventListener('DOMContentLoaded', () => {
      checkExistingLogin();
      document.getElementById('currentYear').textContent = new Date().getFullYear();
    });
  </script>
</body>
</html>`;
}
