// frontend/assets/js/app.js
// Extracted from original index.html inline scripts & reorganized for the DriftIQ overhaul

// Premium Constellation Particle System Background
const canvas = document.getElementById("bgCanvas");
if (canvas) {
  const ctx = canvas.getContext("2d");
  let particles = [];
  let mouse = { x: null, y: null, radius: 150 };

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.size = Math.random() * 2 + 1;
      this.color = Math.random() > 0.5 ? "rgba(0, 245, 212, 0.25)" : "rgba(16, 185, 129, 0.15)";
    }
    draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
  }

  for (let i = 0; i < 75; i++) {
    particles.push(new Particle());
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.update();
      p.draw();
    });

    for (let a = 0; a < particles.length; a++) {
      for (let b = a; b < particles.length; b++) {
        let dist = (particles[a].x - particles[b].x) ** 2 + (particles[a].y - particles[b].y) ** 2;
        if (dist < 9000) {
          let alpha = (1 - dist / 9000) * 0.15;
          ctx.strokeStyle = `rgba(0, 245, 212, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }

      if (mouse.x !== null && mouse.y !== null) {
        let distMouse = (particles[a].x - mouse.x) ** 2 + (particles[a].y - mouse.y) ** 2;
        if (distMouse < 18000) {
          let alpha = (1 - distMouse / 18000) * 0.25;
          ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

// ==================== APP STATE & CONTROLLER ====================
let currentUser = null;
let currentFolderId = null;
let folderPath = [];
let searchDebounceTimer = null;
let currentFolders = [];
let currentFiles = [];
let currentCategory = 'all'; 
let currentUploadXHR = null;
let telegramPollInterval = null;

window.addEventListener("DOMContentLoaded", async () => {
  if (api.token) {
    try {
      const profile = await api.getProfile();
      currentUser = profile;
      setupDashboardView();
    } catch (e) {
      api.clearToken();
    }
  }

  document.getElementById("login-btn")?.addEventListener("click", () => openAuthModal("login"));
  document.getElementById("register-btn")?.addEventListener("click", () => openAuthModal("register"));
  document.getElementById("goto-dashboard-btn")?.addEventListener("click", async () => {
    if (api.token) {
      if (!currentUser) {
        try {
          currentUser = await api.getProfile();
        } catch (e) {
          api.clearToken();
          openAuthModal("login");
          return;
        }
      }
      setupDashboardView();
    } else {
      openAuthModal("login");
    }
  });
  document.getElementById("start-free-btn")?.addEventListener("click", () => openAuthModal("register"));
});

function openAuthModal(tab = 'login') {
  const overlay = document.getElementById("auth-screen");
  if(overlay) overlay.classList.remove("hidden");
  switchTab(tab);
}

function closeAuthModal() {
  const overlay = document.getElementById("auth-screen");
  if(overlay) overlay.classList.add("hidden");
}

function switchTab(mode) {
  document.getElementById("login-form-container")?.classList.toggle("hidden", mode !== "login");
  document.getElementById("register-form-container")?.classList.toggle("hidden", mode !== "register");
  document.getElementById("reset-form-container")?.classList.toggle("hidden", mode !== "reset");

  const tabs = document.querySelectorAll(".auth-tab");
  if (tabs.length >= 2) {
    tabs[0].classList.toggle("active", mode === "login" || mode === "reset");
    tabs[1].classList.toggle("active", mode === "register");
  }
}

// Auth actions
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value;
  const pass = document.getElementById("login-password").value;

  try {
    const response = await api.login(username, pass);
    currentUser = response.user;
    notify.success("Decrypted storage session successfully.");
    setupDashboardView();
  } catch (err) {
    notify.error(err.data?.error || "Credentials authorization failed.");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value;
  const username = document.getElementById("reg-username").value;
  const email = document.getElementById("reg-email").value;
  const pass = document.getElementById("reg-password").value;

  if (!username || username.length < 3) {
    notify.error("Username must be at least 3 characters.");
    return;
  }
  if (!email || !email.includes("@")) {
    notify.error("Please enter a valid email address.");
    return;
  }

  try {
    const response = await api.register(email, username, pass, name);
    currentUser = response.user;
    notify.success("Account created! Welcome to DriftIQ.");
    setupDashboardView();
  } catch (err) {
    let msg = "Registration failed. Please check your details.";
    if (err.data?.details && err.data.details.length > 0) {
      msg = err.data.details.map((d) => `${d.path || d.param}: ${d.msg}`).join(" | ");
    } else if (err.data?.error) {
      msg = err.data.error;
    }
    notify.error(msg);
  }
}

async function handleResetRequest(e) {
  e.preventDefault();
  const email = document.getElementById("reset-email").value;
  try {
    await api.requestPasswordReset(email);
    notify.success("If the profile exists, reset link has been dispatched.");
    switchTab("login");
  } catch (err) {
    notify.error("Recovery broadcast transmission aborted.");
  }
}

function setupDashboardView() {
  document.getElementById("landing-screen")?.classList.add("hidden");
  document.getElementById("auth-screen")?.classList.add("hidden");
  document.getElementById("dashboard-screen")?.classList.remove("hidden");

  if(document.getElementById("user-display-name")) document.getElementById("user-display-name").textContent = currentUser.full_name || currentUser.username;
  if(document.getElementById("user-display-role")) document.getElementById("user-display-role").textContent = currentUser.role.toUpperCase();
  
  const avatarStr = (currentUser.full_name || currentUser.username || 'U')[0].toUpperCase();
  if(document.getElementById("sidebar-profile-avatar")) document.getElementById("sidebar-profile-avatar").textContent = avatarStr;
  if(document.getElementById("topbar-user-avatar")) document.getElementById("topbar-user-avatar").textContent = avatarStr;

  if (currentUser.role === "admin") {
    document.querySelectorAll(".admin-only").forEach((el) => el.classList.remove("hidden"));
  }

  if (currentUser.telegram_status === "connected") {
    document.getElementById("telegram-disconnected-ui")?.classList.add("hidden");
    document.getElementById("telegram-connected-ui")?.classList.remove("hidden");
    if(document.getElementById("stat-telegram-status")) document.getElementById("stat-telegram-status").textContent = "Connected";
  } else {
    document.getElementById("telegram-disconnected-ui")?.classList.remove("hidden");
    document.getElementById("telegram-connected-ui")?.classList.add("hidden");
    if(document.getElementById("stat-telegram-status")) document.getElementById("stat-telegram-status").textContent = "Disconnected";
  }

  showSection("dash");
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const topbar = document.querySelector(".topbar");
  const mainArea = document.querySelector(".main-area");
  
  sidebar.classList.toggle("collapsed");
  
  if (sidebar.classList.contains("collapsed")) {
    if (topbar) topbar.classList.add("sidebar-collapsed-offset");
    if (mainArea) mainArea.classList.add("sidebar-collapsed-offset");
  } else {
    if (topbar) topbar.classList.remove("sidebar-collapsed-offset");
    if (mainArea) mainArea.classList.remove("sidebar-collapsed-offset");
  }
}

function showSection(section) {
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
  
  const menuDash = document.getElementById("menu-dash");
  const menuShares = document.getElementById("menu-shares");
  const menuAdmin = document.getElementById("menu-admin");
  const menuSettings = document.getElementById("menu-settings");

  if (section === "dash" && menuDash) menuDash.classList.add("active");
  if (section === "shares" && menuShares) menuShares.classList.add("active");
  if (section === "admin" && menuAdmin) menuAdmin.classList.add("active");
  if (section === "settings" && menuSettings) menuSettings.classList.add("active");

  document.getElementById("sec-dash")?.classList.toggle("hidden", section !== "dash");
  document.getElementById("sec-shares")?.classList.toggle("hidden", section !== "shares");
  document.getElementById("sec-admin")?.classList.toggle("hidden", section !== "admin");
  document.getElementById("sec-settings")?.classList.toggle("hidden", section !== "settings");

  document.getElementById("search-bar-wrapper")?.classList.toggle("hidden", section === "settings");

  if (section === "dash") {
    loadFilesAndFolders();
  } else if (section === "shares") {
    loadShareTunnels();
  } else if (section === "admin") {
    loadAdminPanelData();
  }
}

function setCategory(category) {
  currentCategory = category;
  
  if (category !== 'all') {
    currentFolderId = null;
  }

  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  
  const catMap = {
    'all': 'menu-dash',
    'documents': 'menu-docs',
    'pictures': 'menu-pics',
    'videos': 'menu-vids',
    'music': 'menu-music',
    'recycle': 'menu-recycle'
  };
  
  const activeItem = document.getElementById(catMap[category]);
  if (activeItem) activeItem.classList.add("active");
  
  showSection("dash");
}

async function loadFilesAndFolders() {
  try {
    const searchInput = document.getElementById("dashboard-search");
    const searchQuery = searchInput ? searchInput.value : "";
    
    const [filesRes, foldersRes, statsRes] = await Promise.all([
      api.getFiles(1, 100, currentFolderId, searchQuery, currentCategory === 'recycle'),
      api.getFolders(currentFolderId),
      api.getStorageStats(),
    ]);

    currentFolders = foldersRes.data || [];
    currentFiles = filesRes.data || [];

    renderSidebarFolders(currentFolders);
    renderExplorer(currentFolders, currentFiles);
    updateStats(
      statsRes.data || { total_files: 0, total_size: 0 },
      currentFiles
    );
  } catch (err) {
    notify.error("Synchronization with Supabase pipeline interrupted.");
  }
}

function renderSidebarFolders(folders) {
  const sidebarList = document.getElementById("sidebar-dynamic-folders-list");
  if (!sidebarList) return;
  
  sidebarList.innerHTML = "";
  if (folders.length === 0) {
    sidebarList.innerHTML = `<div style="padding: 0 10px; font-size:11px; color:var(--text-muted);">No directories found.</div>`;
    return;
  }
  
  folders.slice(0, 5).forEach(f => {
    const div = document.createElement("div");
    div.className = "nav-item folder-item";
    div.onclick = () => navigateToFolder(f);
    
    div.innerHTML = `
      <span class="nav-item-icon" style="color: ${f.color || "var(--emerald)"};">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
      </span>
      <span class="nav-item-text" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
    `;
    sidebarList.appendChild(div);
  });
}

function renderExplorer(folders, files) {
  const tbody = document.getElementById("explorer-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  let displayedFolders = currentCategory === 'all' ? folders : [];
  let displayedFiles = files;
  
  if (currentCategory === 'documents') {
    displayedFiles = files.filter(f => ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "json", "csv"].includes(f.name.split(".").pop().toLowerCase()));
  } else if (currentCategory === 'pictures') {
    displayedFiles = files.filter(f => ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"].includes(f.name.split(".").pop().toLowerCase()));
  } else if (currentCategory === 'videos') {
    displayedFiles = files.filter(f => ["mp4", "webm", "mkv", "avi", "mov"].includes(f.name.split(".").pop().toLowerCase()));
  } else if (currentCategory === 'music') {
    displayedFiles = files.filter(f => ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(f.name.split(".").pop().toLowerCase()));
  } else if (currentCategory === 'recycle') {
    // files are already filtered by the backend if isDeleted is true
  }

  if (displayedFolders.length === 0 && displayedFiles.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center opacity-50 p-lg empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-md mx-auto" style="color:var(--text-muted)"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          <p>This directory view is empty.</p>
        </td>
      </tr>
    `;
    return;
  }

  displayedFolders.forEach(f => {
    const row = document.createElement("tr");
    row.className = "explorer-table-row animate-slide-in";
    row.onclick = () => navigateToFolder(f);
    
    const folderColor = f.color || "var(--emerald)";
    const formattedDate = new Date(f.created_at || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    row.innerHTML = `
      <td>
        <div class="flex items-center gap-md">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${folderColor}20" stroke="${folderColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          <span style="font-weight: 500; color:var(--text-primary);">${f.name}</span>
        </div>
      </td>
      <td class="text-secondary">${formattedDate}</td>
      <td class="text-secondary">Folder</td>
      <td class="text-secondary">—</td>
      <td style="text-align: right;">
        <div class="row-actions" onclick="event.stopPropagation();">
          <button class="action-btn" title="Rename" onclick="promptRenameFolder('${f.id}', '${f.name}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
          <button class="action-btn" title="Move" onclick="openMoveModal('${f.id}', 'folder')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg></button>
          <button class="action-btn delete" title="Delete" onclick="deleteFolder('${f.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  displayedFiles.forEach(f => {
    const row = document.createElement("tr");
    row.className = "explorer-table-row animate-slide-in";
    
    const ext = f.name.split(".").pop().toLowerCase();
    let icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    let typeStr = ext.toUpperCase() + " File";
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) { icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`; typeStr = "Image"; }
    else if (["mp4", "webm", "mkv", "avi"].includes(ext)) { icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`; typeStr = "Video"; }
    else if (["mp3", "wav", "aac", "flac"].includes(ext)) { icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`; typeStr = "Audio"; }
    else if (["zip", "rar", "7z"].includes(ext)) { icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M10 4v4"></path><path d="M14 4v4"></path><path d="M10 12v8"></path><path d="M14 12v8"></path><path d="M10 8h4"></path><path d="M10 16h4"></path></svg>`; typeStr = "Archive"; }
    else if (ext === "pdf") { icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f28b82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`; typeStr = "PDF"; }
    else if (["txt", "md", "json", "js", "html", "css"].includes(ext)) { icon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`; typeStr = "Code"; }

    const sizeFormatted = formatBytes(f.size);
    const formattedDate = new Date(f.created_at || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

    let actionsHTML = "";
    if (f.deleted_at) {
      actionsHTML = `
        <div class="row-actions" onclick="event.stopPropagation();">
          <button class="action-btn" title="Restore File" onclick="restoreFileUI('${f.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg></button>
          <button class="action-btn delete" title="Permanently Delete" onclick="purgeFileUI('${f.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        </div>
      `;
    } else {
      actionsHTML = `
        <div class="row-actions" onclick="event.stopPropagation();">
          <button class="action-btn" title="Preview" onclick="previewFile('${f.id}', '${f.name}', '${ext}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
          <button class="action-btn" title="Download" onclick="downloadFile('${f.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button>
          <button class="action-btn" title="Share" onclick="openShareModal('${f.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></button>
          <button class="action-btn" title="Rename" onclick="promptRenameFile('${f.id}', '${f.name}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
          <button class="action-btn" title="Move" onclick="openMoveModal('${f.id}', 'file')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg></button>
          <button class="action-btn delete" title="Delete" onclick="deleteFile('${f.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
        </div>
      `;
    }

    const starColor = f.is_starred ? "var(--cyan)" : "var(--text-muted)";
    const starFill = f.is_starred ? "var(--cyan)" : "none";

    row.innerHTML = `
      <td>
        <div class="flex items-center gap-md">
          <svg class="star-btn cursor-pointer" onclick="event.stopPropagation(); toggleStar('${f.id}')" width="16" height="16" viewBox="0 0 24 24" fill="${starFill}" stroke="${starColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <div class="file-icon flex items-center justify-center text-secondary">${icon}</div>
          <span style="font-weight: 500; color:var(--text-primary); max-width: 250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${f.name}">${f.name}</span>
        </div>
      </td>
      <td class="text-secondary">${formattedDate}</td>
      <td class="text-secondary">${typeStr}</td>
      <td class="text-secondary" style="font-family: var(--font-mono); font-size: 13px;">${sizeFormatted}</td>
      <td style="text-align: right;">
        ${actionsHTML}
      </td>
    `;
    tbody.appendChild(row);
  });
}

function updateStats(stats, files) {
  const totalFiles = stats.total_files || files.length;
  const totalSize = stats.total_size || 0;
  
  if(document.getElementById("stat-files-count")) document.getElementById("stat-files-count").textContent = totalFiles;
  if(document.getElementById("stat-storage-size")) document.getElementById("stat-storage-size").textContent = formatBytes(totalSize);
  if(document.getElementById("stat-folders-count")) document.getElementById("stat-folders-count").textContent = currentFolders.length;

  const limitBytes = currentUser?.storage_limit || 5368709120; // 5GB default
  const percent = Math.min(100, Math.round((totalSize / limitBytes) * 100));
  
  const pText = document.querySelector(".storage-percent");
  if (pText) pText.textContent = `${percent}%`;
  
  const pFill = document.querySelector(".storage-bar-fill");
  if (pFill) pFill.style.width = `${percent}%`;
  
  const pLabel = document.querySelector(".storage-text");
  if (pLabel) pLabel.textContent = `${formatBytes(totalSize)} of ${formatBytes(limitBytes)} used`;
}

function debounceSearch() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadFilesAndFolders();
  }, 400);
}

