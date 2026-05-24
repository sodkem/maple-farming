// ===== 구글 인증 =====
const CLIENT_ID = '145578983739-5s09m3jrhesjm72ktr5mjsknfeo4697p.apps.googleusercontent.com';
const OWNER_EMAILS = new Set([
  'sodkem93@gmail.com',
  'eliceyong93@gmail.com',
  'sodkem932@gmail.com',
]);
let isOwner = localStorage.getItem('owner_logged_in') === 'true';

function applyAuthState() { document.body.classList.toggle('is-owner', isOwner); }
applyAuthState();

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  ));
}

function handleCredentialResponse(response) {
  const payload = parseJwt(response.credential);
  if (!OWNER_EMAILS.has(payload.email)) { alert('이 계정에는 편집 권한이 없습니다.'); return; }
  isOwner = true;
  localStorage.setItem('owner_logged_in', 'true');
  localStorage.setItem('owner_name', payload.name || payload.email);
  document.getElementById('auth-name').textContent = payload.name || payload.email;
  document.getElementById('auth-info').classList.remove('hidden');
  document.getElementById('google-signin-btn').classList.add('hidden');
  applyAuthState();
  wolmyoTab.renderItems(); wolmyoTab.renderLinks(); wolmyoTab.initGroupNameEditing();
  kronosTab.renderItems(); kronosTab.renderLinks(); kronosTab.initGroupNameEditing();
}

function initGoogleAuth() {
  if (typeof google === 'undefined') return;
  google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
  });
  google.accounts.id.renderButton(
    document.getElementById('google-signin-btn'),
    { theme: 'outline', size: 'small', text: 'signin_with', locale: 'ko' }
  );
}

window.addEventListener('load', () => {
  initGoogleAuth();
  if (isOwner) {
    document.getElementById('auth-name').textContent = localStorage.getItem('owner_name') || '관리자';
    document.getElementById('auth-info').classList.remove('hidden');
    document.getElementById('google-signin-btn').classList.add('hidden');
  }
});

// ===== Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyBLTyn2f-GPMGsKqdjfwzoLHuTlqIaTfOE",
  authDomain: "maple-farming-7db68.firebaseapp.com",
  projectId: "maple-farming-7db68",
  storageBucket: "maple-farming-7db68.firebasestorage.app",
  messagingSenderId: "555969240207",
  appId: "1:555969240207:web:f54ae55a74905e24d564fa"
};
let db;
try { firebase.initializeApp(firebaseConfig); db = firebase.firestore(); } catch(e) {}

// ===== 탭 전환 =====
document.querySelectorAll('.tab-btn').forEach(t => {
  t.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(o => o.classList.remove('active'));
    t.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`panel-${t.dataset.tab}`).classList.remove('hidden');
    if (t.dataset.tab === 'history') renderHistory();
  };
});

// ===== 유틸 =====
function formatTime(ms) {
  const t = Math.floor(ms / 1000);
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60]
    .map(n => String(n).padStart(2, '0')).join(':');
}

// ===== 편집 모달 (두 탭 공유) =====
let activeTab = null;
const modal = document.getElementById('edit-modal');
let editingId = null;
let pendingImageData = '';

function showImagePreview(dataUrl) {
  pendingImageData = dataUrl;
  document.getElementById('image-preview').src = dataUrl;
  document.getElementById('image-preview-wrap').style.display = 'inline-block';
  document.getElementById('image-empty').style.display = 'none';
}
function clearImagePreview() {
  pendingImageData = '';
  document.getElementById('image-preview').src = '';
  document.getElementById('image-preview-wrap').style.display = 'none';
  document.getElementById('image-empty').style.display = 'block';
}
function readImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => showImagePreview(e.target.result);
  reader.readAsDataURL(file);
}

