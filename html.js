export function getHTML() {
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
    .header h1 { font-size: 24px; font-weight: 600; display: flex; align-items: center; gap: 10px;}
    .header-controls { display: flex; align-items: center; gap: 15px; }
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
    .form-group input { width: 100%; }
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
    .lang-select {
        background: rgba(255,255,255,0.1);
        color: white;
        border: 1px solid rgba(255,255,255,0.2);
        font-size: 13px;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
    }
    .lang-select option {
        background: #2c3e50;
        color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <h1>🖼️ <span data-i18n="title">ImgNaondo</span></h1>
      <div class="header-controls">
        <select id="langSelect" class="lang-select" onchange="changeLanguage(this.value)">
            <option value="en">English</option>
            <option value="zh">简体中文</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ru">Русский</option>
            <option value="nl">Nederlands</option>
        </select>
        <button id="logoutButton" class="hidden btn-danger" onclick="logout()" style="padding: 8px 15px;" data-i18n="logout">Logout</button>
        <button id="syncBtn" class="hidden" onclick="startSync()" style="padding: 8px 15px; background: #e67e22; color: white; border: none; border-radius: 4px; cursor: pointer;" title="Sync R2 to D1">↻ Sync</button>
      </div>
    </div>
  </div>
  <div id="loginSection" class="login-box">
    <h2 data-i18n="login_title">Login</h2>
    <input type="password" id="passwordInput" data-placeholder="ph_password" placeholder="Enter access password" onkeypress="if(event.key==='Enter')performLogin()">
    <button style="width: 100%;" onclick="performLogin()" data-i18n="login_btn">Login</button>
  </div>
  <div id="mainSection" class="container hidden">
    <div class="upload-box" id="uploadArea">
      <div style="font-size: 48px; margin-bottom: 10px;">☁️</div>
      <h3 data-i18n="upload_drag">Click or Drag & Drop Images Here</h3>
      <p style="color: #666; margin-top: 8px;" data-i18n="upload_support">Supports JPG, PNG, GIF, WebP, SVG, BMP</p>
      <input type="file" id="fileInput" accept="image/*" multiple style="display: none;" onchange="handleFileSelect(this.files)">
      <div class="upload-inputs">
        <input type="text" id="uploadCustomName" data-placeholder="ph_custom_name" placeholder="Custom Name (optional)" onclick="event.stopPropagation()">
        <input type="text" id="uploadTags" data-placeholder="ph_tags" placeholder="Tags (comma-separated)" onclick="event.stopPropagation()">
      </div>
      <button onclick="event.stopPropagation(); document.getElementById('fileInput').click()" style="margin-top: 15px;" data-i18n="select_files">Select Files</button>
      <div id="uploadProgress" style="margin-top: 15px; color: #666; font-size: 14px;"></div>
    </div>
    <div class="tag-cloud" id="tagCloud">
      <div class="tag-cloud-header">
        <h3 data-i18n="tag_cloud">🏷️ Tag Cloud</h3>
        <button class="tag-cloud-toggle" onclick="toggleTagCloud()" data-i18n="expand">Expand</button>
      </div>
      <div class="tag-cloud-content" id="tagCloudContent"></div>
    </div>
    <div class="toolbar">
      <div class="toolbar-section">
        <input type="text" id="searchInput" class="search-box" data-placeholder="ph_search" placeholder="Search by name or tag...">
        <select id="sortSelect" onchange="resetAndLoad()">
        </select>
        <button onclick="toggleSelectMode()" data-i18n="bulk_select">Bulk Select</button>
      </div>
      <div class="bulk-actions" id="bulkActions">
        <button class="btn-danger" onclick="batchDelete()" data-i18n="delete_selected">Delete Selected</button>
        <button onclick="selectAll()" data-i18n="select_all">Select All</button>
        <button onclick="deselectAll()" data-i18n="deselect">Deselect</button>
        <span id="selectedCount" style="color: #666;">Selected: 0</span>
      </div>
      <div class="stats">
        <span><span data-i18n="stat_total">📊 Total:</span> <strong id="totalImages">0</strong></span>
        <span><span data-i18n="stat_storage">💾 Storage:</span> <strong id="totalSize">0 MB</strong></span>
      </div>
    </div>
    <div class="gallery" id="gallery"></div>
    <div id="infiniteLoader" class="loader hidden" data-i18n="loading">Loading...</div>
    <div id="endMessage" class="loader hidden" data-i18n="no_more">No more images.</div>
  </div>
  <div class="modal" id="editModal" onclick="if(event.target===this)closeEditModal()">
    <div class="modal-content">
      <h3 data-i18n="edit_title">Edit Image Info</h3>
      <div class="form-group">
        <label data-i18n="lbl_custom_name">Custom Name</label>
        <input type="text" id="editCustomName">
      </div>
      <div class="form-group">
        <label data-i18n="lbl_tags">Tags (comma-separated)</label>
        <input type="text" id="editTags" placeholder="landscape, travel, 2024">
      </div>
      <div class="form-group">
        <label data-i18n="lbl_original">Original Filename</label>
        <input type="text" id="editOriginalName" disabled>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button class="btn-success" onclick="saveEdit()" data-i18n="save">Save</button>
        <button onclick="closeEditModal()" data-i18n="cancel">Cancel</button>
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
    const LANG_KEY = 'imgnaondo_lang';
    const SESSION_DURATION = 24 * 60 * 60 * 1000;
    const SCROLL_THRESHOLD = 300;
     
    const i18n = {
        en: {
            title: "ImgNaondo",
            logout: "Logout",
            login_title: "Login",
            ph_password: "Enter access password",
            login_btn: "Login",
            upload_drag: "Click or Drag & Drop Images Here",
            upload_support: "Supports JPG, PNG, GIF, WebP, SVG, BMP",
            ph_custom_name: "Custom Name (optional)",
            ph_tags: "Tags (comma-separated)",
            select_files: "Select Files",
            tag_cloud: "🏷️ Tag Cloud",
            expand: "Expand",
            collapse: "Collapse",
            ph_search: "Search by name or tag...",
            bulk_select: "Bulk Select",
            delete_selected: "Delete Selected",
            select_all: "Select All",
            deselect: "Deselect",
            stat_total: "📊 Total:",
            stat_storage: "💾 Storage:",
            loading: "Loading...",
            no_more: "No more images.",
            no_images_found: "No images found.",
            edit_title: "Edit Image Info",
            lbl_custom_name: "Custom Name",
            lbl_tags: "Tags (comma-separated)",
            lbl_original: "Original Filename",
            save: "Save",
            cancel: "Cancel",
            copy: "Copy",
            edit: "Edit",
            del: "Del",
            sort_newest: "Newest First",
            sort_oldest: "Oldest First",
            sort_largest: "Largest First",
            sort_smallest: "Smallest First",
            sort_az: "Name A-Z",
            sort_za: "Name Z-A",
            toast_enter_pass: "Please enter the password",
            toast_incorrect: "Incorrect password",
            toast_login_fail: "Login failed: ",
            toast_error_load: "Error loading image library",
            toast_uploading: "Uploading {0} of {1}...",
            toast_uploaded: "Uploaded {0} images",
            confirm_del: "Delete this image?",
            confirm_batch: "Delete {0} images?",
            toast_deleted: "Deleted",
            toast_batch_success: "Batch delete successful",
            toast_batch_fail: "Batch delete failed",
            toast_saved: "Saved",
            toast_no_select: "No images selected",
            toast_copy_ok: "✓ Copied",
            toast_copy_fail: "✗ Copy failed",
            toast_login_first: "Please login first",
            msg_selected: "Selected: {0}",
            tag_no_tags: "No tags yet",
            toast_sync_start: "Sync started...",
            toast_sync_progress: "Syncing... {0} items processed",
            toast_sync_complete: "Sync complete! Migrated {0} items."
        },
        zh: {
            title: "ImgNaondo 图床",
            logout: "退出登录",
            login_title: "登录",
            ph_password: "输入访问密码",
            login_btn: "登录",
            upload_drag: "点击或拖拽图片至此",
            upload_support: "支持 JPG, PNG, GIF, WebP, SVG, BMP",
            ph_custom_name: "自定义名称（可选）",
            ph_tags: "标签（逗号分隔）",
            select_files: "选择文件",
            tag_cloud: "🏷️ 标签云",
            expand: "展开",
            collapse: "收起",
            ph_search: "按名称或标签搜索...",
            bulk_select: "批量选择",
            delete_selected: "删除选中",
            select_all: "全选",
            deselect: "取消选择",
            stat_total: "📊 总数:",
            stat_storage: "💾 占用:",
            loading: "加载中...",
            no_more: "没有更多图片了",
            no_images_found: "未找到图片",
            edit_title: "编辑图片信息",
            lbl_custom_name: "自定义名称",
            lbl_tags: "标签（逗号分隔）",
            lbl_original: "原始文件名",
            save: "保存",
            cancel: "取消",
            copy: "复制",
            edit: "编辑",
            del: "删除",
            sort_newest: "最新上传",
            sort_oldest: "最早上传",
            sort_largest: "体积最大",
            sort_smallest: "体积最小",
            sort_az: "名称 A-Z",
            sort_za: "名称 Z-A",
            toast_enter_pass: "请输入密码",
            toast_incorrect: "密码错误",
            toast_login_fail: "登录失败: ",
            toast_error_load: "加载图库失败",
            toast_uploading: "正在上传 {0} / {1}...",
            toast_uploaded: "已上传 {0} 张图片",
            confirm_del: "确定删除这张图片吗？",
            confirm_batch: "确定删除 {0} 张图片吗？",
            toast_deleted: "已删除",
            toast_batch_success: "批量删除成功",
            toast_batch_fail: "批量删除失败",
            toast_saved: "已保存",
            toast_no_select: "未选择图片",
            toast_copy_ok: "✓ 已复制",
            toast_copy_fail: "✗ 复制失败",
            toast_login_first: "请先登录",
            msg_selected: "已选: {0}",
            tag_no_tags: "暂无标签",
            toast_sync_start: "开始同步...",
            toast_sync_progress: "同步中... 已处理 {0} 项",
            toast_sync_complete: "同步完成！共迁移 {0} 项。"
        }
    };
     
    let password = '';
    let currentLibrary = []; // Now only stores current page
    
    let selectedImages = new Set();
    let selectMode = false;
    let currentEditKey = '';
    let activeTag = null;
    let tagCloudExpanded = false;
    let isLoadingLibrary = false;
    let lightboxIndex = -1;
    let currentLang = 'en';
    let allTags = [];
    
    let nextCursor = 0; 
    let hasMoreImages = true;

    function initLanguage() {
        const savedLang = localStorage.getItem(LANG_KEY);
        if (savedLang && i18n[savedLang]) {
            currentLang = savedLang;
        } else {
            const browserLang = navigator.language.split('-')[0];
            if (i18n[browserLang]) {
                currentLang = browserLang;
            } else {
                currentLang = 'en';
            }
        }
        document.getElementById('langSelect').value = currentLang;
        updateUIText();
    }

    function changeLanguage(lang) {
        if (!i18n[lang]) return;
        currentLang = lang;
        localStorage.setItem(LANG_KEY, lang);
        updateUIText();
        renderSortOptions();
        document.getElementById('gallery').innerHTML = '';
        renderAppendedBatch(currentLibrary);
        loadTags();
    }

    function t(key, ...args) {
        let str = (i18n[currentLang] && i18n[currentLang][key]) || i18n['en'][key] || key;
        args.forEach((arg, i) => {
            str = str.replace("{" + i + "}", arg);
        });
        return str;
    }

    function updateUIText() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        document.querySelectorAll('[data-placeholder]').forEach(el => {
            el.placeholder = t(el.getAttribute('data-placeholder'));
        });
        
        const tagBtn = document.querySelector('.tag-cloud-toggle');
        if (tagBtn) {
            tagBtn.textContent = tagCloudExpanded ? t('collapse') : t('expand');
        }
    }
     
    function renderSortOptions() {
        const select = document.getElementById('sortSelect');
        const currentVal = select.value || 'time-desc';
        select.innerHTML = '';
        const opts = [
            {v: 'time-desc', k: 'sort_newest'},
            {v: 'time-asc', k: 'sort_oldest'},
            {v: 'size-desc', k: 'sort_largest'},
            {v: 'size-asc', k: 'sort_smallest'},
            {v: 'name-asc', k: 'sort_az'},
            {v: 'name-desc', k: 'sort_za'}
        ];
        opts.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.v;
            opt.textContent = t(o.k);
            select.appendChild(opt);
        });
        select.value = currentVal;
    }

    function checkExistingLogin() {
      const storedPassword = localStorage.getItem(PASSWORD_KEY);
      const loginTime = localStorage.getItem(LOGIN_TIME_KEY);
      if (storedPassword && loginTime && (Date.now() - parseInt(loginTime) < SESSION_DURATION)) {
        password = storedPassword;
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('mainSection').classList.remove('hidden');
        document.getElementById('logoutButton').classList.remove('hidden');
        document.getElementById('syncBtn').classList.remove('hidden');
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

    async function performLogin() {
      const inputPassword = document.getElementById('passwordInput').value;
      if (!inputPassword) return showToast(t('toast_enter_pass'));
      try {
        const res = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Authorization': 'Bearer ' + inputPassword } });
        if (res.ok) {
          password = inputPassword;
          localStorage.setItem(PASSWORD_KEY, password);
          localStorage.setItem(LOGIN_TIME_KEY, Date.now());
          document.getElementById('loginSection').classList.add('hidden');
          document.getElementById('mainSection').classList.remove('hidden');
          document.getElementById('logoutButton').classList.remove('hidden');
          document.getElementById('syncBtn').classList.remove('hidden');
          loadData();
        } else {
          if (res.status === 429) {
             const err = await res.json();
             showToast(err.error);
          } else {
             try {
                 const err = await res.json();
                 if(err.error) showToast(err.error);
                 else showToast(t('toast_incorrect'));
             } catch(e) {
                 showToast(t('toast_incorrect'));
             }
          }
        }
      } catch (error) {
        showToast(t('toast_login_fail') + error.message);
      }
    }

    async function loadData() {
      resetAndLoad();
      loadStats();
      loadTags();
    }
    
    function resetAndLoad() {
        currentLibrary = [];
        nextCursor = 0;
        hasMoreImages = true;
        document.getElementById('gallery').innerHTML = '';
        document.getElementById('endMessage').classList.add('hidden');
        fetchNextPage();
    }
    
    async function startSync() {
        if(!confirm(t('toast_sync_start'))) return;
        
        const btn = document.getElementById('syncBtn');
        btn.disabled = true;
        
        let cursor = null;
        let total = 0;
        let isLooping = true;
        
        showToast(t('toast_sync_start'));
        
        try {
            while(isLooping) {
                const res = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + password },
                    body: JSON.stringify({ cursor })
                });
                
                if (!res.ok) throw new Error('Sync failed');
                
                const data = await res.json();
                total += data.migrated;
                showToast(t('toast_sync_progress', total));
                
                cursor = data.cursor;
                if (!cursor) isLooping = false;
            }
            showToast(t('toast_sync_complete', total));
            loadData(); 
        } catch (e) {
            showToast('Sync failed: ' + e.message);
        } finally {
            btn.disabled = false;
        }
    }

    async function fetchNextPage() {
      if (isLoadingLibrary || !hasMoreImages) return;
      isLoadingLibrary = true;
      showBottomLoader(true);
      
      try {
        const searchTerm = document.getElementById('searchInput').value.trim();
        const sortBy = document.getElementById('sortSelect').value;
        
        const qs = new URLSearchParams({ 
            limit: '50',
            sort: sortBy
        });
        
        if (nextCursor) qs.set('cursor', nextCursor);
        if (searchTerm) qs.set('search', searchTerm);
        if (activeTag) qs.set('tag', activeTag);
        
        const res = await fetch('/api/list?' + qs.toString(), {
          headers: { 'Authorization': 'Bearer ' + password }
        });
        
        if (!res.ok) throw new Error('Failed to fetch list');
        
        const data = await res.json();
        
        if (data.images.length === 0) {
            hasMoreImages = false;
            if (currentLibrary.length === 0) {
                 document.getElementById('gallery').innerHTML = '<div class="no-images">' + t('no_images_found') + '</div>';
            } else {
                 document.getElementById('endMessage').classList.remove('hidden');
            }
        } else {
            currentLibrary.push(...data.images);
            renderAppendedBatch(data.images);
            
            nextCursor = data.nextCursor;
            if (!nextCursor) {
                hasMoreImages = false;
                document.getElementById('endMessage').classList.remove('hidden');
            }
        }

      } catch (e) {
        console.error(e);
        showToast(t('toast_error_load'));
      } finally {
        isLoadingLibrary = false;
        showBottomLoader(false);
      }
    }

    function renderAppendedBatch(items) {
      const gallery = document.getElementById('gallery');
      if (items.length === 0) return;
      
      if(gallery.querySelector('.no-images')) gallery.innerHTML = '';

      const fragment = document.createDocumentFragment();
      
      items.forEach(function(img) {
        const card = document.createElement('div');
        card.className = 'image-card' + (selectedImages.has(img.key) ? ' selected' : '');
        card.setAttribute('data-key', img.key);
        
        const displayName = img.customName || img.originalName;
        const safeName = displayName.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const safeKey = img.key.replace(/"/g, '&quot;');
        
        // Tags HTML
        let tagsHtml = '';
        if (img.tags) {
            tagsHtml = img.tags.split(',').map(function(tag) { return '<span class="image-tag">' + tag.trim() + '</span>'; }).join('');
        }
        
        // Construct HTML using data attributes instead of inline handlers
        const parts = [];
        
        if (selectMode) {
            const checked = selectedImages.has(img.key) ? 'checked' : '';
            parts.push('<input type="checkbox" class="checkbox js-select" ' + checked + ' data-key="' + safeKey + '">');
        }
        
        parts.push('<img src="' + img.url + '" alt="' + safeName + '" loading="lazy" class="js-lightbox" data-key="' + safeKey + '">');
        
        parts.push('<div class="image-info">');
        parts.push('<div class="image-name" title="' + safeName + '">' + displayName + '</div>');
        parts.push('<div class="image-meta">' + formatSize(img.size) + ' • ' + new Date(img.uploadTime).toLocaleDateString() + '</div>');
        
        if (tagsHtml) {
            parts.push('<div class="image-tags">' + tagsHtml + '</div>');
        }
        
        parts.push('<div class="image-actions">');
        parts.push('<div class="copy-dropdown">');
        parts.push('<button class="js-copy-menu">' + t('copy') + ' ▾</button>');
        parts.push('<div class="copy-dropdown-menu">');
        parts.push('<button class="js-copy" data-key="' + safeKey + '" data-format="url">URL</button>');
        parts.push('<button class="js-copy" data-key="' + safeKey + '" data-format="html">HTML</button>');
        parts.push('<button class="js-copy" data-key="' + safeKey + '" data-format="md">Markdown</button>');
        parts.push('</div></div>');
        
        parts.push('<button class="js-edit" data-key="' + safeKey + '">' + t('edit') + '</button>');
        parts.push('<button class="btn-danger js-delete" data-key="' + safeKey + '">' + t('del') + '</button>');
        
        parts.push('</div></div>'); 
        
        card.innerHTML = parts.join('');
        fragment.appendChild(card);
      });
      
      gallery.appendChild(fragment);
    }

    window.addEventListener('scroll', () => {
      const scrollBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      if (scrollBottom < SCROLL_THRESHOLD) {
        fetchNextPage();
      }
    });

    function handleCopy(key, type) {
       const img = currentLibrary.find(i => i.key === key);
       if(img) {
         const url = img.url || location.origin + '/img/' + img.key;
         const alt = img.customName || img.originalName;
         copyInFormat(url, alt, type);
       }
       document.querySelectorAll('.copy-dropdown.open').forEach(el => el.classList.remove('open'));
    }

    async function loadStats() {
      try {
        const res = await fetch('/api/stats', { headers: { 'Authorization': 'Bearer ' + password } });
        if (res.ok) {
          const data = await res.json();
          document.getElementById('totalImages').textContent = data.totalImages;
          document.getElementById('totalSize').textContent = data.totalSizeMB + ' MB';
        }
      } catch (e) {}
    }
     
    async function loadTags() {
       const res = await fetch('/api/tags', {
          headers: { 'Authorization': 'Bearer ' + password }
       });
       if(res.ok) {
           const data = await res.json();
           allTags = data.tags;
           renderTagCloud();
       }
    }

    function renderTagCloud() {
      const container = document.getElementById('tagCloudContent');
      if (!allTags || allTags.length === 0) {
        container.innerHTML = '<div style="color: #999; text-align: center; padding: 20px 0;">' + t('tag_no_tags') + '</div>';
        return;
      }
      container.innerHTML = allTags.map(function(item) {
        var safeTag = item.tag.replace(/"/g, '&quot;');
        return '<div class="tag-item js-tag' + (activeTag === item.tag ? ' active' : '') + '" data-tag="' + safeTag + '">' + item.tag + '<span class="tag-count">' + item.count + '</span></div>';
      }).join('');
    }

    function filterByTag(tag) {
      if (activeTag === tag) { activeTag = null; } else { activeTag = tag; }
      renderTagCloud();
      resetAndLoad();
    }

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
          uploadProgress.textContent = t('toast_uploading', i + 1, files.length);
          const formData = new FormData();
          formData.append('file', file);
          if (customName) formData.append('customName', files.length > 1 ? customName + '_' + (i + 1) : customName);
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
             };
             if (!activeTag && !document.getElementById('searchInput').value) {
                 currentLibrary.unshift(newImage);
                 renderAppendedBatch([newImage]);
                 const gallery = document.getElementById('gallery');
                 if(gallery.lastElementChild) gallery.prepend(gallery.lastElementChild);
             }
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
          showToast(t('toast_uploaded', successCount));
          loadTags();
          loadStats();
          if(successCount > 1) resetAndLoad();
      }
    }

    async function deleteImage(key) {
      if (!confirm(t('confirm_del'))) return;
      try {
        const res = await fetch('/api/delete/' + key, {
          method: 'DELETE', headers: { 'Authorization': 'Bearer ' + password }
        });
        if (res.ok) {
          currentLibrary = currentLibrary.filter(i => i.key !== key);
          selectedImages.delete(key);
          showToast(t('toast_deleted'));
          
          document.getElementById('gallery').innerHTML = '';
          renderAppendedBatch(currentLibrary);
          
          loadTags();
          loadStats();
        }
      } catch (e) { showToast(e.message); }
    }
     
    function updateSelectionCount() {
        document.getElementById('selectedCount').textContent = t('msg_selected', selectedImages.size);
    }

    async function batchDelete() {
        if (!selectMode || selectedImages.size === 0) return showToast(t('toast_no_select'));
        if (!confirm(t('confirm_batch', selectedImages.size))) return;
        
        const keys = Array.from(selectedImages);
        try {
            const res = await fetch('/api/batch-delete', {
                method: 'POST',
                headers: {'Authorization': 'Bearer ' + password, 'Content-Type': 'application/json'},
                body: JSON.stringify({ filenames: keys })
            });
            if(res.ok) {
                const delSet = new Set(keys);
                currentLibrary = currentLibrary.filter(i => !delSet.has(i.key));
                selectedImages.clear();
                updateSelectionCount();
                showToast(t('toast_batch_success'));
                
                document.getElementById('gallery').innerHTML = '';
                renderAppendedBatch(currentLibrary);
                
                loadTags();
                loadStats();
            }
        } catch(e) { showToast(t('toast_batch_fail')); }
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
           const item = currentLibrary.find(i => i.key === currentEditKey);
           if (item) {
               item.customName = customName;
               item.tags = tags;
           }
           closeEditModal();
           showToast(t('toast_saved'));
           
           document.getElementById('gallery').innerHTML = '';
           renderAppendedBatch(currentLibrary);
           
           loadTags();
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
        updateSelectionCount();
      } else {
        document.getElementById('bulkActions').classList.add('show');
      }
      document.getElementById('gallery').innerHTML = '';
      renderAppendedBatch(currentLibrary);
    }

    function toggleSelect(key) {
      if (selectedImages.has(key)) selectedImages.delete(key); else selectedImages.add(key);
      updateSelectionCount();
    }
     
    function selectAll() {
      currentLibrary.forEach(img => selectedImages.add(img.key));
      updateSelectionCount();
      const gallery = document.getElementById('gallery');
      Array.from(gallery.querySelectorAll('.image-card')).forEach(card => card.classList.add('selected'));
      Array.from(gallery.querySelectorAll('.checkbox')).forEach(cb => cb.checked = true);
    }
     
    function deselectAll() {
      selectedImages.clear();
      updateSelectionCount();
      const gallery = document.getElementById('gallery');
      Array.from(gallery.querySelectorAll('.image-card')).forEach(card => card.classList.remove('selected'));
      Array.from(gallery.querySelectorAll('.checkbox')).forEach(cb => cb.checked = false);
    }

    function openEdit(key) {
      const img = currentLibrary.find(i => i.key === key);
      if (!img) return;
      currentEditKey = key;
      document.getElementById('editCustomName').value = img.customName || '';
      document.getElementById('editTags').value = img.tags || '';
      document.getElementById('editOriginalName').value = img.originalName;
      document.getElementById('editModal').classList.add('show');
    }
    function closeEditModal() { document.getElementById('editModal').classList.remove('show'); }
     
    function openLightbox(key) {
      lightboxIndex = currentLibrary.findIndex(i => i.key === key);
      if (lightboxIndex < 0) return;
      updateLightbox();
      document.getElementById('lightbox').classList.add('show');
    }
    function updateLightbox() {
      const img = currentLibrary[lightboxIndex];
      if (!img) return;
      const el = document.getElementById('lightboxImg');
      el.src = img.url || location.origin + '/img/' + img.key;
      el.alt = img.customName || img.originalName;
    }
    function prevImage(e) { e && e.stopPropagation(); if (lightboxIndex > 0) { lightboxIndex--; updateLightbox(); } }
    function nextImage(e) { e && e.stopPropagation(); if (lightboxIndex < currentLibrary.length - 1) { lightboxIndex++; updateLightbox(); } }
    function closeLightbox() { document.getElementById('lightbox').classList.remove('show'); }

    function toggleTagCloud() {
      tagCloudExpanded = !tagCloudExpanded;
      const content = document.getElementById('tagCloudContent');
      const btn = document.querySelector('.tag-cloud-toggle');
      if (tagCloudExpanded) { content.classList.add('expanded'); btn.textContent = t('collapse'); } 
      else { content.classList.remove('expanded'); btn.textContent = t('expand'); }
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
        case 'html': return '<img src="' + url + '" alt="' + alt + '">';
        case 'md': return '![' + alt + '](' + url + ')';
        default: return url;
      }
    }
    async function copyInFormat(url, alt, fmt) {
      try { await attemptCopy(buildCopyText(url, alt, fmt)); showToast(t('toast_copy_ok')); }
      catch (e) { showToast(t('toast_copy_fail')); }
    }
     
    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Event delegation for gallery actions
    document.addEventListener('click', function(e) {
      // Close copy dropdowns
      if (!e.target.closest('.copy-dropdown')) {
        document.querySelectorAll('.copy-dropdown.open').forEach(function(el) {
          el.classList.remove('open');
        });
      }
      
      var target = e.target;
      
      // Handle checkbox selection
      if (target.classList.contains('js-select')) {
        var key = target.getAttribute('data-key');
        toggleSelect(key);
        var card = target.closest('.image-card');
        if (card) {
          if (target.checked) card.classList.add('selected');
          else card.classList.remove('selected');
        }
        return;
      }
      
      // Handle lightbox open
      if (target.classList.contains('js-lightbox')) {
        var key = target.getAttribute('data-key');
        openLightbox(key);
        return;
      }
      
      // Handle copy menu toggle
      if (target.classList.contains('js-copy-menu')) {
        e.stopPropagation();
        var wrap = target.closest('.copy-dropdown');
        document.querySelectorAll('.copy-dropdown.open').forEach(function(el) { 
          if (el !== wrap) el.classList.remove('open'); 
        });
        wrap.classList.toggle('open');
        return;
      }
      
      // Handle copy action
      if (target.classList.contains('js-copy')) {
        e.stopPropagation();
        var key = target.getAttribute('data-key');
        var format = target.getAttribute('data-format');
        handleCopy(key, format);
        return;
      }
      
      // Handle edit
      if (target.classList.contains('js-edit')) {
        var key = target.getAttribute('data-key');
        openEdit(key);
        return;
      }
      
      // Handle delete
      if (target.classList.contains('js-delete')) {
        var key = target.getAttribute('data-key');
        deleteImage(key);
        return;
      }
      
      // Handle tag filter
      if (target.classList.contains('js-tag') || target.closest('.js-tag')) {
        var tagEl = target.classList.contains('js-tag') ? target : target.closest('.js-tag');
        var tag = tagEl.getAttribute('data-tag');
        filterByTag(tag);
        return;
      }
      
      // Handle lightbox close
      if (target.id === 'lightbox') {
        closeLightbox();
        return;
      }
      
      // Handle edit modal close  
      if (target.id === 'editModal') {
        closeEditModal();
        return;
      }
    });
     
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(resetAndLoad, 300);
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
          files.push(new File([blob], 'pasted_' + Date.now() + '.' + ext, { type: blob.type }));
        }
      }
      if (files.length && password) uploadFiles(files);
      else if (files.length) showToast(t('toast_login_first'));
    });

    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragging'); });
    uploadArea.addEventListener('dragleave', (e) => { if (e.target === uploadArea) uploadArea.classList.remove('dragging'); });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault(); uploadArea.classList.remove('dragging');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) uploadFiles(files);
    });

    // Expose functions to global scope for inline event handlers
    window.performLogin = performLogin;
    window.logout = logout;
    window.changeLanguage = changeLanguage;
    window.handleFileSelect = function(files) { if (files.length > 0) uploadFiles(Array.from(files)); };
    window.toggleTagCloud = toggleTagCloud;
    window.resetAndLoad = resetAndLoad;
    window.toggleSelectMode = toggleSelectMode;
    window.batchDelete = batchDelete;
    window.selectAll = selectAll;
    window.deselectAll = deselectAll;
    window.saveEdit = saveEdit;
    window.closeEditModal = closeEditModal;
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
    window.prevImage = prevImage;
    window.nextImage = nextImage;
    window.toggleCopyMenu = toggleCopyMenu;
    window.handleCopy = handleCopy;
    window.openEdit = openEdit;
    window.deleteImage = deleteImage;
    window.startSync = startSync;
    window.filterByTag = filterByTag;
    window.toggleSelect = toggleSelect;

    document.addEventListener('DOMContentLoaded', () => {
      initLanguage();
      checkExistingLogin();
      document.getElementById('currentYear').textContent = new Date().getFullYear();
    });
  </script>
</body>
</html>`
}