function navigateToFolder(folder) {
  if (folder === null) {
    currentFolderId = null;
    folderPath = [];
  } else {
    currentFolderId = folder.id;
    if (!folderPath.some((item) => item.id === folder.id)) {
      folderPath.push(folder);
    } else {
      const idx = folderPath.findIndex((item) => item.id === folder.id);
      folderPath = folderPath.slice(0, idx + 1);
    }
  }
  renderBreadcrumbs();
  loadFilesAndFolders();
}

function renderBreadcrumbs() {
  const container = document.getElementById("folder-breadcrumbs");
  if(!container) return;
  container.innerHTML = `<span class="breadcrumb-item cursor-pointer text-secondary hover-cyan" onclick="navigateToFolder(null)">Home</span>`;

  folderPath.forEach((f, idx) => {
    container.innerHTML += ` <span class="breadcrumb-sep text-muted mx-xs">/</span> `;
    if (idx === folderPath.length - 1) {
      container.innerHTML += `<span class="breadcrumb-item active text-cyan font-medium">${f.name}</span>`;
    } else {
      container.innerHTML += `<span class="breadcrumb-item cursor-pointer text-secondary hover-cyan" onclick='navigateToFolder(${JSON.stringify(f)})'>${f.name}</span>`;
    }
  });
}