const dropZone = document.getElementById('image-drop-zone');
const fileInput = document.getElementById('image-file');
document.getElementById('image-pick').onclick = e => { e.stopPropagation(); fileInput.click(); };
fileInput.onchange = e => { if (e.target.files[0]) readImageFile(e.target.files[0]); };
document.getElementById('image-remove').onclick = e => { e.stopPropagation(); clearImagePreview(); };
dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('dragover'); };
dropZone.ondragleave = () => dropZone.classList.remove('dragover');
dropZone.ondrop = e => {
  e.preventDefault(); dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) readImageFile(e.dataTransfer.files[0]);
};
document.addEventListener('paste', e => {
  if (modal.classList.contains('hidden')) return;
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) { readImageFile(items[i].getAsFile()); e.preventDefault(); break; }
  }
});

document.getElementById('m-cancel').onclick = () => modal.classList.add('hidden');
document.getElementById('m-delete').onclick = () => {
  if (!activeTab) return;
  activeTab.deleteItem(editingId);
  activeTab.saveAndRender();
  modal.classList.add('hidden');
};
document.getElementById('m-save').onclick = () => {
  if (!activeTab) return;
  activeTab.updateItem(editingId, {
    name: document.getElementById('m-name').value || '이름 없음',
    image: pendingImageData,
    rate: parseFloat(document.getElementById('m-rate').value) || 0,
    count: parseInt(document.getElementById('m-count').value) || 0,
  });
  activeTab.saveAndRender();
  modal.classList.add('hidden');
};

