// ===== 구글 인증 =====
// ⚠️ CLIENT_ID를 Google Cloud Console에서 발급받은 OAuth 2.0 Client ID로 교체하세요
const CLIENT_ID = '145578983739-5s09m3jrhesjm72ktr5mjsknfeo4697p.apps.googleusercontent.com';

const OWNER_EMAILS = new Set([
  'sodkem93@gmail.com',
  'eliceyong93@gmail.com',
  'sodkem932@gmail.com',
]);

let isOwner = localStorage.getItem('owner_logged_in') === 'true';

function applyAuthState() {
  document.body.classList.toggle('is-owner', isOwner);
}
applyAuthState();

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  ));
}

function handleCredentialResponse(response) {
  const payload = parseJwt(response.credential);
  if (!OWNER_EMAILS.has(payload.email)) {
    alert('이 계정에는 편집 권한이 없습니다.');
    return;
  }
  isOwner = true;
  localStorage.setItem('owner_logged_in', 'true');
  localStorage.setItem('owner_name', payload.name || payload.email);
  document.getElementById('auth-name').textContent = payload.name || payload.email;
  document.getElementById('auth-info').classList.remove('hidden');
  document.getElementById('google-signin-btn').classList.add('hidden');
  applyAuthState();
  renderItems();
  renderLinks();
  initGroupNameEditing();
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
    // Firebase 설정 완료 시 최초 1회 기존 데이터 업로드
    if (db && !localStorage.getItem('firebase-synced')) {
      syncToFirestore();
      localStorage.setItem('firebase-synced', 'true');
    }
  }
});

// ===== Firebase 설정 =====
// ⚠️ Firebase 콘솔에서 앱 등록 후 아래 값들을 교체하세요
const firebaseConfig = {
  apiKey: "AIzaSyBLTyn2f-GPMGsKqdjfwzoLHuTlqIaTfOE",
  authDomain: "maple-farming-7db68.firebaseapp.com",
  projectId: "maple-farming-7db68",
  storageBucket: "maple-farming-7db68.firebasestorage.app",
  messagingSenderId: "555969240207",
  appId: "1:555969240207:web:f54ae55a74905e24d564fa"
};

let db;
if (firebaseConfig.apiKey !== 'YOUR_API_KEY') {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
  } catch (e) {
    console.log('Firebase 초기화 실패');
  }
}

function syncToFirestore() {
  if (!isOwner || !db) return;
  const itemsForFirestore = items.map(({ image, ...rest }) => rest);
  db.collection('farm').doc('items').set({ items: itemsForFirestore, nextId })
    .catch(e => console.log('Firestore 저장 실패:', e));
}

// ===== 탭 전환 =====
const tabs = document.querySelectorAll('.tab-btn');
const panels = {
  items: document.getElementById('panel-items'),
  timer: document.getElementById('panel-timer'),
  history: document.getElementById('panel-history')
};
tabs.forEach(t => {
  t.onclick = () => {
    tabs.forEach(o => o.classList.remove('active'));
    t.classList.add('active');
    Object.values(panels).forEach(p => p.classList.add('hidden'));
    panels[t.dataset.tab].classList.remove('hidden');
    if (t.dataset.tab === 'history') renderHistory();
  };
});

// ===== 그룹 이름 관리 =====
let groupNames = ['파밍 1', '파밍 2'];

function loadGroupNames() {
  const raw = localStorage.getItem('farming-groups');
  if (raw) { try { groupNames = JSON.parse(raw); } catch(e) {} }
  applyGroupNames();
  if (db) {
    db.collection('farm').doc('groups').get().then(snap => {
      if (snap.exists && snap.data().names) { groupNames = snap.data().names; applyGroupNames(); }
    }).catch(() => {});
  }
}
function saveGroupNames() {
  localStorage.setItem('farming-groups', JSON.stringify(groupNames));
  if (db) db.collection('farm').doc('groups').set({ names: groupNames }).catch(() => {});
}
function applyGroupNames() {
  [0, 1].forEach(idx => {
    const el = document.getElementById(`group-name-${idx + 1}`);
    if (el) el.textContent = groupNames[idx] || `파밍 ${idx + 1}`;
  });
}
function initGroupNameEditing() {
  if (!isOwner) return;
  [0, 1].forEach(idx => {
    const el = document.getElementById(`group-name-${idx + 1}`);
    if (!el || el.dataset.editable) return;
    el.dataset.editable = 'true';
    el.classList.add('editable-name');
    el.onclick = () => {
      const n = prompt('그룹 이름 변경:', groupNames[idx]);
      if (n !== null && n.trim()) { groupNames[idx] = n.trim(); el.textContent = groupNames[idx]; saveGroupNames(); }
    };
  });
}