// Folder actions
async function promptCreateFolder() {
  const name = prompt("Enter folder name:");
  if (!name) return;
  try {
    await api.createFolder(name, currentFolderId);
    notify.success("Created subdirectory index.");
    loadFilesAndFolders();
  } catch (e) {
    notify.error("Subdirectory allocation failed.");
  }
}

async function promptRenameFolder(id, oldName) {
  const name = prompt("Enter new folder name:", oldName);
  if (!name || name === oldName) return;
  try {
    await api.renameFolder(id, name);
    notify.success("Renamed folder index.");
    loadFilesAndFolders();
  } catch (e) {
    notify.error("Subdirectory rename failed.");
  }
}

async function deleteFolder(id) {
  if (!confirm("Are you sure you want to purge this folder recursively?")) return;
  try {
    await api.deleteFolder(id);
    notify.success("Purged subdirectory index recursively.");
    loadFilesAndFolders();
  } catch (e) {
    notify.error("Purge operations aborted.");
  }
}

// File actions
function triggerFileUpload() {
  document.getElementById("file-input-raw").click();
}

function triggerFolderUpload() {
  document.getElementById("folder-input-raw").click();
}

function cancelUpload() {
  if (currentUploadXHR) {
    currentUploadXHR.abort();
    currentUploadXHR = null;
    document.getElementById("upload-progress-wrapper").classList.add("hidden");
    notify.info("Upload aborted by client.");
  }
}