// ===== 파밍 탭 팩토리 =====
function createFarmTab({ key, itemVersion, itemList, prefix, defaultGroupNames, killsCalc, qtStartKey, qtElapsedKey, maxGroups }) {
  const maxGroupsCount = maxGroups || 2;
  const $ = id => document.getElementById(`${prefix}-${id}`);
  const SK = {
    items:     `${key}-items`,
    version:   `${key}-item-version`,
    links:     `${key}-links`,
    groups:    `${key}-groups`,
    qtStart:   qtStartKey   || `${key}-qt-start`,
    qtElapsed: qtElapsedKey || `${key}-qt-elapsed`,
  };

  let items = [], nextId = 1;
  let links = [], nextLinkId = 1;
  let groupNames = [...defaultGroupNames];
  let currentTotalKills = 0, killsOverride = null, dragSrcId = null;
  let qtStart = null, qtElapsed = 0, qtInterval = null;
  let iface; // forward reference for openEdit

  // --- Firestore ---
  function syncToFirestore() {
    if (!isOwner || !db) return;
    const itemsForFS = items.map(({ image, ...rest }) => ({
      ...rest, image: image && !image.startsWith('data:') ? image : ''
    }));
    db.collection('farm').doc(`${key}-items`).set({ items: itemsForFS, nextId }).catch(() => {});
  }

  // --- 킬 추정 ---
  function calcEstimate(item) {
    return item.rate > 0 && item.count > 0 ? Math.round(item.count / (item.rate / 100)) : 0;
  }
  function recomputeTotalKills() {
    if (killsOverride !== null) { currentTotalKills = killsOverride; return; }
    currentTotalKills = 0;
    if (killsCalc === 'avgNamed') {
      const TARGET = ['은의 원석', '사파이어의 원석'];
      const targets = items.filter(i => (i.group || 1) === 2 && TARGET.includes(i.name));
      const ests = targets.map(calcEstimate).filter(e => e > 0);
      if (ests.length) currentTotalKills = Math.round(ests.reduce((a, b) => a + b, 0) / ests.length);
    } else {
      items.filter(i => (i.group || 1) === 2).forEach(i => {
        const e = calcEstimate(i); if (e > currentTotalKills) currentTotalKills = e;
      });
    }
  }
  function getEstimateText(item) {
    if (!item.rate) return '확률 입력';
    const avg = Math.round(100 / item.rate).toLocaleString();
    const avgLine = `<span class="est-avg">${avg}마리/1개</span>`;
    if (currentTotalKills > 0) {
      const exp = currentTotalKills * (item.rate / 100);
      const expFmt = exp < 0.01 ? '&lt;0.01' : exp >= 10
        ? Math.round(exp).toLocaleString()
        : parseFloat(exp.toFixed(2)).toString();
      return `기대 <strong>${expFmt}</strong>개<br>${avgLine}`;
    }
    return avgLine;
  }
  function updateGroup1Sum() {
    const el = $('group1-count-sum');
    if (!el) return;
    const sum = items.filter(i => (i.group || 1) === 1).reduce((a, i) => a + (i.count || 0), 0);
    el.textContent = sum > 0 ? `합계 ${sum.toLocaleString()}개` : '';
    el.style.display = sum > 0 ? '' : 'none';
  }
  function updateAllEstimates() {
    recomputeTotalKills(); updateGroup1Sum();
    const tk = $('total-kills');
    if (tk) tk.textContent = currentTotalKills.toLocaleString() + ' 마리';
    items.forEach(item => {
      const el = document.querySelector(`[data-est-id="${prefix}-${item.id}"]`);
      if (el) el.innerHTML = getEstimateText(item);
    });
  }

  // --- 드래그앤드롭 ---
  function attachDragHandlers(grid) {
    if (!isOwner || !grid) return;
    grid.addEventListener('dragstart', e => {
      const card = e.target.closest('[data-item-id]');
      if (!card) return;
      dragSrcId = parseInt(card.dataset.itemId);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => card.classList.add('dragging'), 0);
    });
    grid.addEventListener('dragend', () => {
      dragSrcId = null;
      grid.querySelectorAll('.item-card').forEach(c => c.classList.remove('dragging', 'drag-over'));
    });
    grid.addEventListener('dragover', e => {
      e.preventDefault();
      const card = e.target.closest('[data-item-id]');
      if (!card || parseInt(card.dataset.itemId) === dragSrcId) return;
      grid.querySelectorAll('.item-card').forEach(c => c.classList.remove('drag-over'));
      card.classList.add('drag-over');
    });
    grid.addEventListener('dragleave', e => {
      if (!grid.contains(e.relatedTarget))
        grid.querySelectorAll('.item-card').forEach(c => c.classList.remove('drag-over'));
    });
    grid.addEventListener('drop', e => {
      e.preventDefault();
      const card = e.target.closest('[data-item-id]');
      if (!card || !dragSrcId) return;
      const targetId = parseInt(card.dataset.itemId);
      if (targetId === dragSrcId) return;
      grid.querySelectorAll('.item-card').forEach(c => c.classList.remove('drag-over'));
      const si = items.findIndex(i => i.id === dragSrcId);
      const di = items.findIndex(i => i.id === targetId);
      if (si === -1 || di === -1) return;
      const [m] = items.splice(si, 1); items.splice(di, 0, m);
      saveItems(); renderItems();
    });
  }

  // --- 렌더링 ---
  function renderGroup(num) {
    const grid = $(`items-grid-${num}`);
    if (!grid) return;
    grid.innerHTML = '';
    items.filter(i => (i.group || 1) === num).forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';
      if (isOwner) { card.draggable = true; card.dataset.itemId = item.id; }
      const imgHtml = item.image
        ? `<img src="${item.image}" alt="" onerror="this.style.display='none'">`
        : `<span class="placeholder">🖼</span>`;
      card.innerHTML = `
        <div class="item-image-wrap">
          ${imgHtml}
          ${isOwner ? `<button class="item-edit" data-edit="${item.id}">⚙</button>` : ''}
        </div>
        <p class="item-name">${item.name}</p>
        <p class="item-rate">${item.rate}% 드랍</p>
        <div class="counter">
          ${isOwner ? `<button data-minus="${item.id}">−</button>` : ''}
          ${isOwner
            ? `<input class="display count-input" type="number" min="0" value="${item.count}" data-count="${item.id}" />`
            : `<div class="display">${item.count}</div>`}
          ${isOwner ? `<button class="plus" data-plus="${item.id}">+</button>` : ''}
        </div>
        <p class="item-estimate" data-est-id="${prefix}-${item.id}">${getEstimateText(item)}</p>
        ${isOwner && maxGroupsCount > 1 ? `<button class="item-move" data-move="${item.id}">${num === 1 ? '↓ 그룹 2로' : '↑ 그룹 1로'}</button>` : ''}
      `;
      grid.appendChild(card);
    });
    grid.querySelectorAll('[data-plus]').forEach(b => {
      b.onclick = () => { const it = items.find(i => i.id === parseInt(b.dataset.plus)); if (it) { it.count++; saveItems(); renderItems(); } };
    });
    grid.querySelectorAll('[data-minus]').forEach(b => {
      b.onclick = () => { const it = items.find(i => i.id === parseInt(b.dataset.minus)); if (it && it.count > 0) { it.count--; saveItems(); renderItems(); } };
    });
    grid.querySelectorAll('[data-edit]').forEach(b => {
      b.onclick = () => openEdit(parseInt(b.dataset.edit));
    });
    grid.querySelectorAll('[data-move]').forEach(b => {
      b.onclick = () => { const it = items.find(i => i.id === parseInt(b.dataset.move)); if (it) { it.group = it.group === 1 ? 2 : 1; saveItems(); renderItems(); } };
    });
    grid.querySelectorAll('[data-count]').forEach(input => {
      input.oninput = () => {
        const val = parseInt(input.value);
        const it = items.find(i => i.id === parseInt(input.dataset.count));
        if (!it) return;
        it.count = isNaN(val) || val < 0 ? 0 : val;
        updateAllEstimates();
      };
      input.onblur = () => {
        const it = items.find(i => i.id === parseInt(input.dataset.count));
        if (!it) return;
        if (isNaN(it.count) || it.count < 0) { it.count = 0; input.value = 0; }
        saveItems();
      };
      input.onkeydown = e => { if (e.key === 'Enter') input.blur(); };
    });
  }

  function renderItems() {
    recomputeTotalKills();
    renderGroup(1);
    if (maxGroupsCount >= 2) renderGroup(2);
    updateGroup1Sum();
    const tk = $('total-kills');
    if (tk) tk.textContent = currentTotalKills.toLocaleString() + ' 마리';
    attachDragHandlers($('items-grid-1'));
    if (maxGroupsCount >= 2) attachDragHandlers($('items-grid-2'));
  }

  // --- 스토리지 ---
  function saveItems() {
    localStorage.setItem(SK.items, JSON.stringify({ items, nextId }));
    syncToFirestore();
  }
  async function loadItems() {
    const raw = localStorage.getItem(SK.items);
    if (raw) { try { const d = JSON.parse(raw); items = d.items || []; nextId = d.nextId || 1; } catch(e) {} }
    renderItems();
    if (db) {
      try {
        const snap = await db.collection('farm').doc(`${key}-items`).get();
        if (snap.exists) {
          const d = snap.data();
          const localItems = raw ? (JSON.parse(raw).items || []) : [];
          const imgMap = {};
          localItems.forEach(i => { if (i.image) imgMap[i.id] = i.image; });
          items = (d.items || []).map(item => ({ ...item, image: imgMap[item.id] || item.image || '' }));
          nextId = d.nextId || 1;
          renderItems();
        }
      } catch(e) {}
    }
    resetToFreshItems();
  }
  function resetToFreshItems() {
    if (!isOwner || !itemList || itemList.length === 0) return;
    const saved = parseInt(localStorage.getItem(SK.version) || '0');
    if (saved >= itemVersion) return;
    items = itemList.map((di, idx) => ({
      id: idx + 1, name: di.name,
      image: di.imgUrl || `https://maplestory.io/api/gms/90/item/${di.imgId}/icon`,
      rate: di.rate, count: 0, group: di.group,
    }));
    nextId = items.length + 1;
    saveItems(); renderItems();
    localStorage.setItem(SK.version, String(itemVersion));
  }

  // --- 링크 ---
  function renderLinks() {
    const list = $('links-list');
    if (!list) return;
    list.innerHTML = '';
    links.forEach(link => {
      const tag = document.createElement('a');
      tag.className = 'link-tag'; tag.href = link.url; tag.target = '_blank';
      tag.innerHTML = `<span>${link.name}</span>${isOwner ? `<button class="link-del" data-del="${link.id}">×</button>` : ''}`;
      list.appendChild(tag);
    });
    list.querySelectorAll('.link-del').forEach(btn => {
      btn.onclick = e => {
        e.preventDefault(); e.stopPropagation();
        const lnk = links.find(l => l.id === parseInt(btn.dataset.del));
        if (!confirm(`"${lnk ? lnk.name : '이 링크'}"를 삭제할까요?`)) return;
        links = links.filter(l => l.id !== parseInt(btn.dataset.del));
        saveLinks(); renderLinks();
      };
    });
  }
  function saveLinks() {
    localStorage.setItem(SK.links, JSON.stringify({ links, nextId: nextLinkId }));
    if (isOwner && db) db.collection('farm').doc(`${key}-links`).set({ links, nextId: nextLinkId }).catch(() => {});
  }
  function loadLinks() {
    const raw = localStorage.getItem(SK.links);
    if (raw) { try { const d = JSON.parse(raw); links = d.links || []; nextLinkId = d.nextId || 1; } catch(e) {} }
    renderLinks();
    if (db) db.collection('farm').doc(`${key}-links`).get().then(snap => {
      if (snap.exists) { const d = snap.data(); links = d.links || []; nextLinkId = d.nextId || 1; renderLinks(); }
    }).catch(() => {});
  }

  // --- 그룹 이름 ---
  function applyGroupNames() {
    [0, 1].forEach(idx => { const el = $(`group-name-${idx + 1}`); if (el) el.textContent = groupNames[idx] || defaultGroupNames[idx]; });
  }
  function saveGroupNames() {
    localStorage.setItem(SK.groups, JSON.stringify(groupNames));
    if (db) db.collection('farm').doc(`${key}-groups`).set({ names: groupNames }).catch(() => {});
  }
  function loadGroupNames() {
    const raw = localStorage.getItem(SK.groups);
    if (raw) { try { groupNames = JSON.parse(raw); } catch(e) {} }
    applyGroupNames();
    if (db) db.collection('farm').doc(`${key}-groups`).get().then(snap => {
      if (snap.exists && snap.data().names) { groupNames = snap.data().names; applyGroupNames(); }
    }).catch(() => {});
  }
  function initGroupNameEditing() {
    if (!isOwner) return;
    [0, 1].forEach(idx => {
      const el = $(`group-name-${idx + 1}`);
      if (!el || el.dataset.editable) return;
      el.dataset.editable = 'true'; el.classList.add('editable-name');
      el.onclick = () => {
        const n = prompt('그룹 이름 변경:', groupNames[idx]);
        if (n !== null && n.trim()) { groupNames[idx] = n.trim(); el.textContent = groupNames[idx]; saveGroupNames(); }
      };
    });
  }

  // --- 빠른 타이머 ---
  function qtSaveState() {
    if (qtStart !== null) { localStorage.setItem(SK.qtStart, String(qtStart)); }
    else { localStorage.removeItem(SK.qtStart); localStorage.setItem(SK.qtElapsed, String(qtElapsed)); }
  }
  function qtClearState() { localStorage.removeItem(SK.qtStart); localStorage.removeItem(SK.qtElapsed); }
  function qtStartInterval() {
    const clockEl = $('qt-clock');
    qtInterval = setInterval(() => {
      qtElapsed = Date.now() - qtStart;
      if (clockEl) clockEl.textContent = formatTime(qtElapsed);
      localStorage.setItem(SK.qtStart, String(qtStart));
    }, 500);
  }
  function setupQuickTimer() {
    const startBtn = $('qt-start'), pauseBtn = $('qt-pause'), resetBtn = $('qt-reset'), clockEl = $('qt-clock');
    if (!startBtn) return;
    startBtn.onclick = () => {
      qtStart = Date.now() - qtElapsed;
      qtSaveState(); qtStartInterval();
      startBtn.disabled = true; pauseBtn.disabled = false;
    };
    pauseBtn.onclick = () => {
      clearInterval(qtInterval); qtStart = null; qtSaveState();
      startBtn.disabled = false; pauseBtn.disabled = true;
      startBtn.textContent = '▶ 이어서';
    };
    resetBtn.onclick = () => {
      clearInterval(qtInterval); qtElapsed = 0; qtStart = null; qtClearState();
      if (clockEl) clockEl.textContent = '00:00:00';
      startBtn.disabled = false; pauseBtn.disabled = true;
      startBtn.textContent = '▶ 시작';
    };
  }
  function loadQtState() {
    const startBtn = $('qt-start'), pauseBtn = $('qt-pause'), clockEl = $('qt-clock');
    if (!startBtn) return;
    const savedStart   = parseInt(localStorage.getItem(SK.qtStart)   || '0');
    const savedElapsed = parseInt(localStorage.getItem(SK.qtElapsed) || '0');
    if (savedStart > 0) {
      qtStart = savedStart; qtElapsed = Date.now() - qtStart;
      if (clockEl) clockEl.textContent = formatTime(qtElapsed);
      qtStartInterval(); startBtn.disabled = true; pauseBtn.disabled = false;
    } else if (savedElapsed > 0) {
      qtElapsed = savedElapsed;
      if (clockEl) clockEl.textContent = formatTime(qtElapsed);
      startBtn.textContent = '▶ 이어서';
    }
  }

  // --- 링크/아이템 버튼 세팅 ---
  function setupLinkButtons() {
    const btnAdd = $('btn-add-link'), form = $('link-form');
    const nameInput = $('link-name'), urlInput = $('link-url');
    const btnCancel = $('link-cancel'), btnSave = $('link-save');
    if (!btnAdd) return;
    btnAdd.onclick = () => { form.classList.remove('hidden'); nameInput.value = ''; urlInput.value = ''; nameInput.focus(); };
    btnCancel.onclick = () => form.classList.add('hidden');
    btnSave.onclick = () => {
      const name = nameInput.value.trim(); let url = urlInput.value.trim();
      if (!name || !url) return;
      if (!url.startsWith('http')) url = 'https://' + url;
      links.push({ id: nextLinkId++, name, url });
      saveLinks(); renderLinks(); form.classList.add('hidden');
    };
    urlInput.onkeydown = e => { if (e.key === 'Enter') btnSave.click(); };
  }
  function setupAddItemButtons() {
    const btn1 = $('btn-add-item-1'), btn2 = $('btn-add-item-2');
    if (btn1) btn1.onclick = () => { items.push({ id: nextId++, name: '새 아이템', image: '', rate: 1, count: 0, group: 1 }); saveItems(); renderItems(); };
    if (btn2) btn2.onclick = () => { items.push({ id: nextId++, name: '새 아이템', image: '', rate: 1, count: 0, group: 2 }); saveItems(); renderItems(); };
  }

  // --- 편집 모달 오픈 ---
  function openEdit(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    activeTab = iface; // 현재 탭을 활성 탭으로
    editingId = id;
    document.getElementById('m-name').value = item.name;
    document.getElementById('m-rate').value = item.rate;
    document.getElementById('m-count').value = item.count;
    if (item.image) { showImagePreview(item.image); } else { clearImagePreview(); }
    modal.classList.remove('hidden');
  }

  // --- 초기화 ---
  function init() {
    loadItems(); loadLinks(); loadGroupNames();
    setupLinkButtons(); setupAddItemButtons();
    setupQuickTimer(); loadQtState();
    initGroupNameEditing();
  }

  iface = {
    init, renderItems, renderLinks, initGroupNameEditing,
    deleteItem: id => { items = items.filter(i => i.id !== id); },
    updateItem: (id, changes) => { const it = items.find(i => i.id === id); if (it) Object.assign(it, changes); },
    saveAndRender: () => { saveItems(); renderItems(); },
    getTotalItemCount: () => items.reduce((s, i) => s + (i.count || 0), 0),
    setKillsOverride: (n) => { killsOverride = n; updateAllEstimates(); },
  };
  return iface;
}