// ===== 링크 관리 =====
let links = [];
let nextLinkId = 1;

function loadLinks() {
  const raw = localStorage.getItem('farming-links');
  if (raw) {
    try { const d = JSON.parse(raw); links = d.links || []; nextLinkId = d.nextId || 1; } catch(e) {}
  }
  if (links.length === 0) {
    links = [{ id: nextLinkId++, name: '까막산 입구', url: 'https://mashop.kr/jari/%EB%A3%A8%EB%8D%94%EC%8A%A4%ED%98%B8%EC%88%98%3A%20%EA%B9%8C%EB%A7%89%EC%82%B0%20%EC%9E%85%EA%B5%AC' }];
    saveLinks();
  }
  renderLinks();
  if (db) {
    db.collection('farm').doc('links').get().then(snap => {
      if (snap.exists) { const d = snap.data(); links = d.links || []; nextLinkId = d.nextId || 1; renderLinks(); }
    }).catch(() => {});
  }
}

function saveLinks() {
  localStorage.setItem('farming-links', JSON.stringify({ links, nextId: nextLinkId }));
  if (isOwner && db) db.collection('farm').doc('links').set({ links, nextId: nextLinkId }).catch(() => {});
}

function renderLinks() {
  const list = document.getElementById('links-list');
  if (!list) return;
  list.innerHTML = '';
  links.forEach(link => {
    const tag = document.createElement('a');
    tag.className = 'link-tag';
    tag.href = link.url;
    tag.target = '_blank';
    tag.innerHTML = `<span>${link.name}</span>${isOwner ? `<button class="link-del" data-del="${link.id}">×</button>` : ''}`;
    list.appendChild(tag);
  });
  list.querySelectorAll('.link-del').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const link = links.find(l => l.id === parseInt(btn.dataset.del));
      if (!confirm(`"${link ? link.name : '이 링크'}"를 삭제할까요?`)) return;
      links = links.filter(l => l.id !== parseInt(btn.dataset.del));
      saveLinks(); renderLinks();
    };
  });
}

document.getElementById('btn-add-link').onclick = () => {
  document.getElementById('link-form').classList.remove('hidden');
  document.getElementById('link-name').value = '';
  document.getElementById('link-url').value = '';
  document.getElementById('link-name').focus();
};
document.getElementById('link-cancel').onclick = () => document.getElementById('link-form').classList.add('hidden');
document.getElementById('link-save').onclick = () => {
  const name = document.getElementById('link-name').value.trim();
  let url = document.getElementById('link-url').value.trim();
  if (!name || !url) return;
  if (!url.startsWith('http')) url = 'https://' + url;
  links.push({ id: nextLinkId++, name, url });
  saveLinks(); renderLinks();
  document.getElementById('link-form').classList.add('hidden');
};
document.getElementById('link-url').onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('link-save').click(); };

// ===== 아이템탭 빠른 타이머 =====
let qtStart = null, qtElapsed = 0, qtInterval = null;
const qtClock = document.getElementById('qt-clock');
const qtStartBtn = document.getElementById('qt-start');
const qtPauseBtn = document.getElementById('qt-pause');
const qtResetBtn = document.getElementById('qt-reset');

qtStartBtn.onclick = () => {
  qtStart = Date.now() - qtElapsed;
  qtInterval = setInterval(() => { qtElapsed = Date.now() - qtStart; qtClock.textContent = formatTime(qtElapsed); }, 500);
  qtStartBtn.disabled = true; qtPauseBtn.disabled = false;
  qtStartBtn.textContent = '▶ 시작';
};
qtPauseBtn.onclick = () => {
  clearInterval(qtInterval);
  qtStartBtn.disabled = false; qtPauseBtn.disabled = true;
  qtStartBtn.textContent = '▶ 이어서';
};
qtResetBtn.onclick = () => {
  clearInterval(qtInterval);
  qtElapsed = 0; qtStart = null;
  qtClock.textContent = '00:00:00';
  qtStartBtn.disabled = false; qtPauseBtn.disabled = true;
  qtStartBtn.textContent = '▶ 시작';
};