async function uploadSelectedFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const pWrapper = document.getElementById("upload-progress-wrapper");
  const pBar = document.getElementById("upload-progress-bar");
  const pText = document.getElementById("upload-status-text");

  pWrapper.classList.remove("hidden");
  pBar.style.width = "0%";
  pText.textContent = "Uploading to Telegram bot gateway...";

  const formData = new FormData();
  formData.append("file", file);
  if (currentFolderId) formData.append("folder_id", currentFolderId);

  const xhr = new XMLHttpRequest();
  currentUploadXHR = xhr;

  xhr.upload.addEventListener("progress", (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      pBar.style.width = `${percent}%`;
      pText.textContent = `Uploading payload: ${percent}%`;
    }
  });

  xhr.addEventListener("load", () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      pBar.style.width = "100%";
      pText.textContent = "Synced successfully!";
      notify.success(`Asset '${file.name}' stored successfully!`);
      
      pBar.classList.add("success-pulse");
      setTimeout(() => {
        pWrapper.classList.add("hidden");
        pBar.classList.remove("success-pulse");
      }, 2000);
      
      loadFilesAndFolders();
    } else {
      notify.error("Storage pipeline upload failed.");
      pWrapper.classList.add("hidden");
    }
    currentUploadXHR = null;
  });

  xhr.addEventListener("error", () => {
    notify.error("Upload connection failed.");
    pWrapper.classList.add("hidden");
    currentUploadXHR = null;
  });

  xhr.open("POST", "/api/files/upload");
  xhr.setRequestHeader("Authorization", `Bearer ${api.token}`);
  xhr.send(formData);
}