// ===== 탭 인스턴스 =====
const wolmyoTab = createFarmTab({
  key: 'farming', prefix: 'w',
  itemVersion: ITEM_VERSION, itemList: ITEM_LIST,
  defaultGroupNames: ['파밍 1', '파밍 2'],
  killsCalc: 'avgNamed',
  qtStartKey: 'qt-start-ts',   // 기존 localStorage 호환
  qtElapsedKey: 'qt-elapsed',
});
const kronosTab = createFarmTab({
  key: 'kronos', prefix: 'k',
  itemVersion: KRONOS_ITEM_VERSION, itemList: KRONOS_ITEM_LIST,
  defaultGroupNames: ['그룹 1', '그룹 2'],
  killsCalc: 'max',
});

// ===== 타이머 탭 =====
const expStart    = document.getElementById('exp-start');
const expEnd      = document.getElementById('exp-end');
const locationName = document.getElementById('location-name');
const timerClock  = document.getElementById('timer-clock');
const timerStatus = document.getElementById('timer-status');
const liveStats   = document.getElementById('live-stats');
const liveExp     = document.getElementById('live-exp');
const liveItems   = document.getElementById('live-items');
const btnStart    = document.getElementById('btn-start');
const btnPause    = document.getElementById('btn-pause');
const btnStop     = document.getElementById('btn-stop');
const btnReset    = document.getElementById('btn-reset');
const savePrompt  = document.getElementById('save-prompt');
const saveSummary = document.getElementById('save-summary');