// ===== 아이템 관리 =====
const totalKills = document.getElementById('total-kills');
let items = [];
let nextId = 1;

async function loadItems() {
  // 로컬 캐시로 즉시 렌더링
  const raw = localStorage.getItem('farming-items');
  if (raw) {
    try {
      const data = JSON.parse(raw);
      items = data.items || [];
      nextId = data.nextId || 1;
    } catch (e) {}
  }
  if (items.length === 0) {
    items = [
      { id: nextId++, name: '아이템 1', image: '', rate: 0.5, count: 0, group: 1 },
      { id: nextId++, name: '아이템 2', image: '', rate: 0.5, count: 0, group: 2 }
    ];
  }
  renderItems();

  // Firestore에서 공유 데이터 동기화
  if (db) {
    try {
      const snap = await db.collection('farm').doc('items').get();
      if (snap.exists) {
        const data = snap.data();
        // 로컬에 저장된 이미지와 병합 (오너 기기에서만 이미지 표시)
        const localItems = raw ? (JSON.parse(raw).items || []) : [];
        const imageMap = {};
        localItems.forEach(i => { if (i.image) imageMap[i.id] = i.image; });
        items = (data.items || []).map(item => ({ ...item, image: imageMap[item.id] || '' }));
        nextId = data.nextId || 1;
        renderItems();
      }
    } catch (e) {
      console.log('Firestore 로드 실패, 로컬 데이터 사용');
    }
  }
}
function saveItems() {
  localStorage.setItem('farming-items', JSON.stringify({ items, nextId }));
  syncToFirestore();
}

function calcEstimate(item) {
  if (item.rate > 0 && item.count > 0) {
    return Math.round(item.count / (item.rate / 100));
  }
  return 0;
}

function updateTotalKills() {
  const maxEst = (grp) => {
    let m = 0;
    items.filter(i => (i.group || 1) === grp).forEach(i => { const e = calcEstimate(i); if (e > m) m = e; });
    return m;
  };
  const m1 = maxEst(1), m2 = maxEst(2);
  const total = m1 > 0 && m2 > 0 ? Math.round((m1 + m2) / 2) : Math.max(m1, m2);
  totalKills.textContent = total.toLocaleString() + ' 마리';
}