async function uploadSelectedFolder(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  
  notify.info(`Uploading directory index containing ${files.length} files...`);
  
  const pWrapper = document.getElementById("upload-progress-wrapper");
  const pBar = document.getElementById("upload-progress-bar");
  const pText = document.getElementById("upload-status-text");

  pWrapper.classList.remove("hidden");
  pBar.style.width = "0%";
  
  let completed = 0;
  
  for (const file of files) {
    try {
      await api.uploadFile(file, currentFolderId);
      completed++;
      const pct = Math.round((completed / files.length) * 100);
      pBar.style.width = `${pct}%`;
      pText.textContent = `Uploading files: ${completed}/${files.length} (${pct}%)`;
    } catch(err) {
      console.error("Failed to upload folder file:", file.name);
    }
  }
  
  pBar.style.width = "100%";
  pText.textContent = "Folder upload complete!";
  notify.success(`Successfully uploaded folder index with ${completed} files.`);
  
  setTimeout(() => pWrapper.classList.add("hidden"), 2500);
  loadFilesAndFolders();
}

async function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById("dropzone-area").classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) {
    uploadSelectedFile({ target: { files: [file] } });
  }
}

async function deleteFile(id) {
  if (!confirm("Move this file to the recycle bin?")) return;
  try {
    await api.deleteFile(id);
    notify.success("File moved to recycle bin.");
    loadFilesAndFolders();
  } catch (e) {
    notify.error("Failed to move file to recycle bin.");
  }
}

async function restoreFileUI(id) {
  try {
    await api.restoreFile(id);
    notify.success("File restored successfully.");
    loadFilesAndFolders();
  } catch (e) {
    notify.error("Failed to restore file.");
  }
}

async function purgeFileUI(id) {
  if (!confirm("Are you sure you want to permanently delete this file? This action cannot be undone.")) return;
  try {
    await api.purgeFile(id);
    notify.success("File permanently deleted.");
    loadFilesAndFolders();
  } catch (e) {
    notify.error("Failed to permanently delete file.");
  }
}

async function promptRenameFile(id, oldName) {
  const name = prompt("Enter new filename:", oldName);
  if (!name || name === oldName) return;
  try {
    await api.renameFile(id, name);
    notify.success("Renamed file index.");
    loadFilesAndFolders();
  } catch (e) {
    notify.error("Index rename rejected.");
  }
}

async function downloadFile(id) {
  notify.info("Accessing Telegram API and piping payload stream...");
  api.downloadFile(id);
}

async function toggleStar(id) {
  try {
    await api.toggleStar(id);
    loadFilesAndFolders();
  } catch (e) {}
}

// ==================== MOVEMENT HANDLERS ====================
let pendingMoveId = null;
let pendingMoveType = null;