let startTime = null, elapsed = 0, intervalId = null, sessionStartItems = 0, lastSession = null;

function totalItemCount() {
  return wolmyoTab.getTotalItemCount() + kronosTab.getTotalItemCount();
}
function updateLive() {
  elapsed = Date.now() - startTime;
  timerClock.textContent = formatTime(elapsed);
  const gained = Math.max(0, (parseInt(expEnd.value) || 0) - (parseInt(expStart.value) || 0));
  const itemsGained = Math.max(0, totalItemCount() - sessionStartItems);
  const hours = elapsed / 3600000;
  if (hours > 0) {
    liveStats.classList.remove('hidden');
    liveExp.textContent = Math.round(gained / hours).toLocaleString() + ' (총 ' + gained.toLocaleString() + ')';
    liveItems.textContent = itemsGained + '개 (시당 ' + Math.round(itemsGained / hours) + ')';
  }
}
btnStart.onclick = () => {
  if (elapsed === 0) sessionStartItems = totalItemCount();
  startTime = Date.now() - elapsed;
  intervalId = setInterval(updateLive, 1000);
  btnStart.disabled = true; btnPause.disabled = false; btnStop.disabled = false;
  timerStatus.textContent = '진행 중'; savePrompt.classList.add('hidden');
};
btnPause.onclick = () => {
  clearInterval(intervalId);
  btnStart.disabled = false; btnStart.textContent = '▶ 이어서'; btnPause.disabled = true;
  timerStatus.textContent = '일시정지';
};
btnStop.onclick = () => {
  clearInterval(intervalId);
  btnStart.disabled = false; btnStart.textContent = '▶ 시작'; btnPause.disabled = true; btnStop.disabled = true;
  timerStatus.textContent = '종료';
  const gained = Math.max(0, (parseInt(expEnd.value) || 0) - (parseInt(expStart.value) || 0));
  const itemsGained = Math.max(0, totalItemCount() - sessionStartItems);
  const hours = elapsed / 3600000;
  lastSession = {
    id: Date.now(), date: new Date().toLocaleString('ko-KR'), location: locationName.value || '이름 없음',
    durationStr: formatTime(elapsed), exp: gained, items: itemsGained,
    expPerHour: hours > 0 ? Math.round(gained / hours) : 0,
    itemsPerHour: hours > 0 ? Math.round(itemsGained / hours) : 0,
  };
  saveSummary.innerHTML = `<strong>${formatTime(elapsed)}</strong> 동안 경험치 <strong>${gained.toLocaleString()}</strong>, 아이템 <strong>${itemsGained}개</strong>`;
  savePrompt.classList.remove('hidden');
};
btnReset.onclick = () => {
  clearInterval(intervalId); elapsed = 0; startTime = null;
  timerClock.textContent = '00:00:00'; timerStatus.textContent = '경과 시간';
  btnStart.disabled = false; btnStart.textContent = '▶ 시작'; btnPause.disabled = true; btnStop.disabled = true;
  liveStats.classList.add('hidden'); savePrompt.classList.add('hidden');
};
document.getElementById('btn-save').onclick = () => {
  if (!lastSession) return;
  const h = loadHistory(); h.unshift(lastSession);
  localStorage.setItem('farming-history', JSON.stringify(h));
  savePrompt.classList.add('hidden');
};