function renderGroup(gridId, groupNum) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  items.filter(i => (i.group || 1) === groupNum).forEach(item => {
    const card = document.createElement('div');
    card.className = 'item-card';
    const imgHtml = item.image
      ? `<img src="${item.image}" alt="" onerror="this.style.display='none'">`
      : `<span class="placeholder">🖼</span>`;
    const estimate = calcEstimate(item);
    const estimateText = item.rate > 0 && item.count > 0
      ? `약 <strong>${estimate.toLocaleString()}</strong>마리`
      : item.rate > 0
      ? `평균 ${Math.round(1 / (item.rate / 100)).toLocaleString()}마리`
      : '확률 입력';
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
      <p class="item-estimate">${estimateText}</p>
    `;
    grid.appendChild(card);
  });
  grid.querySelectorAll('[data-plus]').forEach(b => {
    b.onclick = () => { const it = items.find(i => i.id === parseInt(b.dataset.plus)); it.count++; saveItems(); renderItems(); };
  });
  grid.querySelectorAll('[data-minus]').forEach(b => {
    b.onclick = () => { const it = items.find(i => i.id === parseInt(b.dataset.minus)); if (it.count > 0) { it.count--; saveItems(); renderItems(); } };
  });
  grid.querySelectorAll('[data-edit]').forEach(b => {
    b.onclick = () => openEdit(parseInt(b.dataset.edit));
  });
  grid.querySelectorAll('[data-count]').forEach(input => {
    input.oninput = () => {
      const val = parseInt(input.value);
      const it = items.find(i => i.id === parseInt(input.dataset.count));
      if (!it) return;
      it.count = isNaN(val) || val < 0 ? 0 : val;
      const estimateEl = input.closest('.item-card').querySelector('.item-estimate');
      const est = calcEstimate(it);
      estimateEl.innerHTML = it.rate > 0 && it.count > 0
        ? `약 <strong>${est.toLocaleString()}</strong>마리`
        : it.rate > 0 ? `평균 ${Math.round(1 / (it.rate / 100)).toLocaleString()}마리` : '확률 입력';
      updateTotalKills();
    };
    input.onblur = () => {
      const it = items.find(i => i.id === parseInt(input.dataset.count));
      if (!it) return;
      if (isNaN(it.count) || it.count < 0) { it.count = 0; input.value = 0; }
      saveItems();
    };
    input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); };
  });
}

function renderItems() {
  renderGroup('items-grid-1', 1);
  renderGroup('items-grid-2', 2);
  updateTotalKills();
}

document.getElementById('btn-add-item-1').onclick = () => {
  items.push({ id: nextId++, name: '새 아이템', image: '', rate: 1, count: 0, group: 1 });
  saveItems(); renderItems();
};
document.getElementById('btn-add-item-2').onclick = () => {
  items.push({ id: nextId++, name: '새 아이템', image: '', rate: 1, count: 0, group: 2 });
  saveItems(); renderItems();
};

// ===== 편집 모달 =====
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
  reader.onload = (e) => showImagePreview(e.target.result);
  reader.readAsDataURL(file);
}

function openEdit(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById('m-name').value = item.name;
  document.getElementById('m-rate').value = item.rate;
  document.getElementById('m-count').value = item.count;
  
  // 이미지 미리보기 초기화
  if (item.image) {
    showImagePreview(item.image);
  } else {
    clearImagePreview();
  }
  
  modal.classList.remove('hidden');
}

// 이미지 업로드 이벤트들
const dropZone = document.getElementById('image-drop-zone');
const fileInput = document.getElementById('image-file');

document.getElementById('image-pick').onclick = (e) => {
  e.stopPropagation();
  fileInput.click();
};
fileInput.onchange = (e) => {
  if (e.target.files[0]) readImageFile(e.target.files[0]);
};
document.getElementById('image-remove').onclick = (e) => {
  e.stopPropagation();
  clearImagePreview();
};

// 드래그앤드롭
dropZone.ondragover = (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
};
dropZone.ondragleave = () => dropZone.classList.remove('dragover');
dropZone.ondrop = (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) readImageFile(e.dataTransfer.files[0]);
};

// 붙여넣기 (Ctrl+V) - 모달이 열려있을 때만 작동
document.addEventListener('paste', (e) => {
  if (modal.classList.contains('hidden')) return;
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      readImageFile(file);
      e.preventDefault();
      break;
    }
  }
});
document.getElementById('m-cancel').onclick = () => modal.classList.add('hidden');
document.getElementById('m-delete').onclick = () => {
  items = items.filter(i => i.id !== editingId);
  saveItems(); renderItems();
  modal.classList.add('hidden');
};
document.getElementById('m-save').onclick = () => {
  const item = items.find(i => i.id === editingId);
  item.name = document.getElementById('m-name').value || '이름 없음';
  item.image = pendingImageData;
  item.rate = parseFloat(document.getElementById('m-rate').value) || 0;
  item.count = parseInt(document.getElementById('m-count').value) || 0;
  saveItems(); renderItems();
  modal.classList.add('hidden');
};

// ===== 타이머 =====
const expStart = document.getElementById('exp-start');
const expEnd = document.getElementById('exp-end');
const locationName = document.getElementById('location-name');
const timerClock = document.getElementById('timer-clock');
const timerStatus = document.getElementById('timer-status');
const liveStats = document.getElementById('live-stats');
const liveExp = document.getElementById('live-exp');
const liveItems = document.getElementById('live-items');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnStop = document.getElementById('btn-stop');
const btnReset = document.getElementById('btn-reset');
const savePrompt = document.getElementById('save-prompt');
const saveSummary = document.getElementById('save-summary');

let startTime = null;
let elapsed = 0;
let intervalId = null;
let sessionStartItems = 0;
let lastSession = null;

function totalItemCount() {
  return items.reduce((sum, i) => sum + (i.count || 0), 0);
}
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return h + ':' + m + ':' + s;
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
  btnStart.disabled = true;
  btnPause.disabled = false;
  btnStop.disabled = false;
  timerStatus.textContent = '진행 중';
  savePrompt.classList.add('hidden');
};
btnPause.onclick = () => {
  if (intervalId) clearInterval(intervalId);
  btnStart.disabled = false;
  btnStart.textContent = '▶ 이어서';
  btnPause.disabled = true;
  timerStatus.textContent = '일시정지';
};
btnStop.onclick = () => {
  if (intervalId) clearInterval(intervalId);
  btnStart.disabled = false;
  btnStart.textContent = '▶ 시작';
  btnPause.disabled = true;
  btnStop.disabled = true;
  timerStatus.textContent = '종료';
  const gained = Math.max(0, (parseInt(expEnd.value) || 0) - (parseInt(expStart.value) || 0));
  const itemsGained = Math.max(0, totalItemCount() - sessionStartItems);
  const hours = elapsed / 3600000;
  lastSession = {
    id: Date.now(),
    date: new Date().toLocaleString('ko-KR'),
    location: locationName.value || '이름 없음',
    durationStr: formatTime(elapsed),
    exp: gained,
    items: itemsGained,
    expPerHour: hours > 0 ? Math.round(gained / hours) : 0,
    itemsPerHour: hours > 0 ? Math.round(itemsGained / hours) : 0
  };
  saveSummary.innerHTML = `<strong>${formatTime(elapsed)}</strong> 동안 경험치 <strong>${gained.toLocaleString()}</strong>, 아이템 <strong>${itemsGained}개</strong>`;
  savePrompt.classList.remove('hidden');
};
btnReset.onclick = () => {
  if (intervalId) clearInterval(intervalId);
  elapsed = 0; startTime = null;
  timerClock.textContent = '00:00:00';
  timerStatus.textContent = '경과 시간';
  btnStart.disabled = false;
  btnStart.textContent = '▶ 시작';
  btnPause.disabled = true;
  btnStop.disabled = true;
  liveStats.classList.add('hidden');
  savePrompt.classList.add('hidden');
};

document.getElementById('btn-save').onclick = () => {
  if (!lastSession) return;
  const h = loadHistory();
  h.unshift(lastSession);
  localStorage.setItem('farming-history', JSON.stringify(h));
  savePrompt.classList.add('hidden');
};

// ===== 기록 =====
function loadHistory() {
  const raw = localStorage.getItem('farming-history');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}
function renderHistory() {
  const list = document.getElementById('history-list');
  const empty = document.getElementById('history-empty');
  const h = loadHistory();
  list.innerHTML = '';
  if (h.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  h.forEach(s => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div class="header">
        <div>
          <p style="font-weight:500">${s.location}</p>
          <p style="font-size:11px;color:#999">${s.date}</p>
        </div>
        ${isOwner ? `<button data-del="${s.id}" class="small-btn">✕</button>` : ''}
      </div>
      <div class="stats">
        <div><span>시간</span><br><strong>${s.durationStr}</strong></div>
        <div><span>경험치</span><br><strong>${s.exp.toLocaleString()}</strong></div>
        <div><span>시당 경험</span><br><strong>${s.expPerHour.toLocaleString()}</strong></div>
        <div><span>시당 아이템</span><br><strong>${s.itemsPerHour}</strong></div>
      </div>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = () => {
      const id = parseInt(b.dataset.del);
      const h = loadHistory().filter(s => s.id !== id);
      localStorage.setItem('farming-history', JSON.stringify(h));
      renderHistory();
    };
  });
}
document.getElementById('btn-signout').onclick = () => {
  isOwner = false;
  localStorage.removeItem('owner_logged_in');
  localStorage.removeItem('owner_name');
  if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
  document.getElementById('auth-info').classList.add('hidden');
  document.getElementById('google-signin-btn').classList.remove('hidden');
  applyAuthState();
  renderItems();
  renderLinks();
};

document.getElementById('btn-clear-all').onclick = () => {
  if (confirm('정말 모든 기록을 삭제할까요?')) {
    localStorage.removeItem('farming-history');
    renderHistory();
  }
};

loadItems();
loadLinks();
loadGroupNames();