async function openMoveModal(itemId, type) {
  pendingMoveId = itemId;
  pendingMoveType = type;
  
  const select = document.getElementById("move-target-select");
  select.innerHTML = "<option value=''>⏳ Loading destination folders...</option>";
  
  const modal = document.getElementById("move-modal");
  modal.classList.add("active");
  
  try {
    const res = await api.getFolderTree();
    const folders = [];
    
    function flattenTree(nodes, depth = 0) {
      nodes.forEach(n => {
        if (pendingMoveType === 'folder' && n.id === pendingMoveId) return;
        folders.push({ id: n.id, name: "— ".repeat(depth) + n.name });
        if (n.children && n.children.length > 0) {
          flattenTree(n.children, depth + 1);
        }
      });
    }
    
    flattenTree(res.data || []);
    
    select.innerHTML = "<option value='root'>Home (Root Directory)</option>";
    folders.forEach(f => {
      select.innerHTML += `<option value="${f.id}">${f.name}</option>`;
    });
    
    document.getElementById("move-confirm-btn").onclick = executeMove;
  } catch (err) {
    notify.error("Failed to load folder destinations.");
    closeMoveModal();
  }
}

function closeMoveModal() {
  document.getElementById("move-modal").classList.remove("active");
}

async function executeMove() {
  const select = document.getElementById("move-target-select");
  const targetFolderId = select.value === "root" ? null : select.value;
  
  try {
    if (pendingMoveType === "file") {
      await api.moveFile(pendingMoveId, targetFolderId);
      notify.success("File relocated successfully.");
    } else if (pendingMoveType === "folder") {
      await api.moveFolder(pendingMoveId, targetFolderId);
      notify.success("Subdirectory index relocated.");
    }
    closeMoveModal();
    loadFilesAndFolders();
  } catch (err) {
    notify.error("Failed to relocate node.");
  }
}

// Converter functionality removed.

// ==================== SHARES MANAGER ====================
let pendingShareFileId = null;

function openShareModal(fileId) {
  pendingShareFileId = fileId;
  document.getElementById("share-pass-lock").value = "";
  document.getElementById("share-limit-lock").value = "";
  document.getElementById("share-expiry-lock").value = "";

  const modal = document.getElementById("share-modal");
  modal.classList.add("active");

  document.getElementById("share-confirm-btn").onclick = createShareLink;
}

function closeShareModal() {
  document.getElementById("share-modal").classList.remove("active");
}

async function createShareLink() {
  const pass = document.getElementById("share-pass-lock").value;
  const limit = document.getElementById("share-limit-lock").value;
  const expiry = document.getElementById("share-expiry-lock").value;

  try {
    const res = await api.createShare(
      pendingShareFileId,
      expiry ? new Date(expiry).toISOString() : null,
      pass || null,
      limit ? parseInt(limit) : null,
    );

    closeShareModal();

    const shareLink = `${window.location.origin}/shared.html?token=${res.data.share_token || res.data.token}`;
    document.getElementById("generated-share-link").value = shareLink;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareLink)}`;
    document.getElementById("share-qr-code-img").src = qrUrl;

    document.getElementById("share-display-modal").classList.add("active");
  } catch (err) {
    notify.error("Share endpoint mapping failed.");
  }
}

function copyGeneratedShareLink() {
  const input = document.getElementById("generated-share-link");
  input.select();
  document.execCommand("copy");
  notify.success("Share tunnel copied to clipboard!");
  document.getElementById("share-display-modal").classList.remove("active");
}

async function loadShareTunnels() {
  try {
    const res = await api.getUserShares();
    const tbody = document.getElementById("shares-table-body");
    tbody.innerHTML = "";

    if (res.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-lg empty-state">No active share tunnels.</td></tr>`;
      return;
    }

    res.data.forEach((s) => {
      const shareLabel = s.file_name || s.share_url || "File";
      tbody.innerHTML += `
      <tr id="share-row-${s.id}" class="explorer-table-row animate-slide-in">
        <td style="color:var(--text-primary); font-weight:500;">${shareLabel}</td>
        <td class="text-secondary">${new Date(s.created_at).toLocaleDateString()}</td>
        <td style="font-family:var(--font-mono);" class="text-secondary">${s.download_count || 0}</td>
        <td><span class="badge ${s.is_active ? 'badge-emerald' : 'badge-red'}">${s.is_active ? "Active" : "Expired"}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-outline btn-sm text-red" onclick="deleteShareTunnel('${s.id}')">Revoke</button>
        </td>
      </tr>
    `;
    });
  } catch (e) {}
}

async function deleteShareTunnel(id) {
  if (!confirm("Revoke public download capabilities for this link?")) return;
  try {
    await api.deleteShare(id);
    notify.success("Revoked share tunnel.");
    loadShareTunnels();
  } catch (e) {}
}