// ===== 기록 =====
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('farming-history') || '[]'); } catch(e) { return []; }
}
function renderHistory() {
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  const h = loadHistory();
  list.innerHTML = '';
  if (!h.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  h.forEach(s => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div class="header">
        <div><p style="font-weight:500">${s.location}</p><p style="font-size:11px;color:#999">${s.date}</p></div>
        ${isOwner ? `<button data-del="${s.id}" class="small-btn">✕</button>` : ''}
      </div>
      <div class="stats">
        <div><span>시간</span><br><strong>${s.durationStr}</strong></div>
        <div><span>경험치</span><br><strong>${s.exp.toLocaleString()}</strong></div>
        <div><span>시당 경험</span><br><strong>${s.expPerHour.toLocaleString()}</strong></div>
        <div><span>시당 아이템</span><br><strong>${s.itemsPerHour}</strong></div>
      </div>`;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = () => {
      const id = parseInt(b.dataset.del);
      localStorage.setItem('farming-history', JSON.stringify(loadHistory().filter(s => s.id !== id)));
      renderHistory();
    };
  });
}

// ===== 로그아웃 / 전체삭제 =====
document.getElementById('btn-signout').onclick = () => {
  isOwner = false;
  localStorage.removeItem('owner_logged_in'); localStorage.removeItem('owner_name');
  if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
  document.getElementById('auth-info').classList.add('hidden');
  document.getElementById('google-signin-btn').classList.remove('hidden');
  applyAuthState();
  wolmyoTab.renderItems(); wolmyoTab.renderLinks();
  kronosTab.renderItems(); kronosTab.renderLinks();
};
document.getElementById('btn-clear-all').onclick = () => {
  if (confirm('정말 모든 기록을 삭제할까요?')) { localStorage.removeItem('farming-history'); renderHistory(); }
};

// ===== 메모장 =====
const notepadTab   = document.getElementById('notepad-tab');
const notepadPanel = document.getElementById('notepad-panel');
const notepadArea  = document.getElementById('notepad-area');
const notepadClose = document.getElementById('notepad-close');
notepadArea.value = localStorage.getItem('farming-memo') || '';
notepadTab.onclick = () => { notepadPanel.classList.remove('notepad-collapsed'); notepadTab.classList.add('hidden'); notepadArea.focus(); };
notepadClose.onclick = () => { notepadPanel.classList.add('notepad-collapsed'); notepadTab.classList.remove('hidden'); };
notepadArea.oninput = () => localStorage.setItem('farming-memo', notepadArea.value);

// ===== 제목 아래 편집 메모 =====
const headerNote = document.getElementById('header-note');
if (headerNote) {
  headerNote.textContent = localStorage.getItem('header-note') || '';
  headerNote.oninput = () => localStorage.setItem('header-note', headerNote.textContent);
}

// ===== 초기화 =====
wolmyoTab.init();
kronosTab.init();