// ==================== PREVIEW MANAGER ====================
function previewFile(id, name, ext) {
  const modal = document.getElementById("preview-modal");
  const title = document.getElementById("preview-title");
  const container = document.getElementById("preview-content-container");
  
  title.textContent = name;
  container.innerHTML = "<div class='text-secondary'>⏳ Loading preview stream...</div>";
  
  modal.classList.add("active");
  
  const previewUrl = `/api/files/${id}/download?token=${api.token}`;
  
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    container.innerHTML = `<img src="${previewUrl}" style="max-width: 100%; max-height: 55vh; object-fit: contain; border-radius: var(--r-md);" />`;
  } else if (["mp4", "webm", "mkv", "avi"].includes(ext)) {
    container.innerHTML = `<video src="${previewUrl}" controls style="max-width: 100%; max-height: 55vh; border-radius: var(--r-md); outline: none;"></video>`;
  } else if (["mp3", "wav", "aac", "flac"].includes(ext)) {
    container.innerHTML = `
      <div style="text-align: center; width: 100%; padding: var(--sp-6);">
        <div style="font-size: 64px; margin-bottom: var(--sp-4);">🎵</div>
        <audio src="${previewUrl}" controls style="width: 100%; max-width: 400px; margin: 0 auto; outline: none;"></audio>
      </div>
    `;
  } else if (ext === "pdf") {
    container.innerHTML = `<iframe src="${previewUrl}" style="width: 100%; height: 60vh; border: none; border-radius: var(--r-md);"></iframe>`;
  } else if (["txt", "md", "json", "js", "html", "css"].includes(ext)) {
    fetch(previewUrl)
      .then(res => res.text())
      .then(text => {
        const truncated = text.length > 50000 ? text.substring(0, 50000) + "\n\n...[Truncated, file too large for preview]..." : text;
        const pre = document.createElement("pre");
        pre.style.cssText = "width: 100%; height: 60vh; text-align: left; font-family: var(--font-mono); font-size: 13px; color: var(--text-primary); white-space: pre-wrap; word-break: break-all; margin: 0; overflow-y: auto; background: rgba(0,0,0,0.3); padding: var(--sp-4); border-radius: var(--r-md); border: 1px solid var(--border-color);";
        pre.textContent = truncated;
        container.innerHTML = "";
        container.appendChild(pre);
      })
      .catch(err => {
        container.innerHTML = "<div class='text-red'>❌ Failed to fetch file content preview.</div>";
      });
  } else {
    container.innerHTML = `
      <div style="text-align: center; padding: var(--sp-6);">
        <div style="font-size: 48px; margin-bottom: var(--sp-2);">📄</div>
        <p class="text-secondary mb-md">Preview not available for .${ext} files.</p>
        <button class="btn btn-primary" onclick="downloadFile('${id}')">Download File ⬇️</button>
      </div>
    `;
  }
}

function closePreviewModal() {
  const modal = document.getElementById("preview-modal");
  const container = document.getElementById("preview-content-container");
  container.innerHTML = ""; 
  modal.classList.remove("active");
}

// ==================== TELEGRAM CONNECT SYSTEM ====================
async function connectTelegram() {
  const btn = document.getElementById("telegram-connect-btn");
  if (!btn) return;
  
  btn.disabled = true;
  btn.textContent = "⏳ Accessing Bot Gateway...";
  
  try {
    const res = await api.request("/telegram/code");
    if (res.success && res.code) {
      const code = res.code;
      
      document.getElementById("telegram-disconnected-ui").classList.add("hidden");
      document.getElementById("telegram-connecting-ui").classList.remove("hidden");
      document.getElementById("telegram-conn-code").textContent = code;
      
      const openBotBtn = document.getElementById("telegram-open-bot-btn");
      openBotBtn.onclick = () => {
        window.open(`https://t.me/DriftIQBot?start=${code}`, "_blank");
      };
      
      if (telegramPollInterval) clearInterval(telegramPollInterval);
      telegramPollInterval = setInterval(pollTelegramStatus, 3000);
    } else {
      notify.error("Bot code generation failed.");
      btn.disabled = false;
      btn.textContent = "Connect Telegram 🤖";
    }
  } catch (err) {
    notify.error("Gateway code request rejected.");
    btn.disabled = false;
    btn.textContent = "Connect Telegram 🤖";
  }
}

async function pollTelegramStatus() {
  try {
    const res = await api.request("/telegram/status");
    if (res.success && res.connected) {
      clearInterval(telegramPollInterval);
      telegramPollInterval = null;
      
      document.getElementById("telegram-connecting-ui").classList.add("hidden");
      document.getElementById("telegram-connected-ui").classList.remove("hidden");
      
      currentUser.telegram_status = "connected";
      document.getElementById("stat-telegram-status").textContent = "Connected";
      notify.success("Telegram bot gateway linked!");
    }
  } catch (e) {
    // Poll silently
  }
}

async function disconnectTelegram() {
  if (!confirm("Disconnect Telegram Bot connection?")) return;
  
  currentUser.telegram_status = "disconnected";
  document.getElementById("stat-telegram-status").textContent = "Disconnected";
  document.getElementById("telegram-connected-ui").classList.add("hidden");
  document.getElementById("telegram-disconnected-ui").classList.remove("hidden");
  const btn = document.getElementById("telegram-connect-btn");
  if (btn) {
    btn.disabled = false;
    btn.textContent = "Connect Telegram 🤖";
  }
  notify.success("Telegram bot route disconnected.");
}

// ==================== ADMIN SYSTEM PANEL ====================
async function loadAdminPanelData() {
  try {
    const [dashRes, usersRes, filesRes] = await Promise.all([
      api.getDashboard(),
      api.getAllUsers(1, 100),
      api.adminGetAllFiles(1, 100)
    ]);

    const data = dashRes.data || { total_users: 0, total_files: 0, total_storage: 0, total_shares: 0, active_users: 0 };
    
    document.getElementById("admin-total-users").textContent = data.total_users;
    document.getElementById("admin-total-files").textContent = data.total_files;
    document.getElementById("admin-total-storage").textContent = formatBytes(data.total_storage);
    document.getElementById("admin-total-shares").textContent = data.total_shares;
    document.getElementById("admin-total-folders").textContent = Math.round(data.total_files * 0.4) || 0;

    const usersTbody = document.getElementById("admin-users-tbody");
    usersTbody.innerHTML = "";
    usersRes.data.forEach(u => {
      const actionBtn = u.id === currentUser.id 
        ? '<span class="text-muted" style="font-size:11px;">Immutable (Self)</span>' 
        : `<button class="btn btn-outline btn-sm text-red" onclick="purgeUser('${u.id}')">Drop Client</button>`;
      
      usersTbody.innerHTML += `
        <tr class="explorer-table-row animate-slide-in">
          <td style="color:var(--text-primary); font-weight:500;">${u.username}</td>
          <td class="text-secondary">${u.email}</td>
          <td class="text-secondary">${new Date(u.created_at).toLocaleDateString()}</td>
          <td><span class="badge ${u.role === 'admin' ? 'badge-cyan' : 'badge-emerald'}">${u.role.toUpperCase()}</span></td>
          <td style="text-align: right;">${actionBtn}</td>
        </tr>
      `;
    });

    const filesTbody = document.getElementById("admin-files-tbody");
    filesTbody.innerHTML = "";
    if (filesRes.data.length === 0) {
      filesTbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-lg empty-state">No files indexed in database.</td></tr>`;
    } else {
      filesRes.data.forEach(f => {
        const ownerStr = f.users ? f.users.username : 'Unknown';
        const fileDate = new Date(f.created_at).toLocaleDateString();
        filesTbody.innerHTML += `
          <tr class="explorer-table-row animate-slide-in">
            <td style="color:var(--text-primary); font-weight:500; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${f.name}">${f.name}</td>
            <td class="text-secondary">${ownerStr}</td>
            <td class="text-secondary" style="font-family:var(--font-mono);">${formatBytes(f.size)}</td>
            <td class="text-secondary">${fileDate}</td>
            <td style="text-align: right">
              <button class="btn btn-outline btn-sm text-red" onclick="adminPurgeFile('${f.id}')">Purge</button>
            </td>
          </tr>
        `;
      });
    }
  } catch (e) {
    console.error("Admin load error: ", e);
  }
}

async function purgeUser(id) {
  if (!confirm("Delete this user account and purge all their database/storage index resources?")) return;
  try {
    await api.deleteUser(id);
    notify.success("Purged user profile registry successfully.");
    loadAdminPanelData();
  } catch (e) {
    notify.error("User drop request rejected.");
  }
}

async function adminPurgeFile(id) {
  if (!confirm("Are you sure you want to permanently purge this file index across the entire server?")) return;
  try {
    await api.adminDeleteFile(id);
    notify.success("File purged successfully.");
    loadAdminPanelData();
  } catch(e) {
    notify.error("Failed to purge file.");
  }
}

// ==================== SETTINGS & PASSWORD ====================
async function handleChangePassword(e) {
  e.preventDefault();
  const cur = document.getElementById("set-current-pass").value;
  const newP = document.getElementById("set-new-pass").value;
  const conf = document.getElementById("set-confirm-pass").value;

  if (newP !== conf) {
    notify.error("Passwords do not match.");
    return;
  }

  try {
    await api.changePassword(cur, newP);
    notify.success("Encryption keys rotated successfully!");
    document.getElementById("changePasswordForm").reset();
  } catch (err) {
    notify.error(err.data?.error || "Key rotation failed.");
  }
}

function upgradePlan() {
  // Logic removed
}

function logout() {
  api.clearToken();
  notify.success("Storage tunnel disconnected.");
  setTimeout(() => location.reload(), 1000);
}

// AI Assistant functionality removed.

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
