
const state = {
  activeView: localStorage.getItem('iot_lab_active_view') || 'catalog',
  adminTab: localStorage.getItem('iot_lab_admin_tab') || 'loans',
  inventory: [],
  cart: [],              
  currentGeneratedLoan: null,
  auth: {
    token: localStorage.getItem('iot_lab_token') || null,
    user: JSON.parse(localStorage.getItem('iot_lab_user') || 'null')
  },
  cashMonth: new Date().toISOString().substring(0, 7) 
};

window.showAppAlert = function(message, title = 'Pemberitahuan Sistem', type = 'info', onConfirm = null) {
  const modal = document.getElementById('modalAppAlert');
  if (!modal) {
    console.warn("modalAppAlert not found:", message);
    return;
  }

  const titleEl = document.getElementById('appAlertTitle');
  const msgEl = document.getElementById('appAlertMessage');
  const footerEl = document.getElementById('appAlertFooter');
  const iconBox = document.getElementById('appAlertIconBox');
  const iconSvg = document.getElementById('appAlertIconSvg');

  const lower = String(message).toLowerCase();
  let computedTitle = title;
  if (title === 'Pemberitahuan Sistem' || title === 'Pemberitahuan') {
    if (lower.includes('berhasil') || lower.includes('sukses') || lower.includes('disalin')) {
      computedTitle = 'Informasi Berhasil';
      type = 'success';
    } else if (lower.includes('gagal') || lower.includes('wajib') || lower.includes('mohon') || lower.includes('silakan') || lower.includes('harap') || lower.includes('tidak boleh')) {
      computedTitle = 'Perhatian';
      type = 'warning';
    }
  }

  if (titleEl) titleEl.textContent = computedTitle;
  if (msgEl) msgEl.textContent = String(message);

  if (iconBox && iconSvg) {
    if (type === 'success') {
      iconBox.style.background = 'rgba(0, 91, 130, 0.08)';
      iconBox.style.color = 'var(--navy)';
      iconSvg.innerHTML = `
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      `;
    } else if (type === 'warning' || type === 'error') {
      iconBox.style.background = 'rgba(15, 23, 42, 0.06)';
      iconBox.style.color = '#334155';
      iconSvg.innerHTML = `
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      `;
    } else {
      iconBox.style.background = 'rgba(0, 91, 130, 0.08)';
      iconBox.style.color = 'var(--navy)';
      iconSvg.innerHTML = `
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      `;
    }
  }

  if (footerEl) {
    if (typeof onConfirm === 'function') {
      footerEl.innerHTML = `
        <button type="button" class="btn btn-outline" onclick="closeAppAlert()" style="font-weight: 600; padding: 0.55rem 1.25rem; font-size: 0.86rem; border-radius: 8px;">Batal</button>
        <button type="button" class="btn btn-primary" id="btnAppAlertConfirmAction" style="font-weight: 700; padding: 0.55rem 1.45rem; font-size: 0.86rem; border-radius: 8px;">Lanjutkan</button>
      `;
      document.getElementById('btnAppAlertConfirmAction').onclick = () => {
        closeAppAlert();
        onConfirm();
      };
    } else {
      footerEl.innerHTML = `
        <button type="button" class="btn btn-primary" id="btnAppAlertOk" onclick="closeAppAlert()" style="font-weight: 700; padding: 0.55rem 1.65rem; font-size: 0.86rem; border-radius: 8px;">
          Mengerti
        </button>
      `;
    }
  }

  modal.classList.add('active');
  setTimeout(() => {
    document.getElementById('btnAppAlertOk')?.focus();
    document.getElementById('btnAppAlertConfirmAction')?.focus();
  }, 50);
};

window.closeAppAlert = function() {
  document.getElementById('modalAppAlert')?.classList.remove('active');
};

window.showAppConfirm = function(message, onConfirm, title = 'Konfirmasi Tindakan') {
  window.showAppAlert(message, title, 'warning', onConfirm);
};

window.alert = function(msg) {
  window.showAppAlert(msg);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const alertModal = document.getElementById('modalAppAlert');
    if (alertModal && alertModal.classList.contains('active')) {
      closeAppAlert();
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initDateInputs();
  bindNavigationEvents();
  bindCatalogEvents();
  bindLoanFormEvents();
  bindTrackEvents();
  bindAdminEvents();
  bindModalEvents();

  loadInventory();
  loadPublicCashSummary();

  handleUrlHash();

  window.addEventListener('hashchange', () => {
    handleUrlHash();
  });
});

function initDateInputs() {
  const today = new Date().toISOString().split('T')[0];
  const borrowDateInput = document.getElementById('borrowDate');
  const returnDateInput = document.getElementById('returnDate');
  if (borrowDateInput) borrowDateInput.min = today;
  if (returnDateInput) returnDateInput.min = today;

  const cashMonthSelect = document.getElementById('adminCashMonth');
  if (cashMonthSelect) cashMonthSelect.value = state.cashMonth;
}

function handleUrlHash() {
  const hash = window.location.hash.replace(/^#/, '');

  if (hash.startsWith('track=')) {
    const trackId = hash.replace('track=', '');
    switchView('track', false);
    const input = document.getElementById('trackUniqueIdInput');
    if (input) input.value = trackId;
    trackLoanRequest(trackId);
    return;
  }

  if (hash.startsWith('admin-')) {
    const subtab = hash.replace('admin-', '');
    switchView('admin', false);
    switchAdminTab(subtab);
    return;
  }

  if (['catalog', 'track', 'admin'].includes(hash)) {
    switchView(hash, false);
    return;
  }

  const savedView = localStorage.getItem('iot_lab_active_view');
  const savedAdminTab = localStorage.getItem('iot_lab_admin_tab');

  if (savedView && ['catalog', 'track', 'admin'].includes(savedView)) {
    switchView(savedView, true);
    if (savedView === 'admin' && savedAdminTab) {
      switchAdminTab(savedAdminTab);
    }
  } else {
    switchView('catalog', false);
  }
}

function switchView(viewName, updateHash = true) {
  state.activeView = viewName;
  localStorage.setItem('iot_lab_active_view', viewName);

  if (updateHash) {
    if (viewName === 'admin' && state.adminTab) {
      window.location.hash = `admin-${state.adminTab}`;
    } else {
      window.location.hash = viewName;
    }
  }

  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-view') === viewName);
  });
  document.querySelectorAll('.mobile-nav-btn').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-view') === viewName);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'admin') {
    renderAdminSection();
  } else if (viewName === 'cash') {
    loadPublicCashSummary();
  }
}

function bindNavigationEvents() {
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-view');
      switchView(target);
    });
  });
}

async function apiGet(endpoint) {
  const headers = {};
  if (state.auth.token) headers['Authorization'] = `Bearer ${state.auth.token}`;
  const res = await fetch(endpoint, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Terjadi kesalahan' }));
    throw new Error(err.error || 'Terjadi kesalahan');
  }
  return res.json();
}

async function apiPost(endpoint, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.auth.token) headers['Authorization'] = `Bearer ${state.auth.token}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Terjadi kesalahan' }));
    throw new Error(err.error || 'Terjadi kesalahan');
  }
  return res.json();
}

async function loadInventory() {
  try {
    const items = await apiGet('/api/inventory');
    state.inventory = items;
    renderCatalog();
    populateCategoryFilters();
    populateInventoryDropdown();
    renderFormSelectedItemsTable();
  } catch (err) {
    console.error("Gagal memuat inventaris:", err);
  }
}

function populateCategoryFilters() {
  const catSelect = document.getElementById('catalogCategoryFilter');
  if (!catSelect) return;
  const categories = [...new Set(state.inventory.map(i => i.category))];
  catSelect.innerHTML = `<option value="">Semua Kategori</option>` +
    categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

function renderCatalog() {
  const container = document.getElementById('catalogItemsGrid');
  if (!container) return;

  const searchQuery = (document.getElementById('catalogSearchInput')?.value || '').toLowerCase();
  const selectedCategory = document.getElementById('catalogCategoryFilter')?.value || '';
  const selectedLoanPolicy = document.getElementById('catalogPolicyFilter')?.value || '';

  const filtered = state.inventory.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery) ||
                        item.location.toLowerCase().includes(searchQuery) ||
                        item.id.toLowerCase().includes(searchQuery);
    const matchCat = !selectedCategory || item.category === selectedCategory;
    const matchPolicy = !selectedLoanPolicy || item.loanable === selectedLoanPolicy;
    return matchSearch && matchCat && matchPolicy;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; background: #fff; border-radius: var(--radius); border: 1px border-color;">
        <p style="font-weight: 700; color: var(--slate-500); font-size: 0.9rem;">Tidak ada barang yang sesuai.</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const inCart = state.cart.find(c => c.item.id === item.id);
    const cartQty = inCart ? inCart.qty : 0;
    const isRestricted = item.loanable === 'restricted';
    const isOutOfStock = item.availableStock <= 0;

    let buttonHtml = '';
    if (isRestricted) {
      buttonHtml = `<button class="btn btn-outline btn-sm" disabled style="font-size: 0.78rem;">Aset Tetap</button>`;
    } else if (isOutOfStock) {
      buttonHtml = `<button class="btn btn-outline btn-sm" disabled style="font-size: 0.78rem;">Stok Kosong</button>`;
    } else if (cartQty > 0) {
      buttonHtml = `
        <div class="qty-stepper">
          <button type="button" onclick="updateCartItem('${item.id}', -1)">-</button>
          <span>${cartQty}</span>
          <button type="button" onclick="updateCartItem('${item.id}', 1)" ${cartQty >= item.availableStock ? 'disabled' : ''}>+</button>
        </div>`;
    } else {
      buttonHtml = `<button type="button" class="btn btn-primary btn-sm" onclick="addToCart('${item.id}')">+ Pinjam</button>`;
    }

    return `
      <div class="item-card-compact">
        <div class="item-compact-main">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span class="cat-tag">${escapeHtml(item.category)}</span>
          </div>
          <h4 class="item-compact-name">${escapeHtml(item.name)}</h4>
          <div class="item-compact-stock">
            Stok Tersedia: <strong>${item.availableStock}/${item.totalStock} ${item.unit}</strong>
          </div>
        </div>
        <div class="item-compact-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="showItemDetailModal('${item.id}')">Detail</button>
          ${buttonHtml}
        </div>
      </div>
    `;
  }).join('');
}

function bindCatalogEvents() {
  document.getElementById('catalogSearchInput')?.addEventListener('input', renderCatalog);
  document.getElementById('catalogCategoryFilter')?.addEventListener('change', renderCatalog);
  document.getElementById('catalogPolicyFilter')?.addEventListener('change', renderCatalog);
}

window.showItemDetailModal = function(itemId) {
  const item = state.inventory.find(i => i.id === itemId);
  if (!item) return;

  let policyText = "Boleh Dipinjam (Umum & Internal)";
  let policyClass = "policy-all";
  if (item.loanable === 'internal_only') {
    policyText = "Khusus Internal Lab IoT";
    policyClass = "policy-internal";
  } else if (item.loanable === 'restricted') {
    policyText = "Aset Tetap Lab (Hanya di Tempat)";
    policyClass = "policy-restricted";
  }

  const isRestricted = item.loanable === 'restricted';
  const inCart = state.cart.find(c => c.item.id === item.id);
  const cartQty = inCart ? inCart.qty : 0;

  const modalBody = document.getElementById('itemDetailModalBody');
  const itemImg = item.imageUrl || '/assets/logo-iot-lab.png';

  modalBody.innerHTML = `
    <div class="item-detail-layout">

      <div class="item-detail-visual">
        <div class="item-detail-image-wrapper">
          <img src="${itemImg}" alt="${escapeHtml(item.name)}" class="item-detail-img" onerror="this.src='/assets/logo-iot-lab.png'">
        </div>
        <div class="item-detail-visual-badges">
          <span class="detail-policy-badge ${policyClass}">${policyText}</span>
        </div>
        ${state.activeView === 'admin' ? `
          <button type="button" class="btn btn-outline btn-sm" onclick="showItemQrModal('${item.id}')" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; margin-top: 0.25rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Cetak Label QR
          </button>
        ` : ''}
      </div>

      <div class="item-detail-info">
        <div class="item-detail-header-info">
          <span class="item-detail-category-tag">${escapeHtml(item.category)}</span>
          <h2 class="item-detail-title">${escapeHtml(item.name)}</h2>
        </div>

        <div class="item-detail-grid">

          <div class="detail-spec-card">
            <div class="spec-card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <div class="spec-card-content">
              <span class="spec-label">Status Ketersediaan</span>
              <div class="spec-val-stock ${item.availableStock > 0 ? 'available' : 'empty'}">
                ${item.availableStock} / ${item.totalStock} ${item.unit}
              </div>
              <div class="spec-subtext">${item.borrowedStock > 0 ? item.borrowedStock + ' Unit Sedang Dipinjam' : 'Semua Unit Tersedia'}</div>
            </div>
          </div>

          <div class="detail-spec-card">
            <div class="spec-card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div class="spec-card-content">
              <span class="spec-label">Lokasi Simpan Fisik</span>
              <div class="spec-val-location">${escapeHtml(item.location || 'Laboratorium IoT')}</div>
              <div class="spec-subtext">Inventaris Fisik Lab</div>
            </div>
          </div>
        </div>

        <div class="detail-description-section">
          <span class="spec-label">Deskripsi & Spesifikasi Teknis</span>
          <p class="detail-description-text">${escapeHtml(item.description || 'Tidak ada deskripsi tambahan.')}</p>
        </div>

        <div class="item-detail-actions-bar">
          ${state.activeView === 'admin' ? `
            <div style="display: flex; gap: 0.65rem; width: 100%; justify-content: flex-end;">
              <button type="button" class="btn btn-outline btn-sm" onclick="editItemPrompt('${item.id}'); document.getElementById('modalItemDetail').classList.remove('active');" style="font-weight: 700;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Aset
              </button>
              <button type="button" class="btn btn-danger btn-sm" onclick="deleteItemPrompt('${item.id}'); document.getElementById('modalItemDetail').classList.remove('active');" style="font-weight: 700;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Hapus Aset
              </button>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <div>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--slate-700); display: block;">Pinjam Barang Ini</span>
                <span style="font-size: 0.75rem; color: var(--slate-500);">${item.availableStock > 0 ? 'Maksimal ' + item.availableStock + ' ' + item.unit : 'Stok kosong'}</span>
              </div>
              ${!isRestricted && item.availableStock > 0 ? `
                ${cartQty > 0 ? `
                  <div class="qty-stepper">
                    <button type="button" onclick="updateCartItem('${item.id}', -1); showItemDetailModal('${item.id}');">-</button>
                    <span style="font-weight: 700; font-size: 0.85rem; min-width: 90px; text-align: center;">${cartQty} ${item.unit} Terpilih</span>
                    <button type="button" onclick="updateCartItem('${item.id}', 1); showItemDetailModal('${item.id}');" ${cartQty >= item.availableStock ? 'disabled' : ''}>+</button>
                  </div>
                ` : `
                  <button class="btn btn-primary btn-sm" onclick="addToCart('${item.id}'); showItemDetailModal('${item.id}');" style="font-weight: 700; padding: 0.45rem 1rem;">
                    + Tambah ke Peminjaman
                  </button>
                `}
              ` : `
                <span style="font-size: 0.8rem; color: var(--slate-500); font-style: italic;">
                  ${isRestricted ? 'Aset tetap lab (tidak dapat dipinjam)' : 'Stok habis'}
                </span>
              `}
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  document.getElementById('modalItemDetail').classList.add('active');
};

function populatePickerCategories() {
  const select = document.getElementById('pickerCategoryFilter');
  if (!select) return;
  const loanableItems = state.inventory.filter(i => i.loanable !== 'restricted');
  const categories = [...new Set(loanableItems.map(i => i.category))];
  select.innerHTML = `<option value="">Semua Kategori</option>` +
    categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

window.renderPickerGrid = function() {
  const container = document.getElementById('pickerGridContainer');
  const summaryText = document.getElementById('pickerSummaryText');
  if (!container) return;

  const searchQuery = (document.getElementById('pickerSearchInput')?.value || '').toLowerCase();
  const selectedCat = document.getElementById('pickerCategoryFilter')?.value || '';

  const loanableItems = state.inventory.filter(item => {
    if (item.loanable === 'restricted') return false;
    const matchSearch = item.name.toLowerCase().includes(searchQuery) ||
                        item.id.toLowerCase().includes(searchQuery) ||
                        item.category.toLowerCase().includes(searchQuery);
    const matchCat = !selectedCat || item.category === selectedCat;
    return matchSearch && matchCat;
  });

  if (summaryText) {
    const totalQty = state.cart.reduce((sum, c) => sum + c.qty, 0);
    summaryText.textContent = `${state.cart.length} Jenis Barang Dipilih (${totalQty} Unit)`;
  }

  if (loanableItems.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--slate-500);">
        <p style="font-weight: 700;">Tidak ada barang yang dapat dipinjam sesuai pencarian.</p>
      </div>`;
    return;
  }

  container.innerHTML = loanableItems.map(item => {
    const inCart = state.cart.find(c => c.item.id === item.id);
    const cartQty = inCart ? inCart.qty : 0;
    const isOutOfStock = item.availableStock <= 0;

    let actionHtml = '';
    if (isOutOfStock) {
      actionHtml = `<span class="stock-badge empty">Stok Habis</span>`;
    } else if (cartQty > 0) {
      actionHtml = `
        <div class="qty-stepper">
          <button type="button" onclick="updateCartItem('${item.id}', -1); renderPickerGrid();">-</button>
          <span style="font-weight: bold; min-width: 32px; text-align: center;">${cartQty} ${item.unit}</span>
          <button type="button" onclick="updateCartItem('${item.id}', 1); renderPickerGrid();" ${cartQty >= item.availableStock ? 'disabled' : ''}>+</button>
        </div>`;
    } else {
      actionHtml = `<button type="button" class="btn btn-primary btn-sm" onclick="addToCart('${item.id}'); renderPickerGrid();">+ Pinjam</button>`;
    }

    return `
      <div class="picker-card ${cartQty > 0 ? 'selected' : ''}">
        <div class="picker-card-thumb">
          <img src="/assets/logo-iot-lab.png" alt="Logo IoT Lab" class="picker-thumb-logo">
        </div>
        <div class="picker-card-body">
          <h4 class="picker-card-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h4>
          <div class="picker-card-stock-row">
            <span class="stock-badge ${isOutOfStock ? 'empty' : 'available'}">
              Tersedia: <strong>${item.availableStock} / ${item.totalStock} ${item.unit}</strong>
            </span>
            ${item.loanable === 'internal_only' ? '<span class="policy-badge">Khusus Internal</span>' : ''}
          </div>
        </div>
        <div class="picker-card-footer">
          <button type="button" class="btn btn-outline btn-sm" onclick="showItemDetailModal('${item.id}')" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">
            Detail
          </button>
          ${actionHtml}
        </div>
      </div>
    `;
  }).join('');
};

window.openItemPickerModal = function() {
  populatePickerCategories();
  renderPickerGrid();
  document.getElementById('modalItemPicker').classList.add('active');
};

function populateInventoryDropdown() {
  const select = document.getElementById('selectInventoryItem');
  if (!select) return;

  if (!state.inventory || state.inventory.length === 0) {
    select.innerHTML = `<option value="">-- Tidak ada inventaris --</option>`;
    return;
  }

  select.innerHTML = `<option value="">-- Pilih Barang dari Inventaris --</option>` +
    state.inventory.map(item => {
      const isRestricted = item.loanable === 'restricted';
      const isOutOfStock = item.availableStock <= 0;
      let label = `${item.name} - Stok: ${item.availableStock} ${item.unit}`;
      if (isRestricted) label += ' [Aset Tetap Lab - Tidak Dapat Dipinjam]';
      else if (isOutOfStock) label += ' [Stok Habis]';

      return `<option value="${item.id}" ${isRestricted || isOutOfStock ? 'disabled' : ''}>${escapeHtml(label)}</option>`;
    }).join('');
}

function renderFormSelectedItemsTable() {
  const tbody = document.getElementById('selectedItemsTableBody');
  if (!tbody) return;

  if (state.cart.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--slate-500); padding: 1.25rem;">
          Belum ada barang dipilih. Klik tombol <strong>"+ Tambah Barang"</strong> di atas.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = state.cart.map(c => {
    const itemImg = c.item.imageUrl || '/assets/logo-iot-lab.png';
    return `
      <tr>
        <td style="text-align: center; width: 55px;">
          <img src="${itemImg}" alt="${escapeHtml(c.item.name)}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color); background: var(--slate-100);" onerror="this.src='/assets/logo-iot-lab.png'">
        </td>
        <td>
          <div style="font-weight: 700; color: var(--slate-900); font-size: 0.88rem;">${escapeHtml(c.item.name)}</div>
          <div style="font-size: 0.75rem; color: var(--slate-500);">${escapeHtml(c.item.category || '')}</div>
        </td>
        <td style="text-align: center;">
          <div class="qty-stepper" style="justify-content: center; display: inline-flex;">
            <button type="button" onclick="updateCartItem('${c.item.id}', -1)">-</button>
            <span style="min-width: 45px; text-align: center;">${c.qty} ${c.item.unit}</span>
            <button type="button" onclick="updateCartItem('${c.item.id}', 1)" ${c.qty >= c.item.availableStock ? 'disabled' : ''}>+</button>
          </div>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-outline btn-sm" style="color: var(--kredit-red); padding: 0.25rem 0.65rem;" onclick="removeFromCart('${c.item.id}')">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.addToCart = function(itemId) {
  const item = state.inventory.find(i => i.id === itemId);
  if (!item) return;

  if (item.loanable === 'restricted') {
    alert("Barang ini adalah aset tetap lab dan tidak dapat dipinjam.");
    return;
  }

  const existing = state.cart.find(c => c.item.id === itemId);
  if (existing) {
    if (existing.qty < item.availableStock) {
      existing.qty += 1;
    }
  } else {
    state.cart.push({ item, qty: 1 });
  }

  renderCatalog();
  renderSelectedItemsTray();
  renderFormSelectedItemsTable();
};

window.updateCartItem = function(itemId, delta) {
  const existing = state.cart.find(c => c.item.id === itemId);
  if (!existing) return;

  existing.qty += delta;
  if (existing.qty <= 0) {
    state.cart = state.cart.filter(c => c.item.id !== itemId);
  } else if (existing.qty > existing.item.availableStock) {
    existing.qty = existing.item.availableStock;
  }

  renderCatalog();
  renderSelectedItemsTray();
  renderFormSelectedItemsTable();
};

window.removeFromCart = function(itemId) {
  state.cart = state.cart.filter(c => c.item.id !== itemId);
  renderCatalog();
  renderSelectedItemsTray();
  renderFormSelectedItemsTable();
};

function renderSelectedItemsTray() {
  const tray = document.getElementById('selectedItemsContainer');
  const countBadge = document.getElementById('selectedItemsCount');
  if (!tray) return;

  if (countBadge) countBadge.textContent = state.cart.length;

  if (state.cart.length === 0) {
    tray.innerHTML = `
      <div style="text-align: center; padding: 1rem; color: var(--slate-500); font-size: 0.85rem;">
        Belum ada barang dipilih. Silakan pilih barang dari daftar inventaris di atas.
      </div>`;
    return;
  }

  tray.innerHTML = state.cart.map(c => `
    <div class="tray-item">
      <div>
        <strong style="font-size: 0.9rem; color: var(--slate-900);">${escapeHtml(c.item.name)}</strong>
        <div style="font-size: 0.78rem; color: var(--slate-500);">${escapeHtml(c.item.category || '')}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <div class="qty-stepper">
          <button type="button" onclick="updateCartItem('${c.item.id}', -1)">-</button>
          <span>${c.qty} ${c.item.unit}</span>
          <button type="button" onclick="updateCartItem('${c.item.id}', 1)" ${c.qty >= c.item.availableStock ? 'disabled' : ''}>+</button>
        </div>
        <button type="button" class="btn btn-outline btn-sm" style="color: var(--kredit-red);" onclick="removeFromCart('${c.item.id}')">Hapus</button>
      </div>
    </div>
  `).join('');
}

function bindLoanFormEvents() {
  const form = document.getElementById('formLoanRequest');
  if (!form) return;

  const btnOpenPicker = document.getElementById('btnOpenItemPickerModal');
  if (btnOpenPicker) {
    btnOpenPicker.addEventListener('click', () => {
      openItemPickerModal();
    });
  }

  const pickerSearch = document.getElementById('pickerSearchInput');
  if (pickerSearch) {
    pickerSearch.addEventListener('input', () => renderPickerGrid());
  }

  const pickerCategory = document.getElementById('pickerCategoryFilter');
  if (pickerCategory) {
    pickerCategory.addEventListener('change', () => renderPickerGrid());
  }

  const btnPreviewDraft = document.getElementById('btnPreviewDraftLetter');
  if (btnPreviewDraft) {
    btnPreviewDraft.addEventListener('click', async () => {
      if (state.cart.length === 0) {
        alert("Harap pilih minimal satu barang dari daftar inventaris terlebih dahulu.");
        return;
      }

      const borrowerName = document.getElementById('borrowerName').value.trim();
      const borrowerNim = document.getElementById('borrowerNim').value.trim();
      const borrowerType = document.getElementById('borrowerType').value;
      const institutionName = document.getElementById('institutionName').value.trim();
      const whatsapp = document.getElementById('borrowerWa').value.trim();
      const email = document.getElementById('borrowerEmail').value.trim();
      const purpose = document.getElementById('borrowPurpose').value.trim();
      const borrowDate = document.getElementById('borrowDate').value;
      const returnDate = document.getElementById('returnDate').value;

      if (!borrowerName || !borrowerNim || !whatsapp || !borrowDate || !returnDate || !purpose) {
        alert("Mohon lengkapi semua data peminjam, jadwal, dan keperluan terlebih dahulu.");
        return;
      }

      btnPreviewDraft.disabled = true;
      btnPreviewDraft.textContent = 'Membuat Dokumen...';

      try {
        const payload = {
          borrowerName,
          borrowerNim,
          borrowerType,
          institutionName,
          whatsapp,
          email,
          purpose,
          borrowDate,
          returnDate,
          items: state.cart.map(c => ({ itemId: c.item.id, qty: c.qty }))
        };

        const result = await apiPost('/api/loans/generate-request', payload);
        state.currentGeneratedLoan = result;
        openOfficialLetterModal(result);
      } catch (err) {
        alert("Gagal membuat dokumen surat: " + err.message);
      } finally {
        btnPreviewDraft.disabled = false;
        btnPreviewDraft.textContent = 'Generate Surat Peminjaman';
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (state.cart.length === 0) {
      alert("Harap pilih minimal satu barang dari daftar inventaris sebelum mengirim permohonan.");
      return;
    }

    const signedFileInput = document.getElementById('formSignedDocInput');
    if (!signedFileInput || !signedFileInput.files || !signedFileInput.files[0]) {
      alert("Mohon unggah file scan Surat Peminjaman yang telah ditandatangani basah.");
      return;
    }

    const borrowerName = document.getElementById('borrowerName').value.trim();
    const borrowerNim = document.getElementById('borrowerNim').value.trim();
    const borrowerType = document.getElementById('borrowerType').value;
    const institutionName = document.getElementById('institutionName').value.trim();
    const whatsapp = document.getElementById('borrowerWa').value.trim();
    const email = document.getElementById('borrowerEmail').value.trim();
    const purpose = document.getElementById('borrowPurpose').value.trim();
    const borrowDate = document.getElementById('borrowDate').value;
    const returnDate = document.getElementById('returnDate').value;
    const idCardFileInput = document.getElementById('formIdCardInput');

    if (!borrowerName || !borrowerNim || !whatsapp || !borrowDate || !returnDate || !purpose) {
      alert("Mohon isi semua data formulir peminjaman.");
      return;
    }

    if (new Date(returnDate) < new Date(borrowDate)) {
      alert("Tanggal pengembalian tidak boleh lebih awal dari tanggal peminjaman.");
      return;
    }

    const submitBtn = document.getElementById('btnSubmitFullLoan');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim Permohonan & Berkas...';

    try {
      const formData = new FormData();
      formData.append('borrowerName', borrowerName);
      formData.append('borrowerNim', borrowerNim);
      formData.append('borrowerType', borrowerType);
      formData.append('institutionName', institutionName);
      formData.append('whatsapp', whatsapp);
      formData.append('email', email);
      formData.append('purpose', purpose);
      formData.append('borrowDate', borrowDate);
      formData.append('returnDate', returnDate);
      formData.append('itemsJson', JSON.stringify(state.cart.map(c => ({ itemId: c.item.id, qty: c.qty }))));

      formData.append('signedDocument', signedFileInput.files[0]);
      if (idCardFileInput && idCardFileInput.files && idCardFileInput.files[0]) {
        formData.append('idCard', idCardFileInput.files[0]);
      }

      const res = await fetch('/api/loans/submit-full-request', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal mengirim permohonan' }));
        throw new Error(err.error || 'Gagal mengirim permohonan');
      }

      const result = await res.json();

      form.reset();
      state.cart = [];
      renderFormSelectedItemsTable();
      renderCatalog();

      switchView('track');
      document.getElementById('trackUniqueIdInput').value = result.uniqueId;
      trackLoanRequest(result.uniqueId);

      alert(`Permohonan Peminjaman Berhasil Dikirim!\n\nID Pelacakan Anda: ${result.uniqueId}\nSimpan ID ini untuk memantau status persetujuan laboran.`);

    } catch (err) {
      alert("Gagal mengirim permohonan: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Kirim Permohonan Peminjaman';
    }
  });
}

function openOfficialLetterModal(data) {
  const { uniqueId, loan, qrCodeDataUrl } = data;
  const container = document.getElementById('officialLetterRenderContainer');
  if (!container) return;

  const dateFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const borrowDateFormatted = new Date(loan.borrowDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const returnDateFormatted = new Date(loan.returnDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let borrowerTypeLabel = "Pihak Eksternal / Ormawa";
  if (loan.borrower.type === 'internal_lab') borrowerTypeLabel = "Internal Asisten / Member Lab IoT";
  if (loan.borrower.type === 'ukm') borrowerTypeLabel = "UKM Telkom University";
  if (loan.borrower.type === 'lab_lain') borrowerTypeLabel = "Laboratorium Lain";

  container.innerHTML = `
    <div class="official-letter-doc" id="printableLetterArea">
      <div class="letter-kop">
        <img src="/assets/logo-iot-lab.png" alt="Logo Internet of Things Laboratory" class="letter-kop-logo">
        <div class="letter-kop-text">
          <h2>INTERNET OF THINGS LABORATORY</h2>
          <h3>TELKOM UNIVERSITY</h3>
          <p>Telkom University Landmark Tower Lantai 6 Ruang 12 • Bandung 40257</p>
          <p>Email: iotlab@telkomuniversity.ac.id • Web: iotlab.telkomuniversity.ac.id</p>
        </div>
      </div>

      <div class="letter-meta-row">
        <div>
          <div>Nomor Surat: <strong>${uniqueId}/TEL-U/IOT/${new Date().getFullYear()}</strong></div>
          <div>Tanggal Dokumen: ${dateFormatted}</div>
          <div>Perihal: <strong>Permohonan Peminjaman Aset & Komponen Lab IoT</strong></div>
        </div>
      </div>

      <div class="letter-title">SURAT PERNYATAAN & PEMINJAMAN ALAT</div>

      <p class="letter-body-p">Yang bertanda tangan di bawah ini:</p>

      <table class="letter-table-info">
        <tr>
          <td style="width: 170px;"><strong>Nama Lengkap</strong></td>
          <td style="width: 15px;">:</td>
          <td>${escapeHtml(loan.borrower.name)}</td>
        </tr>
        <tr>
          <td><strong>NIM / NIP</strong></td>
          <td>:</td>
          <td>${escapeHtml(loan.borrower.nim)}</td>
        </tr>
        <tr>
          <td><strong>Kategori Peminjam</strong></td>
          <td>:</td>
          <td>${borrowerTypeLabel} (${escapeHtml(loan.borrower.institutionName)})</td>
        </tr>
        <tr>
          <td><strong>No. WhatsApp / Kontak</strong></td>
          <td>:</td>
          <td>${escapeHtml(loan.borrower.whatsapp)} ${loan.borrower.email ? ' / ' + escapeHtml(loan.borrower.email) : ''}</td>
        </tr>
        <tr>
          <td><strong>Keperluan Penggunaan</strong></td>
          <td>:</td>
          <td>${escapeHtml(loan.purpose)}</td>
        </tr>
        <tr>
          <td><strong>Durasi Peminjaman</strong></td>
          <td>:</td>
          <td><strong>${borrowDateFormatted}</strong> s.d. <strong>${returnDateFormatted}</strong></td>
        </tr>
      </table>

      <p class="letter-body-p">
        Dengan ini mengajukan permohonan peminjaman barang/aset milik Internet of Things Laboratory, Telkom University sebagai berikut:
      </p>

      <table class="letter-table-items">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">No</th>
            <th style="width: 110px;">Kode Barang</th>
            <th>Nama Barang & Spesifikasi</th>
            <th style="width: 140px;">Lokasi Lab</th>
            <th style="width: 80px; text-align: center;">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          ${loan.items.map((item, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td><strong>${item.itemId}</strong></td>
              <td>${escapeHtml(item.name)}</td>
              <td>${escapeHtml(item.location)}</td>
              <td style="text-align: center;"><strong>${item.qty} ${item.unit}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <p class="letter-body-p" style="font-size: 0.88rem; margin-top: 0.85rem;">
        <strong>Ketentuan & Kewajiban Peminjam:</strong><br>
        1. Bertanggung jawab penuh atas keutuhan, kebersihan, dan fungsi normal dari seluruh barang yang dipinjam.<br>
        2. Mengembalikan barang tepat waktu sebelum batas akhir tanggal pengembalian di atas.<br>
        3. Apabila terjadi kerusakan atau kehilangan barang, peminjam bersedia mengganti dengan spesifikasi yang sama atau setara sesuai ketetapan Laboratorium IoT.<br>
        4. Surat ini wajib dicetak, ditandatangani basah, lalu diunggah kembali ke sistem untuk diverifikasi oleh pihak pengelola.
      </p>

      <div style="margin-top: 1rem; padding: 0.5rem 0; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; font-size: 0.88rem; display: flex; justify-content: space-between; align-items: center;">
        <div>Unique Tracking ID: <strong style="font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px;">${uniqueId}</strong></div>
        <div style="font-size: 0.8rem; color: #555;">Status Dokumen: Permohonan Resmi</div>
      </div>

      <div class="letter-signatures">
        <div class="sig-col">
          <p>Bandung, ${dateFormatted}</p>
          <p><strong>Pemohon / Peminjam,</strong></p>
          <div class="sig-box">
            <span class="sig-box-notice">[Tanda Tangan Basah & Nama Terang]</span>
          </div>
          <p><strong>( ${escapeHtml(loan.borrower.name)} )</strong></p>
          <p style="font-size: 0.8rem; color: #555;">NIM: ${escapeHtml(loan.borrower.nim)}</p>
        </div>

        <div class="sig-col">
          <p>Mengetahui / Menyetujui,</p>
          <p><strong>Pengelola / Laboran IoT Lab,</strong></p>
          <div class="sig-box">
            <span class="sig-box-notice">[Tanda Tangan & Cap Lab IoT]</span>
          </div>
          <p><strong>( Laboran / Kalab IoT )</strong></p>
          <p style="font-size: 0.8rem; color: #555;">Internet of Things Laboratory</p>
        </div>
      </div>

      <div style="margin-top: 1.5rem; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #000; padding-top: 0.75rem;">
        <div style="font-size: 0.78rem; color: #444;">
          <strong>Verifikasi Digital Dokumen:</strong><br>
          Pindai QR code di samping untuk mengecek validitas & pelacakan status peminjaman di sistem resmi Lab IoT.
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="text-align: right; font-size: 0.75rem; color: #555;">
            <strong>QR Autentikasi</strong><br>
            <span style="font-family: 'JetBrains Mono', monospace;">${uniqueId}</span>
          </div>
          <img src="${qrCodeDataUrl}" alt="QR Verification" style="width: 64px; height: 64px; border: 1px solid #999; padding: 2px; background: #fff;">
        </div>
      </div>
    </div>
  `;

  document.getElementById('letterModalUniqueIdBadge').textContent = uniqueId;
  document.getElementById('uploadTargetUniqueId').value = uniqueId;
  document.getElementById('uploadUniqueIdDisplay').textContent = uniqueId;

  document.getElementById('modalOfficialLetter').classList.add('active');
}

window.printOfficialLetter = function() { window.print(); };

window.proceedToUploadModal = function() {
  document.getElementById('modalOfficialLetter').classList.remove('active');
  document.getElementById('modalUploadSigned').classList.add('active');
};

function bindModalEvents() {
  document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentModal = btn.closest('.modal-overlay');
      if (parentModal) {
        parentModal.classList.remove('active');
      } else {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      }
    });
  });

  const uploadForm = document.getElementById('formUploadSignedLetter');
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const uniqueId = document.getElementById('uploadTargetUniqueId').value;
      const fileInput = document.getElementById('fileSignedLetter');
      const ktmInput = document.getElementById('fileKtm');

      if (!fileInput.files || fileInput.files.length === 0) {
        alert("Wajib memilih berkas foto/scan surat yang telah ditandatangani!");
        return;
      }

      const formData = new FormData();
      formData.append('uniqueId', uniqueId);
      formData.append('signedDocument', fileInput.files[0]);
      if (ktmInput.files && ktmInput.files.length > 0) {
        formData.append('idCard', ktmInput.files[0]);
      }

      const submitBtn = document.getElementById('btnSubmitUpload');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengunggah Berkas...';

      try {
        const res = await fetch('/api/loans/upload-document', {
          method: 'POST',
          body: formData
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Gagal mengunggah berkas');

        alert(`SUKSES! Berkas permohonan peminjaman dengan ID [${uniqueId}] telah berhasil dikirim ke pengelola Lab IoT.`);

        document.getElementById('modalUploadSigned').classList.remove('active');

        state.cart = [];
        renderCatalog();
        renderSelectedItemsTray();
        document.getElementById('formLoanRequest').reset();

        switchView('track');
        document.getElementById('trackUniqueIdInput').value = uniqueId;
        trackLoanRequest(uniqueId);

      } catch (err) {
        alert("Gagal mengunggah berkas: " + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Berkas Peminjaman';
      }
    });
  }
}

function bindTrackEvents() {
  const btnTrack = document.getElementById('btnTrackRequest');
  const inputTrack = document.getElementById('trackUniqueIdInput');

  btnTrack?.addEventListener('click', () => {
    const id = inputTrack.value.trim();
    if (!id) {
      alert("Silakan masukkan Nomor Tiket / Unique ID Peminjaman.");
      return;
    }
    trackLoanRequest(id);
  });

  inputTrack?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const id = inputTrack.value.trim();
      if (id) {
        trackLoanRequest(id);
      } else {
        alert("Silakan masukkan Nomor Tiket / Unique ID Peminjaman.");
      }
    }
  });
}

async function trackLoanRequest(uniqueId) {
  const container = document.getElementById('trackResultContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="track-card" style="text-align: center; padding: 3rem 1.5rem;">
      <div style="width: 36px; height: 36px; border: 3px solid var(--slate-200); border-top-color: var(--primary); border-radius: 50%; margin: 0 auto 1rem auto; animation: spin 0.8s linear infinite;"></div>
      <p style="color: var(--slate-600); font-weight: 700; margin: 0;">Mencari data tiket permohonan <code>${escapeHtml(uniqueId)}</code>...</p>
    </div>
  `;

  try {
    const loan = await apiGet(`/api/loans/track/${encodeURIComponent(uniqueId)}`);

    let statusClass = 'status-pending';
    if (loan.status === 'DISETUJUI') statusClass = 'status-approved';
    if (loan.status === 'DIPINJAM') statusClass = 'status-borrowed';
    if (loan.status === 'SELESAI') statusClass = 'status-completed';
    if (loan.status === 'DITOLAK') statusClass = 'status-rejected';

    const borrowDateFormatted = new Date(loan.borrowDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const returnDateFormatted = new Date(loan.returnDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const submittedDateStr = new Date(loan.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const isUploaded = !!loan.documents.signedDocumentUrl;
    const isApproved = loan.status === 'DISETUJUI' || loan.status === 'DIPINJAM' || loan.status === 'SELESAI';
    const isBorrowed = loan.status === 'DIPINJAM' || loan.status === 'SELESAI';
    const isCompleted = loan.status === 'SELESAI';

    const step1Class = 'completed';
    const step2Class = isUploaded ? 'completed' : 'active';
    const step3Class = isApproved ? 'completed' : (isUploaded ? 'active' : '');
    const step4Class = isBorrowed ? 'completed' : (isApproved ? 'active' : '');
    const step5Class = isCompleted ? 'completed' : (isBorrowed ? 'active' : '');

    const checkIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    container.innerHTML = `
      <div class="track-card">

        <div class="track-header">
          <div class="track-header-left">
            <div class="track-ticket-tag">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              NOMOR TIKET PERMOHONAN
            </div>
            <div class="track-ticket-id-row">
              <h1 class="track-ticket-id">${escapeHtml(loan.uniqueId)}</h1>
              <button type="button" class="btn-copy-ticket" onclick="navigator.clipboard.writeText('${escapeHtml(loan.uniqueId)}'); alert('Nomor tiket berhasil disalin!');" title="Salin nomor tiket">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Salin Tiket
              </button>
            </div>
            <div class="track-meta-row">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Diajukan pada: <strong>${submittedDateStr}</strong>
              </span>
            </div>
          </div>
          <div class="track-header-right">
            <div class="track-status-pill ${statusClass}">
              <span class="status-pulse-dot"></span>
              <span>${escapeHtml(loan.statusLabel)}</span>
            </div>
          </div>
        </div>

        <div class="track-stepper-box">
          <div class="track-stepper-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            Alur Progres Permohonan
          </div>

          <div class="track-timeline">

            <div class="track-step ${step1Class}">
              <div class="track-step-node">${checkIcon}</div>
              <div class="track-step-body">
                <div class="track-step-title">1. Registrasi & Generate Surat</div>
                <div class="track-step-desc">Permohonan peminjaman berhasil dibuat dan terdaftar di sistem Lab IoT.</div>
              </div>
            </div>

            <div class="track-step ${step2Class}">
              <div class="track-step-node">${isUploaded ? checkIcon : '2'}</div>
              <div class="track-step-body">
                <div class="track-step-title">2. Unggah Berkas Surat Bertanda Tangan</div>
                <div class="track-step-desc">
                  ${isUploaded 
                    ? `<span style="color: var(--debit-green); font-weight: 700;">✓ Berkas resmi diunggah</span> pada ${new Date(loan.documents.uploadedAt).toLocaleString('id-ID')}` 
                    : '<span style="color: #b45309; font-weight: 700;">⚠️ Menunggu upload berkas surat yang telah ditandatangani.</span>'}
                </div>
              </div>
            </div>

            <div class="track-step ${step3Class}">
              <div class="track-step-node">${isApproved ? checkIcon : '3'}</div>
              <div class="track-step-body">
                <div class="track-step-title">3. Verifikasi & Persetujuan Pengelola</div>
                <div class="track-step-desc">
                  ${isApproved 
                    ? `<span style="color: var(--debit-green); font-weight: 700;">✓ Disetujui</span> oleh ${escapeHtml(loan.audit.verifiedBy || 'Laboran')} pada ${new Date(loan.audit.verifiedAt).toLocaleString('id-ID')}` 
                    : (isUploaded ? 'Berkas sedang dalam tahap peninjauan oleh laboran.' : 'Menunggu berkas surat diunggah oleh peminjam.')}
                </div>
              </div>
            </div>

            <div class="track-step ${step4Class}">
              <div class="track-step-node">${isBorrowed ? checkIcon : '4'}</div>
              <div class="track-step-body">
                <div class="track-step-title">4. Serah Terima Fisik Alat</div>
                <div class="track-step-desc">
                  ${isBorrowed 
                    ? `<span style="color: var(--debit-green); font-weight: 700;">✓ Alat telah diserahterimakan</span> pada ${new Date(loan.audit.handoverAt).toLocaleString('id-ID')}` 
                    : (isApproved ? 'Silakan datang ke Lab IoT untuk serah terima dan cek fisik alat.' : 'Barang dapat diambil setelah permohonan disetujui.')}
                </div>
              </div>
            </div>

            <div class="track-step ${step5Class}">
              <div class="track-step-node">${isCompleted ? checkIcon : '5'}</div>
              <div class="track-step-body">
                <div class="track-step-title">5. Pengembalian & Pemeriksaan Aset</div>
                <div class="track-step-desc">
                  ${isCompleted 
                    ? `<span style="color: var(--debit-green); font-weight: 700;">✓ Selesai & Dikembalikan</span> pada ${new Date(loan.audit.returnedAt).toLocaleString('id-ID')}` 
                    : 'Barang wajib dikembalikan sesuai jadwal batas kembali dalam kondisi baik.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="track-info-grid">

          <div class="track-info-card">
            <div class="track-info-card-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Identitas Peminjam
            </div>
            <div class="track-kv-row">
              <span class="track-kv-k">Nama Lengkap</span>
              <span class="track-kv-v">${escapeHtml(loan.borrower.name)}</span>
            </div>
            <div class="track-kv-row">
              <span class="track-kv-k">NIM / NIP</span>
              <span class="track-kv-v" style="font-family: 'JetBrains Mono', monospace;">${escapeHtml(loan.borrower.nim)}</span>
            </div>
            <div class="track-kv-row">
              <span class="track-kv-k">Instansi / Jurusan</span>
              <span class="track-kv-v">${escapeHtml(loan.borrower.institutionName)}</span>
            </div>
            <div class="track-kv-row">
              <span class="track-kv-k">No. WhatsApp</span>
              <span class="track-kv-v">
                <a href="https://wa.me/${encodeURIComponent(loan.borrower.whatsapp.replace(/[^0-9]/g, ''))}" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                  ${escapeHtml(loan.borrower.whatsapp)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              </span>
            </div>
            <div class="track-kv-row">
              <span class="track-kv-k">Keperluan</span>
              <span class="track-kv-v" style="text-align: right; max-width: 220px;">${escapeHtml(loan.purpose)}</span>
            </div>
          </div>

          <div class="track-info-card">
            <div class="track-info-card-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Jadwal & Pengambilan
            </div>
            <div class="track-kv-row">
              <span class="track-kv-k">Tanggal Mulai Pinjam</span>
              <span class="track-kv-v" style="color: var(--navy); font-weight: 800;">${borrowDateFormatted}</span>
            </div>
            <div class="track-kv-row">
              <span class="track-kv-k">Batas Pengembalian</span>
              <span class="track-kv-v" style="color: var(--kredit-red); font-weight: 800;">${returnDateFormatted}</span>
            </div>
            <div class="track-kv-row">
              <span class="track-kv-k">Lokasi Pengambilan</span>
              <span class="track-kv-v">Telkom University Landmark Tower Lantai 6 Ruang 12</span>
            </div>
            ${loan.audit.notes ? `
              <div style="margin-top: 0.75rem; padding: 0.6rem 0.85rem; background: var(--warning-bg); border: 1px solid var(--warning-border); border-radius: 8px; font-size: 0.82rem; line-height: 1.45;">
                <strong style="color: #92400e;">Catatan Pengelola:</strong>
                <p style="margin: 0.2rem 0 0 0; color: #78350f;">${escapeHtml(loan.audit.notes)}</p>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="track-items-card">
          <div class="track-items-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            Daftar Peralatan & Komponen yang Dipinjam
          </div>
          <div class="table-responsive">
            <table class="ledger-table" style="font-size: 0.84rem; margin: 0;">
              <thead>
                <tr>
                  <th style="width: 55px; text-align: center;">FOTO</th>
                  <th>NAMA BARANG</th>
                  <th>LOKASI SIMPAN</th>
                  <th style="width: 140px; text-align: center;">JUMLAH PINJAM</th>
                </tr>
              </thead>
              <tbody>
                ${loan.items.map(i => {
                  const invItem = (state.inventory || []).find(inv => inv.id === i.itemId);
                  const itemImg = (invItem && invItem.imageUrl) || '/assets/logo-iot-lab.png';
                  const itemCat = (invItem && invItem.category) || '';
                  return `
                    <tr>
                      <td style="text-align: center;">
                        <img src="${itemImg}" alt="${escapeHtml(i.name)}" style="width: 38px; height: 38px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); background: var(--slate-100);" onerror="this.src='/assets/logo-iot-lab.png'">
                      </td>
                      <td>
                        <div style="font-weight: 800; color: var(--slate-900);">${escapeHtml(i.name)}</div>
                        ${itemCat ? `<div style="font-size: 0.74rem; color: var(--slate-500); margin-top: 1px;">${escapeHtml(itemCat)}</div>` : ''}
                      </td>
                      <td>
                        <span style="font-weight: 600; color: var(--slate-700);">${escapeHtml(i.location || '-')}</span>
                      </td>
                      <td style="text-align: center;">
                        <span style="display: inline-block; padding: 0.25rem 0.75rem; background: var(--slate-100); border: 1px solid var(--border-color); border-radius: 9999px; font-weight: 800; color: var(--navy); font-size: 0.82rem;">
                          ${i.qty} ${i.unit || 'Unit'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${!loan.documents.signedDocumentUrl ? `
          <div class="track-action-banner">
            <div class="track-action-banner-text">
              <h4>⚠️ Surat Peminjaman Belum Diunggah</h4>
              <p>Mohon cetak surat resmi, mintakan tanda tangan basah peminjam & dosen pembina, lalu unggah fotonya untuk ditindaklanjuti laboran.</p>
            </div>
            <div class="track-action-buttons">
              <button class="btn btn-primary" onclick="reopenUploadForLoan('${escapeHtml(loan.uniqueId)}')" style="font-weight: 800; padding: 0.65rem 1.35rem; display: inline-flex; align-items: center; gap: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Upload Surat Bertanda Tangan
              </button>
            </div>
          </div>
        ` : `
          <div class="track-action-banner uploaded">
            <div class="track-action-banner-text">
              <h4>✓ Berkas Permohonan Telah Lengkap</h4>
              <p>Surat peminjaman resmi bertanda tangan telah tersimpan di sistem Lab IoT dan siap diverifikasi oleh pengelola.</p>
            </div>
            <div class="track-action-buttons">
              <a href="${loan.documents.signedDocumentUrl}" target="_blank" class="btn btn-outline btn-sm" style="font-weight: 700;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Lihat Berkas Surat
              </a>
              ${loan.documents.idCardUrl ? `
                <a href="${loan.documents.idCardUrl}" target="_blank" class="btn btn-outline btn-sm" style="font-weight: 700;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><line x1="15" y1="8" x2="17" y2="8"></line><line x1="15" y1="12" x2="17" y2="12"></line></svg>
                  Lihat Foto KTM
                </a>
              ` : ''}
            </div>
          </div>
        `}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="track-card" style="text-align: center; padding: 2.5rem 1.5rem;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--slate-900); margin-bottom: 0.35rem;">Tiket Tidak Ditemukan</h3>
        <p style="color: var(--slate-500); font-size: 0.88rem; max-width: 420px; margin: 0 auto;">Tidak ada permohonan dengan nomor tiket "<code>${escapeHtml(uniqueId)}</code>". Pastikan kode yang dimasukkan sudah sesuai dengan surat peminjaman Anda.</p>
      </div>`;
  }
}

window.reopenUploadForLoan = function(uniqueId) {
  document.getElementById('uploadTargetUniqueId').value = uniqueId;
  document.getElementById('uploadUniqueIdDisplay').textContent = uniqueId;
  document.getElementById('modalUploadSigned').classList.add('active');
};

async function loadPublicCashSummary() {
  try {
    const summary = await apiGet('/api/cash/summary');
    const balanceEl = document.getElementById('publicCashBalance');
    const incomeEl = document.getElementById('publicCashIncome');
    const expenseEl = document.getElementById('publicCashExpense');
    const footerTotalEl = document.getElementById('publicCashFooterTotal');

    if (balanceEl) balanceEl.textContent = formatRupiah(summary.balance);
    if (incomeEl) incomeEl.textContent = formatRupiah(summary.totalIncome);
    if (expenseEl) expenseEl.textContent = formatRupiah(summary.totalExpense);
    if (footerTotalEl) footerTotalEl.textContent = formatRupiah(summary.balance);

    const trxs = await apiGet('/api/cash/transactions');
    const tableBody = document.getElementById('publicCashTransactionsTable');
    if (tableBody) {
      if (trxs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--slate-500); padding: 2rem;">Belum ada mutasi transaksi kas.</td></tr>`;
      } else {
        let runningBalance = 0;
        const sortedTrxs = [...trxs].reverse();
        const trxsWithBalance = sortedTrxs.map(t => {
          if (t.type === 'expense') {
            runningBalance -= t.amount;
          } else {
            runningBalance += t.amount;
          }
          return { ...t, runningBalance };
        }).reverse();

        tableBody.innerHTML = trxsWithBalance.map(t => {
          const isExpense = t.type === 'expense';
          const debitStr = !isExpense ? formatRupiah(t.amount) : '-';
          const kreditStr = isExpense ? formatRupiah(t.amount) : '-';

          return `
            <tr>
              <td style="font-family: 'JetBrains Mono', monospace;">${t.date}</td>
              <td>
                <span class="${isExpense ? 'pill-kredit' : 'pill-debit'}">
                  ${escapeHtml(t.paymentMethod || 'Cash')}
                </span>
              </td>
              <td>
                <strong>${escapeHtml(t.notes || t.description || (t.memberName ? 'Iuran: ' + t.memberName : 'Pemasukan Kas'))}</strong>
                ${t.category ? `<div style="font-size: 0.76rem; color: var(--slate-500);">${escapeHtml(t.category)}</div>` : ''}
              </td>
              <td style="text-align: right; color: var(--debit-green); font-weight: bold;">${debitStr}</td>
              <td style="text-align: right; color: var(--kredit-red); font-weight: bold;">${kreditStr}</td>
              <td style="text-align: right; font-weight: 800; color: var(--navy);">${formatRupiah(t.runningBalance)}</td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error("Gagal memuat kas:", err);
  }
}

function bindAdminEvents() {
  const loginForm = document.getElementById('formAdminLogin');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    try {
      const res = await apiPost('/api/auth/login', { username, password });
      state.auth.token = res.token;
      state.auth.user = res.user;
      localStorage.setItem('iot_lab_token', res.token);
      localStorage.setItem('iot_lab_user', JSON.stringify(res.user));

      renderAdminSection();
    } catch (err) {
      alert("Login Gagal: " + err.message);
    }
  });

  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const passwordInput = document.getElementById('adminPassword');
  btnTogglePassword?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    const eyeIcon = document.getElementById('eyeIcon');
    if (eyeIcon) {
      if (isPassword) {
        eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
      } else {
        eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
      }
    }
  });

  document.getElementById('btnAdminLogout')?.addEventListener('click', () => {
    state.auth.token = null;
    state.auth.user = null;
    localStorage.removeItem('iot_lab_token');
    localStorage.removeItem('iot_lab_user');
    renderAdminSection();
  });

  document.querySelectorAll('[data-admin-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-admin-tab');
      switchAdminTab(tab);
    });
  });

  document.getElementById('formUpdateDynamicTarget')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const period = document.getElementById('adminCashMonth').value;
    const targetAmount = document.getElementById('targetAmountInput').value;
    const notes = document.getElementById('targetNotesInput').value;

    try {
      await apiPost('/api/cash/targets', { period, targetAmount, notes });
      alert(`Target kas periode [${period}] berhasil disimpan.`);
      document.getElementById('modalSetCashTarget')?.classList.remove('active');
      loadAdminCashPeriods();
      if (state.activeCashPeriod === period) {
        loadAdminCashMatrix(period);
      }
    } catch (err) {
      alert("Gagal memperbarui target: " + err.message);
    }
  });

  document.getElementById('formQuickRecordPayment')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('quickPayMemberId')?.value || document.getElementById('quickPayMemberSelect')?.value;
    const period = document.getElementById('quickPayPeriod')?.value;
    const amount = document.getElementById('quickPayAmount')?.value;
    const paymentMethod = document.getElementById('quickPayMethod')?.value || 'Cash';
    const notes = document.getElementById('quickPayNotes')?.value || '';

    if (!memberId) {
      alert("Silakan pilih anggota laboratorium terlebih dahulu.");
      return;
    }
    if (!period || !amount) {
      alert("Periode bulan dan nominal pembayaran wajib diisi.");
      return;
    }

    const btnSubmit = document.getElementById('btnSubmitQuickPay');
    const origHtml = btnSubmit ? btnSubmit.innerHTML : 'Simpan';
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = 'Menyimpan...';
    }

    try {
      await apiPost('/api/cash/pay', {
        memberId, period, amount, paymentMethod, notes
      });
      alert("Pembayaran iuran kas berhasil dicatat!");
      document.getElementById('modalRecordPayment')?.classList.remove('active');
      document.getElementById('formQuickRecordPayment')?.reset();

      if (state.activeCashPeriod) {
        loadAdminCashMatrix(state.activeCashPeriod);
      }
      loadAdminCashPeriods();
      loadAdminFinanceLedger();
    } catch (err) {
      alert("Gagal mencatat pembayaran: " + err.message);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = origHtml;
      }
    }
  });

  document.getElementById('formRecordPayment')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('payMemberSelect').value;
    const period = document.getElementById('payPeriodInput')?.value || state.activeCashPeriod || state.cashMonth || new Date().toISOString().substring(0, 7);
    const amount = document.getElementById('payAmountInput').value;
    const paymentMethod = document.getElementById('payMethodSelect').value;
    const notes = document.getElementById('payNotesInput').value;

    try {
      await apiPost('/api/cash/pay', {
        memberId, period, amount, paymentMethod, notes
      });
      alert("Pembayaran iuran kas berhasil dicatat!");
      document.getElementById('formRecordPayment').reset();
      const periodInput = document.getElementById('payPeriodInput');
      if (periodInput) periodInput.value = period;

      if (state.activeCashPeriod === period) {
        loadAdminCashMatrix(period);
      }
      loadAdminCashPeriods();
      loadAdminFinanceLedger();
    } catch (err) {
      alert("Gagal mencatat pembayaran: " + err.message);
    }
  });

  document.getElementById('formRecordExpense')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('expenseCategory').value;
    const amount = document.getElementById('expenseAmount').value;
    const paymentMethod = document.getElementById('expenseMethod').value;
    const description = document.getElementById('expenseDesc').value;
    const receiptFile = document.getElementById('expenseReceiptFile').files[0];

    const formData = new FormData();
    formData.append('category', category);
    formData.append('amount', amount);
    formData.append('paymentMethod', paymentMethod);
    formData.append('description', description);
    if (receiptFile) formData.append('receipt', receiptFile);

    try {
      const res = await fetch('/api/cash/expenses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.auth.token}` },
        body: formData
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan pengeluaran');

      alert("Pengeluaran operasional lab berhasil dicatat!");
      document.getElementById('formRecordExpense').reset();
      loadAdminCashMatrix();
      loadPublicCashSummary();
      loadAdminFinanceLedger();
    } catch (err) {
      alert("Gagal mencatat pengeluaran: " + err.message);
    }
  });

  document.getElementById('formAddIncome')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('addIncomeDate')?.value;
    const sourceName = document.getElementById('addIncomeSource')?.value?.trim();
    const amount = document.getElementById('addIncomeAmount')?.value;
    const paymentMethod = document.getElementById('addIncomeMethod')?.value || 'Transfer Bank';
    const notes = document.getElementById('addIncomeNotes')?.value?.trim() || '';

    const btnSubmit = document.getElementById('btnSubmitAddIncome');
    const origHtml = btnSubmit ? btnSubmit.innerHTML : 'Simpan Pemasukan';
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Menyimpan...';
    }

    try {
      await apiPost('/api/cash/incomes', {
        date, sourceName, amount, paymentMethod, notes
      });
      alert('Pemasukan kas berhasil dicatat!');
      document.getElementById('modalAddIncome')?.classList.remove('active');
      document.getElementById('formAddIncome')?.reset();
      loadAdminFinanceLedger();
      if (state.adminTab === 'cash') {
        loadAdminCashPeriods();
      }
    } catch (err) {
      alert('Gagal mencatat pemasukan: ' + err.message);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = origHtml;
      }
    }
  });

  document.getElementById('formAddExpense')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('addExpenseDate')?.value;
    const category = document.getElementById('addExpenseCategory')?.value;
    const description = document.getElementById('addExpenseDesc')?.value?.trim();
    const amount = document.getElementById('addExpenseAmount')?.value;
    const paymentMethod = document.getElementById('addExpenseMethod')?.value || 'Transfer Bank';
    const receiptFile = document.getElementById('addExpenseReceiptFile')?.files[0];

    const btnSubmit = document.getElementById('btnSubmitAddExpense');
    const origHtml = btnSubmit ? btnSubmit.innerHTML : 'Simpan Pengeluaran';
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Menyimpan...';
    }

    const formData = new FormData();
    if (date) formData.append('date', date);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('amount', amount);
    formData.append('paymentMethod', paymentMethod);
    if (receiptFile) formData.append('receipt', receiptFile);

    try {
      const res = await fetch('/api/cash/expenses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.auth.token}` },
        body: formData
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan pengeluaran');

      alert('Pengeluaran operasional lab berhasil dicatat!');
      document.getElementById('modalAddExpense')?.classList.remove('active');
      document.getElementById('formAddExpense')?.reset();
      loadAdminFinanceLedger();
      if (state.adminTab === 'cash') {
        loadAdminCashPeriods();
      }
    } catch (err) {
      alert('Gagal mencatat pengeluaran: ' + err.message);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = origHtml;
      }
    }
  });

  document.getElementById('financeSearchInput')?.addEventListener('input', () => {
    renderAdminFinanceTable();
  });
  document.getElementById('financeTypeFilter')?.addEventListener('change', () => {
    renderAdminFinanceTable();
  });
  document.getElementById('financeMonthFilter')?.addEventListener('change', () => {
    renderAdminFinanceTable();
  });

  document.getElementById('formAddInventoryItem')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newItemName').value.trim();
    const category = document.getElementById('newItemCategory').value.trim();
    const location = document.getElementById('newItemLocation').value.trim();
    const totalStock = document.getElementById('newItemStock').value;
    const unit = document.getElementById('newItemUnit').value.trim();
    const condition = document.getElementById('newItemCondition').value;
    const loanable = document.getElementById('newItemLoanable').value;
    const description = document.getElementById('newItemDesc').value.trim();
    const imageFileInput = document.getElementById('newItemImageFile');
    const imageUrlInput = document.getElementById('newItemImageUrl')?.value.trim();

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('location', location);
      formData.append('totalStock', totalStock);
      formData.append('unit', unit);
      formData.append('condition', condition);
      formData.append('loanable', loanable);
      formData.append('description', description);

      if (imageFileInput && imageFileInput.files[0]) {
        formData.append('image', imageFileInput.files[0]);
      } else if (imageUrlInput) {
        formData.append('imageUrl', imageUrlInput);
      }

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.auth.token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menambah barang");
      }

      alert(`Barang "${name}" berhasil ditambahkan ke inventaris dengan foto!`);
      document.getElementById('formAddInventoryItem').reset();
      document.getElementById('modalAddInventory').classList.remove('active');
      loadInventory();
      loadAdminInventoryTable();
    } catch (err) {
      alert("Gagal menambah barang: " + err.message);
    }
  });

  document.getElementById('formEditInventoryItem')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    const btnSave = document.getElementById('btnSaveEditInventory');
    btnSave.disabled = true;
    btnSave.textContent = "Menyimpan...";

    try {
      const name = document.getElementById('editItemName').value.trim();
      const category = document.getElementById('editItemCategory').value.trim();
      const location = document.getElementById('editItemLocation').value.trim();
      const totalStock = document.getElementById('editItemStock').value;
      const unit = document.getElementById('editItemUnit').value.trim();
      const condition = document.getElementById('editItemCondition').value;
      const loanable = document.getElementById('editItemLoanable').value;
      const description = document.getElementById('editItemDesc').value.trim();
      const imageFileInput = document.getElementById('editItemImageFile');
      const imageUrlInput = document.getElementById('editItemImageUrl')?.value.trim();

      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('location', location);
      formData.append('totalStock', totalStock);
      formData.append('unit', unit);
      formData.append('condition', condition);
      formData.append('loanable', loanable);
      formData.append('description', description);

      if (imageFileInput && imageFileInput.files[0]) {
        formData.append('image', imageFileInput.files[0]);
      } else if (imageUrlInput) {
        formData.append('imageUrl', imageUrlInput);
      }

      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${state.auth.token}`
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal memperbarui inventaris");
      }

      document.getElementById('modalEditInventory').classList.remove('active');
      await loadInventory();
      loadAdminInventoryTable();
      alert(`Data aset "${name}" berhasil diperbarui!`);
    } catch (err) {
      alert("Gagal mengubah inventaris: " + err.message);
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "Simpan Perubahan";
    }
  });
}

function renderAdminSection() {
  const loginCard = document.getElementById('adminLoginCard');
  const dashboardCard = document.getElementById('adminDashboardCard');
  const adminNameDisplay = document.getElementById('adminLoggedName');

  if (!state.auth.token) {
    if (loginCard) loginCard.style.display = 'block';
    if (dashboardCard) dashboardCard.style.display = 'none';
    return;
  }

  if (loginCard) loginCard.style.display = 'none';
  if (dashboardCard) dashboardCard.style.display = 'block';
  if (adminNameDisplay) adminNameDisplay.textContent = state.auth.user?.name || 'Laboran Lab IoT';

  switchAdminTab(state.adminTab);
}

function switchAdminTab(tabName) {
  state.adminTab = tabName;
  localStorage.setItem('iot_lab_admin_tab', tabName);
  if (state.activeView === 'admin') {
    window.location.hash = `admin-${tabName}`;
  }

  document.querySelectorAll('[data-admin-tab]').forEach(btn => {
    const isActive = btn.getAttribute('data-admin-tab') === tabName;
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('btn-primary', isActive);
    btn.classList.toggle('btn-outline', !isActive);
  });

  document.querySelectorAll('.admin-tab-pane').forEach(p => p.style.display = 'none');
  const targetPane = document.getElementById(`admin-tab-${tabName}`);
  if (targetPane) targetPane.style.display = 'block';

  const tabTitles = {
    'loans': 'Daftar Permohonan Peminjaman',
    'inventory': 'Inventaris & Manajemen Stok Barang',
    'cash': 'Kas Lab & Target Dinamis',
    'finance': 'Rekapitulasi Arus Kas & Keuangan Total'
  };
  const titleEl = document.getElementById('adminActiveTabTitle');
  if (titleEl && tabTitles[tabName]) {
    titleEl.textContent = tabTitles[tabName];
  }

  if (tabName === 'loans') loadAdminLoans();
  if (tabName === 'inventory') loadAdminInventoryTable();
  if (tabName === 'cash') {
    closeMonthDetail();
    loadAdminCashPeriods();
  }
  if (tabName === 'finance') {
    loadAdminFinanceLedger();
  }
}

async function loadAdminLoans() {
  const container = document.getElementById('adminLoansTableBody');
  if (!container) return;

  try {
    const loans = await apiGet('/api/loans');
    state.loans = loans;

    const countBadge = document.getElementById('adminLoansCountBadge');
    if (countBadge) countBadge.textContent = `${loans.length} Permohonan`;

    const searchInput = document.getElementById('adminLoansSearchInput');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = "true";
      searchInput.addEventListener('input', filterAdminLoans);
    }

    const statusFilter = document.getElementById('adminLoansStatusFilter');
    if (statusFilter && !statusFilter.dataset.bound) {
      statusFilter.dataset.bound = "true";
      statusFilter.addEventListener('change', filterAdminLoans);
    }

    filterAdminLoans();
  } catch (err) {
    container.innerHTML = `<tr><td colspan="7" style="color: var(--kredit-red); text-align: center; padding: 2rem;">Gagal memuat permohonan: ${err.message}</td></tr>`;
  }
}

function filterAdminLoans() {
  const searchInput = document.getElementById('adminLoansSearchInput');
  const statusFilter = document.getElementById('adminLoansStatusFilter');

  const query = (searchInput?.value || '').toLowerCase().trim();
  const status = statusFilter?.value || '';

  const allLoans = state.loans || [];
  const filtered = allLoans.filter(loan => {
    const matchStatus = !status || loan.status === status;
    const itemsText = (loan.items || []).map(i => i.name).join(' ').toLowerCase();
    const matchQuery = !query ||
      (loan.uniqueId || '').toLowerCase().includes(query) ||
      (loan.borrower.name || '').toLowerCase().includes(query) ||
      (loan.borrower.nim || '').toLowerCase().includes(query) ||
      (loan.borrower.institutionName || '').toLowerCase().includes(query) ||
      itemsText.includes(query);
    return matchStatus && matchQuery;
  });

  const countBadge = document.getElementById('adminLoansCountBadge');
  if (countBadge) {
    if (query || status) {
      countBadge.textContent = `${filtered.length} / ${allLoans.length} Permohonan`;
    } else {
      countBadge.textContent = `${allLoans.length} Permohonan`;
    }
  }

  renderAdminLoansTableRows(filtered);
}

function renderAdminLoansTableRows(loans) {
  const container = document.getElementById('adminLoansTableBody');
  if (!container) return;

  if (loans.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-500); padding: 2.5rem;">Tidak ada permohonan yang sesuai kriteria pencarian.</td></tr>`;
    return;
  }

  container.innerHTML = loans.map(loan => {
    let statusClass = 'status-pending';
    let compactStatusLabel = 'Menunggu';
    if (loan.status === 'SURAT_DIGENERATE') {
      statusClass = 'status-pending';
      compactStatusLabel = 'Menunggu Berkas';
    } else if (loan.status === 'MENUNGGU_VERIFIKASI') {
      statusClass = 'status-pending';
      compactStatusLabel = 'Verifikasi';
    } else if (loan.status === 'DISETUJUI') {
      statusClass = 'status-approved';
      compactStatusLabel = 'Disetujui';
    } else if (loan.status === 'DIPINJAM') {
      statusClass = 'status-borrowed';
      compactStatusLabel = 'Dipinjam';
    } else if (loan.status === 'SELESAI') {
      statusClass = 'status-completed';
      compactStatusLabel = 'Selesai';
    } else if (loan.status === 'DITOLAK') {
      statusClass = 'status-rejected';
      compactStatusLabel = 'Ditolak';
    }

    const borrowerInitials = (loan.borrower.name || 'P')
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const itemsList = loan.items || [];
    const totalItemsCount = itemsList.length;
    const totalUnits = itemsList.reduce((sum, it) => sum + (parseInt(it.qty) || 1), 0);
    const firstItem = itemsList[0];
    let itemSummaryHtml = '';

    if (totalItemsCount === 0) {
      itemSummaryHtml = `<span style="color: var(--slate-400); font-style: italic;">Tidak ada barang</span>`;
    } else if (totalItemsCount === 1) {
      itemSummaryHtml = `
        <div class="loan-summary-box" title="${escapeHtml(firstItem.name)} (${firstItem.qty} ${escapeHtml(firstItem.unit || 'Unit')})">
          <span class="loan-summary-badge">${firstItem.qty} ${escapeHtml(firstItem.unit || 'Unit')}</span>
          <span class="loan-summary-text">${escapeHtml(firstItem.name)}</span>
        </div>
      `;
    } else {
      const allTooltip = itemsList.map(i => `• ${i.name} (${i.qty} ${i.unit || 'Unit'})`).join('\n');
      itemSummaryHtml = `
        <div class="loan-summary-box" title="${escapeHtml(allTooltip)}">
          <span class="loan-summary-badge">${totalItemsCount} Barang</span>
          <span class="loan-summary-text">${escapeHtml(firstItem.name)}</span>
          <span class="more-items-pill">+${totalItemsCount - 1}</span>
        </div>
      `;
    }

    const docActionHtml = loan.documents && loan.documents.signedDocumentUrl
      ? `<a href="${loan.documents.signedDocumentUrl}" target="_blank" class="doc-pill-success" title="Buka Berkas PDF" onclick="event.stopPropagation();">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <span>Ada Surat</span>
        </a>`
      : `<span class="doc-pill-missing" title="Peminjam belum mengunggah surat bertanda tangan">
          <span>Menunggu</span>
        </span>`;

    return `
      <tr class="period-row" onclick="openAdminLoanDetailModal('${loan.uniqueId}')" style="cursor: pointer;">
        <td>
          <button type="button" class="ticket-chip" onclick="event.stopPropagation(); navigator.clipboard.writeText('${loan.uniqueId}'); alert('Nomor tiket [${loan.uniqueId}] disalin!');" title="Klik untuk menyalin Nomor Tiket">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>${loan.uniqueId}</span>
          </button>
        </td>
        <td>
          <div class="borrower-profile-cell">
            <div class="borrower-avatar">${borrowerInitials}</div>
            <div class="borrower-details">
              <span class="borrower-name">${escapeHtml(loan.borrower.name)}</span>
              <span class="borrower-inst">${escapeHtml(loan.borrower.institutionName || '')} ${loan.borrower.nim ? `(${escapeHtml(loan.borrower.nim)})` : ''}</span>
            </div>
          </div>
        </td>
        <td>
          ${itemSummaryHtml}
        </td>
        <td>
          <div class="loan-sched-compact">
            <div style="font-weight: 700; color: var(--slate-800); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;">
              ${loan.borrowDate}
            </div>
            <div style="font-size: 0.72rem; color: var(--slate-500);">
              s/d <span style="font-weight: 700; color: ${loan.borrowDate === loan.returnDate ? 'var(--slate-600)' : 'var(--navy)'}; font-family: 'JetBrains Mono', monospace;">${loan.returnDate}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="track-status-pill table-sm ${statusClass}">
            <span class="status-pulse-dot"></span>
            <span>${escapeHtml(compactStatusLabel)}</span>
          </div>
        </td>
        <td style="text-align: center;">
          ${docActionHtml}
        </td>
        <td style="text-align: center;" onclick="event.stopPropagation();">
          <div class="table-actions-group" style="justify-content: center;">
            <button type="button" class="btn btn-outline btn-sm btn-detail-action" onclick="openAdminLoanDetailModal('${loan.uniqueId}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span>Detail</span>
            </button>

            ${loan.status === 'MENUNGGU_VERIFIKASI' ? `
              <button class="btn btn-primary btn-sm" onclick="updateLoanStatus('${loan.uniqueId}', 'DISETUJUI')" title="Setujui permohonan" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;">Setujui</button>
            ` : ''}

            ${loan.status === 'DISETUJUI' ? `
              <button class="btn btn-secondary btn-sm" onclick="updateLoanStatus('${loan.uniqueId}', 'DIPINJAM')" title="Konfirmasi serah terima alat" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;">Serah Terima</button>
            ` : ''}

            ${loan.status === 'DIPINJAM' ? `
              <button class="btn btn-primary btn-sm" style="background: var(--debit-green); padding: 0.35rem 0.65rem; font-size: 0.78rem;" onclick="updateLoanStatus('${loan.uniqueId}', 'SELESAI')" title="Konfirmasi pengembalian barang">Selesai</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openAdminLoanDetailModal = function(uniqueId) {
  const loan = (state.loans || []).find(l => l.uniqueId === uniqueId);
  if (!loan) return;

  const modal = document.getElementById('modalAdminLoanDetail');
  const ticketBadge = document.getElementById('adminLoanModalTicketBadge');
  const statusBadge = document.getElementById('adminLoanModalStatusBadge');
  const modalBody = document.getElementById('adminLoanDetailModalBody');

  if (ticketBadge) ticketBadge.textContent = loan.uniqueId;

  let statusClass = 'status-pending';
  if (loan.status === 'DISETUJUI') statusClass = 'status-approved';
  if (loan.status === 'DIPINJAM') statusClass = 'status-borrowed';
  if (loan.status === 'SELESAI') statusClass = 'status-completed';
  if (loan.status === 'DITOLAK') statusClass = 'status-rejected';

  if (statusBadge) {
    statusBadge.innerHTML = `
      <div class="track-status-pill table-sm ${statusClass}">
        <span class="status-pulse-dot"></span>
        <span>${escapeHtml(loan.statusLabel)}</span>
      </div>
    `;
  }

  const cleanWa = (loan.borrower.whatsapp || '').replace(/[^0-9]/g, '');
  const totalUnits = (loan.items || []).reduce((sum, it) => sum + (parseInt(it.qty) || 1), 0);

  let borrowerTypeLabel = "Umum / Eksternal";
  if (loan.borrower.type === 'internal_lab') borrowerTypeLabel = "Internal Asisten / Anggota Lab IoT";
  else if (loan.borrower.type === 'telkom') borrowerTypeLabel = "Mahasiswa Telkom University";
  else if (loan.borrower.type === 'ukm') borrowerTypeLabel = "Unit Kegiatan Mahasiswa (UKM)";
  else if (loan.borrower.type === 'lab_lain') borrowerTypeLabel = "Laboratorium Lain";

  modalBody.innerHTML = `

    <div class="track-info-grid" style="margin-bottom: 1.25rem;">
      <div class="track-info-card" style="padding: 1.15rem; background: var(--slate-50);">
        <div class="track-info-card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Identitas Lengkap Peminjam</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Nama Lengkap</span>
          <span class="track-kv-v">${escapeHtml(loan.borrower.name)}</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">NIM / NIP</span>
          <span class="track-kv-v" style="font-family: 'JetBrains Mono', monospace; font-weight: 700;">${escapeHtml(loan.borrower.nim || '-')}</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Kategori</span>
          <span class="track-kv-v">${borrowerTypeLabel}</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Instansi / Jurusan</span>
          <span class="track-kv-v">${escapeHtml(loan.borrower.institutionName || '-')}</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">WhatsApp</span>
          <span class="track-kv-v">
            ${cleanWa ? `
              <a href="https://wa.me/${cleanWa}" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                ${escapeHtml(loan.borrower.whatsapp)}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            ` : escapeHtml(loan.borrower.whatsapp || '-')}
          </span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Email</span>
          <span class="track-kv-v">${escapeHtml(loan.borrower.email || '-')}</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Keperluan</span>
          <span class="track-kv-v" style="text-align: right; max-width: 260px;">${escapeHtml(loan.purpose || '-')}</span>
        </div>
      </div>

      <div class="track-info-card" style="padding: 1.15rem; background: var(--slate-50);">
        <div class="track-info-card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span>Jadwal & Waktu Peminjaman</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Tanggal Diajukan</span>
          <span class="track-kv-v">${loan.createdAt ? new Date(loan.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Mulai Pinjam</span>
          <span class="track-kv-v" style="color: var(--navy); font-weight: 800; font-family: 'JetBrains Mono', monospace;">${loan.borrowDate}</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Batas Pengembalian</span>
          <span class="track-kv-v" style="color: var(--kredit-red); font-weight: 800; font-family: 'JetBrains Mono', monospace;">${loan.returnDate}</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Jumlah Barang</span>
          <span class="track-kv-v">${(loan.items || []).length} Jenis (${totalUnits} Unit)</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Status Terkini</span>
          <span class="track-kv-v">${escapeHtml(loan.statusLabel)}</span>
        </div>
        <div class="track-kv-row">
          <span class="track-kv-k">Catatan Khusus</span>
          <span class="track-kv-v" style="font-style: italic; text-align: right;">${escapeHtml(loan.audit?.notes || '-')}</span>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.25rem; padding: 0; overflow: hidden; border: 1px solid var(--border-color); border-radius: 12px; box-shadow: none;">
      <div style="padding: 0.75rem 1.15rem; background: var(--slate-50); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
        <h4 style="font-size: 0.88rem; font-weight: 800; color: var(--slate-900); margin: 0; display: flex; align-items: center; gap: 0.45rem;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
          <span>Daftar Barang yang Diminta (${(loan.items || []).length} Barang)</span>
        </h4>
        <span style="font-size: 0.78rem; font-weight: 700; color: var(--navy); font-family: 'JetBrains Mono', monospace;">Total: ${totalUnits} Unit</span>
      </div>
      <div class="table-responsive">
        <table class="ledger-table" style="font-size: 0.82rem;">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">NO</th>
              <th>NAMA BARANG</th>
              <th>KATEGORI</th>
              <th>LOKASI FISIK DI LAB</th>
              <th style="text-align: right; width: 110px;">KUANTITAS</th>
            </tr>
          </thead>
          <tbody>
            ${(loan.items || []).map((it, idx) => `
              <tr>
                <td style="text-align: center; font-weight: 700; color: var(--slate-400);">${idx + 1}</td>
                <td style="font-weight: 800; color: var(--slate-900);">${escapeHtml(it.name)}</td>
                <td><span class="policy-badge">${escapeHtml(it.category || 'Alat Lab')}</span></td>
                <td style="color: var(--slate-600);">${escapeHtml(it.location || 'Laboratorium IoT')}</td>
                <td style="text-align: right; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--navy);">${it.qty} ${escapeHtml(it.unit || 'Unit')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom: 1.25rem; padding: 1.15rem; border: 1px solid var(--border-color); border-radius: 12px; box-shadow: none;">
      <h4 style="font-size: 0.88rem; font-weight: 800; color: var(--slate-900); margin: 0 0 0.85rem 0; display: flex; align-items: center; gap: 0.45rem;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <span>Berkas & Dokumen Persyaratan</span>
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem;">

        <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.65rem;">
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: var(--slate-500);">Format Surat Resmi</div>
            <strong style="font-size: 0.85rem; color: var(--slate-900);">Surat Peminjaman Lab</strong>
          </div>
          <button type="button" class="btn btn-outline btn-sm" onclick="previewOfficialLetterFromAdmin('${loan.uniqueId}')" style="justify-content: center; font-weight: 700;">
            📄 Lihat / Cetak Surat PDF
          </button>
        </div>

        <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.65rem;">
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: var(--slate-500);">Surat Bertanda Tangan</div>
            <strong style="font-size: 0.85rem; color: ${loan.documents?.signedDocumentUrl ? 'var(--debit-green)' : 'var(--kredit-red)'};">
              ${loan.documents?.signedDocumentUrl ? '✓ Sudah Diunggah' : '✕ Belum Diunggah'}
            </strong>
          </div>
          ${loan.documents?.signedDocumentUrl ? `
            <a href="${loan.documents.signedDocumentUrl}" target="_blank" class="btn btn-primary btn-sm" style="justify-content: center; text-decoration: none; font-weight: 700;">
              👁️ Buka File Surat
            </a>
          ` : `
            <span style="font-size: 0.76rem; color: var(--slate-400); text-align: center;">Menunggu peminjam upload</span>
          `}
        </div>

        <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.65rem;">
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: var(--slate-500);">Kartu Identitas / KTM</div>
            <strong style="font-size: 0.85rem; color: ${loan.documents?.idCardUrl ? 'var(--debit-green)' : 'var(--slate-500)'};">
              ${loan.documents?.idCardUrl ? '✓ Dilampirkan' : '- Tidak Ada'}
            </strong>
          </div>
          ${loan.documents?.idCardUrl ? `
            <a href="${loan.documents.idCardUrl}" target="_blank" class="btn btn-outline btn-sm" style="justify-content: center; text-decoration: none; font-weight: 700;">
              🪪 Buka Foto KTM
            </a>
          ` : `
            <span style="font-size: 0.76rem; color: var(--slate-400); text-align: center;">Tidak dilampirkan</span>
          `}
        </div>
      </div>
    </div>

    <div class="card" style="padding: 1.15rem; border: 1.5px solid rgba(0, 91, 130, 0.2); border-radius: 12px; background: rgba(0, 91, 130, 0.02); box-shadow: none;">
      <h4 style="font-size: 0.88rem; font-weight: 800; color: var(--slate-900); margin: 0 0 0.75rem 0;">
        Tindakan Administratif Pengelola
      </h4>
      <div style="display: flex; gap: 0.65rem; flex-wrap: wrap; align-items: center;">
        ${loan.status === 'SURAT_DIGENERATE' || loan.status === 'MENUNGGU_VERIFIKASI' ? `
          <button type="button" class="btn btn-primary" onclick="updateLoanStatus('${loan.uniqueId}', 'DISETUJUI'); closeAdminLoanDetailModal();" style="padding: 0.55rem 1.15rem; font-weight: 800;">
            ✓ Setujui Permohonan Ini
          </button>
          <button type="button" class="btn btn-danger" onclick="promptRejectLoan('${loan.uniqueId}'); closeAdminLoanDetailModal();" style="padding: 0.55rem 1.15rem; font-weight: 800;">
            ✕ Tolak Permohonan
          </button>
        ` : ''}

        ${loan.status === 'DISETUJUI' ? `
          <button type="button" class="btn btn-secondary" onclick="updateLoanStatus('${loan.uniqueId}', 'DIPINJAM'); closeAdminLoanDetailModal();" style="padding: 0.55rem 1.15rem; font-weight: 800;">
            📦 Konfirmasi Serah Terima Alat (Barang Diambil)
          </button>
          <button type="button" class="btn btn-outline" onclick="promptRejectLoan('${loan.uniqueId}'); closeAdminLoanDetailModal();" style="color: var(--kredit-red); border-color: var(--kredit-border); padding: 0.55rem 1.15rem;">
            Batalkan Persetujuan
          </button>
        ` : ''}

        ${loan.status === 'DIPINJAM' ? `
          <button type="button" class="btn btn-primary" style="background: var(--debit-green); padding: 0.55rem 1.15rem; font-weight: 800;" onclick="updateLoanStatus('${loan.uniqueId}', 'SELESAI'); closeAdminLoanDetailModal();">
            ✓ Konfirmasi Pengembalian Barang (Selesai)
          </button>
        ` : ''}

        ${loan.status === 'SELESAI' ? `
          <div style="color: var(--debit-green); font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Peminjaman telah selesai dan seluruh peralatan telah dikembalikan ke lab.</span>
          </div>
        ` : ''}

        ${loan.status === 'DITOLAK' ? `
          <div style="color: var(--kredit-red); font-weight: 700; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            <span>Permohonan telah ditolak. Catatan: ${escapeHtml(loan.audit?.notes || '-')}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  modal.classList.add('active');
};

window.closeAdminLoanDetailModal = function() {
  document.getElementById('modalAdminLoanDetail')?.classList.remove('active');
};

window.previewOfficialLetterFromAdmin = function(uniqueId) {
  const loan = (state.loans || []).find(l => l.uniqueId === uniqueId);
  if (!loan) return;
  openOfficialLetterModal({
    uniqueId: loan.uniqueId,
    loan,
    qrCodeDataUrl: loan.qrCodeDataUrl
  });
};

window.viewLoanDetailAdmin = window.openAdminLoanDetailModal;

window.updateLoanStatus = async function(uniqueId, newStatus, notes = "") {
  try {
    const res = await fetch(`/api/loans/${uniqueId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.auth.token}`
      },
      body: JSON.stringify({ newStatus, notes })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Gagal mengubah status');

    alert(`Status permohonan [${uniqueId}] diperbarui ke: ${newStatus}.`);
    await loadAdminLoans();
    loadInventory();

    const modal = document.getElementById('modalAdminLoanDetail');
    if (modal && modal.classList.contains('active')) {
      openAdminLoanDetailModal(uniqueId);
    }
  } catch (err) {
    alert("Gagal: " + err.message);
  }
};

window.promptRejectLoan = function(uniqueId) {
  const reason = prompt("Masukkan alasan penolakan permohonan ini:");
  if (reason !== null && reason.trim() !== '') {
    updateLoanStatus(uniqueId, 'DITOLAK', reason.trim());
  }
};

function renderAdminInventoryTableRows(items) {
  const tbody = document.getElementById('adminInventoryTableBody');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--slate-500); padding: 2rem;">Tidak ada barang yang sesuai kriteria pencarian.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => {
    let statusBadge = `<span class="badge-status-all">Umum & Internal</span>`;
    if (item.loanable === 'internal_only') statusBadge = `<span class="badge-status-internal">Internal Lab</span>`;
    if (item.loanable === 'restricted') statusBadge = `<span class="badge-status-restricted">Aset Tetap</span>`;

    const itemImg = item.imageUrl || '/assets/logo-iot-lab.png';
    const isLowStock = item.availableStock === 0;
    const stockColor = isLowStock ? 'var(--kredit-red)' : 'var(--debit-green)';

    return `
      <tr>
        <td style="text-align: center;">
          <img src="${itemImg}" alt="${escapeHtml(item.name)}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); background: var(--slate-100);" onerror="this.src='/assets/logo-iot-lab.png'">
        </td>
        <td>
          <div style="font-weight: 800; color: var(--slate-900); font-size: 0.9rem;">${escapeHtml(item.name)}</div>
          <div style="font-size: 0.75rem; color: var(--slate-500); margin-top: 1px;">${escapeHtml(item.category)}</div>
        </td>
        <td>
          <span style="font-size: 0.84rem; color: var(--slate-700);">${escapeHtml(item.location)}</span>
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <div style="display: inline-flex; align-items: center; gap: 0.35rem; background: ${isLowStock ? 'var(--kredit-bg)' : 'var(--slate-100)'}; padding: 0.3rem 0.65rem; border-radius: 20px; border: 1px solid ${isLowStock ? 'var(--kredit-border)' : 'var(--slate-200)'}; font-family: 'JetBrains Mono', monospace; font-size: 0.86rem;">
            <span style="color: ${stockColor}; font-weight: 800;">${item.availableStock}</span>
            <span style="color: var(--slate-400);">/</span>
            <span style="color: var(--slate-600); font-weight: 600;">${item.totalStock} ${item.unit}</span>
          </div>
        </td>
        <td>${statusBadge}</td>
        <td style="white-space: nowrap; text-align: center;">
          <button class="btn btn-outline btn-sm" onclick="showItemDetailModal('${item.id}')" style="font-weight: 700; padding: 0.35rem 0.75rem;">Detail</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadAdminInventoryTable() {
  const tbody = document.getElementById('adminInventoryTableBody');
  if (!tbody) return;

  try {
    const items = await apiGet('/api/inventory');
    state.inventory = items;

    const countBadge = document.getElementById('inventoryCountBadge');
    if (countBadge) countBadge.textContent = `${items.length} Barang`;

    const catSelect = document.getElementById('adminInventoryCategoryFilter');
    if (catSelect) {
      const currentVal = catSelect.value;
      const categories = [...new Set(items.map(i => i.category))];
      catSelect.innerHTML = `<option value="">Semua Kategori</option>` +
        categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      catSelect.value = currentVal;

      if (!catSelect.dataset.bound) {
        catSelect.dataset.bound = "true";
        catSelect.addEventListener('change', filterAdminInventory);
      }
    }

    const searchInput = document.getElementById('adminInventorySearchInput');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = "true";
      searchInput.addEventListener('input', filterAdminInventory);
    }

    filterAdminInventory();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--kredit-red);">Gagal memuat inventaris: ${err.message}</td></tr>`;
  }
}

function filterAdminInventory() {
  const searchInput = document.getElementById('adminInventorySearchInput');
  const catSelect = document.getElementById('adminInventoryCategoryFilter');

  const query = (searchInput?.value || '').toLowerCase().trim();
  const category = catSelect?.value || '';

  const filtered = state.inventory.filter(item => {
    const matchCat = !category || item.category === category;
    const matchQuery = !query ||
      item.name.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });

  renderAdminInventoryTableRows(filtered);
}

window.showItemQrModal = async function(itemId) {
  try {
    const res = await apiGet(`/api/inventory/${itemId}/qrcode`);
    const container = document.getElementById('qrModalContent');
    container.innerHTML = `
      <div style="text-align: center; padding: 1.25rem;" id="printableQrLabelArea">
        <div style="border: 2px solid #000; padding: 1rem; border-radius: 6px; display: inline-block; background: #fff;">
          <h4 style="font-size: 0.85rem; font-weight: bold; margin-bottom: 2px;">LABORATORIUM IOT TELKOM UNIVERSITY</h4>
          <p style="font-size: 0.75rem; color: #555; margin-bottom: 0.5rem;">Label Identitas Aset</p>
          <img src="${res.qrDataUrl}" alt="QR" style="width: 170px; height: 170px;">
          <h3 style="font-size: 0.95rem; font-weight: bold; margin-top: 0.4rem; color: #000;">${res.item.name}</h3>
          <p style="font-size: 0.82rem; font-weight: bold; color: #005b82; font-family: 'JetBrains Mono', monospace;">ID: ${res.item.id}</p>
          <p style="font-size: 0.75rem; color: #333;">Lokasi: ${res.item.location}</p>
        </div>
      </div>
    `;
    document.getElementById('modalItemQr').classList.add('active');
  } catch (err) {
    alert("Gagal memuat QR Code: " + err.message);
  }
};

window.printQrLabel = function() { window.print(); };

window.openEditItemModal = function(itemId) {
  const item = state.inventory.find(i => i.id === itemId);
  if (!item) return;

  document.getElementById('modalItemDetail')?.classList.remove('active');

  document.getElementById('editItemId').value = item.id;
  document.getElementById('editItemName').value = item.name || '';
  document.getElementById('editItemCategory').value = item.category || '';
  document.getElementById('editItemLocation').value = item.location || '';
  document.getElementById('editItemStock').value = item.totalStock || 1;
  document.getElementById('editItemUnit').value = item.unit || 'Unit';
  document.getElementById('editItemCondition').value = item.condition || 'Baik';
  document.getElementById('editItemLoanable').value = item.loanable || 'all';
  document.getElementById('editItemDesc').value = item.description || '';
  document.getElementById('editItemImageUrl').value = '';
  document.getElementById('editItemImageFile').value = '';
  document.getElementById('editItemCurrentImg').src = item.imageUrl || '/assets/logo-iot-lab.png';

  document.getElementById('modalEditInventory').classList.add('active');
};

window.editItemPrompt = window.openEditItemModal;

window.deleteItemPrompt = function(itemId) {
  const item = state.inventory.find(i => i.id === itemId);
  const itemName = item ? `"${item.name}"` : 'ini';
  showAppConfirm(`Yakin ingin menghapus barang ${itemName} dari inventaris Lab IoT?`, async () => {
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${state.auth.token}` }
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      alert("Barang berhasil dihapus.");
      loadInventory();
      loadAdminInventoryTable();
    } catch (err) {
      alert("Gagal: " + err.message);
    }
  });
};

async function populatePayMemberSelect() {
  const memberSelect = document.getElementById('payMemberSelect');
  const periodInput = document.getElementById('payPeriodInput');
  if (periodInput && !periodInput.value) {
    periodInput.value = state.activeCashPeriod || state.cashMonth || new Date().toISOString().substring(0, 7);
  }

  try {
    const members = await apiGet('/api/cash/members');
    if (members && members.length > 0) {
      state.cashMembers = members;
      if (memberSelect) {
        memberSelect.innerHTML = `<option value="">-- Pilih Anggota Lab --</option>` +
          members.map(m => `<option value="${m.id}">${escapeHtml(m.name)} (${m.nim})</option>`).join('');
      }
    }
  } catch (err) {
    console.error("Gagal memuat list anggota:", err);
  }
}

async function loadAdminCashPeriods() {
  const tbody = document.getElementById('adminCashPeriodsTableBody');
  if (!tbody) return;

  try {
    const periods = await apiGet('/api/cash/periods');
    state.cashPeriods = periods || [];

    populatePayMemberSelect();

    const badge = document.getElementById('cashPeriodsCountBadge');
    if (badge) badge.textContent = `${periods.length} Periode`;

    const searchInput = document.getElementById('adminCashPeriodSearchInput');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = "true";
      searchInput.addEventListener('input', filterAdminCashPeriods);
    }

    filterAdminCashPeriods();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--kredit-red); text-align: center; padding: 2rem;">Gagal memuat rekapitulasi periode kas: ${err.message}</td></tr>`;
  }
}

function filterAdminCashPeriods() {
  const searchInput = document.getElementById('adminCashPeriodSearchInput');
  const query = (searchInput?.value || '').toLowerCase().trim();

  const allPeriods = state.cashPeriods || [];
  const filtered = allPeriods.filter(p => {
    return !query ||
      (p.monthLabel || '').toLowerCase().includes(query) ||
      (p.period || '').toLowerCase().includes(query) ||
      (p.notes || '').toLowerCase().includes(query);
  });

  const badge = document.getElementById('cashPeriodsCountBadge');
  if (badge) {
    if (query) {
      badge.textContent = `${filtered.length} / ${allPeriods.length} Periode`;
    } else {
      badge.textContent = `${allPeriods.length} Periode`;
    }
  }

  renderAdminCashPeriodsTableRows(filtered);
}

function renderAdminCashPeriodsTableRows(periods) {
  const tbody = document.getElementById('adminCashPeriodsTableBody');
  if (!tbody) return;

  if (periods.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-500); padding: 2.5rem;">Tidak ada periode bulan yang sesuai kriteria pencarian.</td></tr>`;
    return;
  }

  tbody.innerHTML = periods.map(p => {
    let rateClass = 'none';
    if (p.complianceRate >= 100) rateClass = 'full';
    else if (p.complianceRate > 0) rateClass = 'mid';

    return `
      <tr class="period-row" onclick="openMonthDetail('${p.period}')" style="cursor: pointer;">
        <td>
          <div class="period-month-cell">
            <div class="period-month-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div class="period-month-details">
              <span class="period-month-name">${escapeHtml(p.monthLabel)}</span>
              <span class="period-month-code">${p.period}</span>
            </div>
          </div>
        </td>
        <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--slate-800);">
          ${formatRupiah(p.targetAmount)}
        </td>
        <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--slate-800);">
          ${formatRupiah(p.totalPaid)}
        </td>
        <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--slate-800);">
          ${formatRupiah(p.totalRemaining)}
        </td>
        <td>
          <div class="period-compliance-box">
            <div class="period-compliance-label">
              <span>${p.lunasCount} / ${p.totalMembers} Lunas</span>
              <span class="period-compliance-rate" style="color: var(--navy); font-weight: 800;">${p.complianceRate}%</span>
            </div>
            <div class="cash-progress-bar-bg" style="margin: 0;">
              <div class="cash-progress-bar-fill" style="width: ${p.complianceRate}%; background: var(--navy);"></div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size: 0.8rem; color: var(--slate-600); line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${escapeHtml(p.notes)}">
            ${escapeHtml(p.notes || '-')}
          </span>
        </td>
        <td style="text-align: center;" onclick="event.stopPropagation();">
          <button type="button" class="btn-view-period" onclick="openMonthDetail('${p.period}')">
            <span>Lihat Detail Anggota</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.openMonthDetail = function(period) {
  state.activeCashPeriod = period;
  state.cashMonth = period;

  const modal = document.getElementById('modalMonthCashDetail');
  if (modal) {
    modal.classList.add('active');
  }

  loadAdminCashMatrix(period);
};

window.closeMonthDetail = function() {
  const modal = document.getElementById('modalMonthCashDetail');
  if (modal) {
    modal.classList.remove('active');
  }
};

window.reloadCurrentMonthDetail = function() {
  if (state.activeCashPeriod) {
    loadAdminCashMatrix(state.activeCashPeriod);
  }
};

window.openSetTargetModal = function(period = "") {
  const modal = document.getElementById('modalSetCashTarget');
  if (!modal) return;

  const monthInput = document.getElementById('adminCashMonth');
  const targetInput = document.getElementById('targetAmountInput');
  const notesInput = document.getElementById('targetNotesInput');

  const selectedPeriod = period || state.activeCashPeriod || new Date().toISOString().substring(0, 7);
  if (monthInput) {
    monthInput.value = selectedPeriod;
    monthInput.onchange = function() {
      const p = this.value;
      const ex = (state.cashPeriods || []).find(cp => cp.period === p);
      if (ex) {
        if (targetInput) targetInput.value = ex.targetAmount;
        if (notesInput) notesInput.value = ex.notes || '';
      } else {
        if (targetInput) targetInput.value = 20000;
        if (notesInput) notesInput.value = '';
      }
    };
  }

  const existing = (state.cashPeriods || []).find(p => p.period === selectedPeriod);
  if (existing) {
    if (targetInput) targetInput.value = existing.targetAmount;
    if (notesInput) notesInput.value = existing.notes || '';
  } else {
    if (targetInput) targetInput.value = 20000;
    if (notesInput) notesInput.value = '';
  }

  modal.classList.add('active');
  setTimeout(() => {
    if (!period) monthInput?.focus();
    else targetInput?.focus();
  }, 100);
};

window.editCurrentMonthTarget = function() {
  openSetTargetModal(state.activeCashPeriod);
};

async function loadAdminCashMatrix(period) {
  const currentPeriod = period || state.activeCashPeriod || state.cashMonth || new Date().toISOString().substring(0, 7);
  state.activeCashPeriod = currentPeriod;
  state.cashMonth = currentPeriod;

  const tbody = document.getElementById('adminCashMatrixTableBody');
  const memberSelect = document.getElementById('payMemberSelect');

  try {
    const data = await apiGet(`/api/cash/matrix?month=${currentPeriod}`);
    state.cashMatrix = data.matrix || [];
    state.cashTargetAmount = data.targetAmount || 0;
    state.cashTargetNotes = data.targetNotes || '';

    let monthLabel = currentPeriod;
    const parts = currentPeriod.split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1;
      const monthDate = new Date(y, m, 1);
      monthLabel = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }

    const titleEl = document.getElementById('activeMonthTitle');
    const targetTagEl = document.getElementById('activeMonthTargetTag');
    const notesEl = document.getElementById('activeMonthNotesText');

    if (titleEl) titleEl.textContent = `Rincian Iuran Kas: ${monthLabel}`;
    if (targetTagEl) targetTagEl.textContent = `Target: ${formatRupiah(data.targetAmount)} / Anggota`;
    if (notesEl) notesEl.textContent = `Rencana Alokasi: ${data.targetNotes || 'Operasional Reguler Lab'}`;

    if (memberSelect) {
      memberSelect.innerHTML = `<option value="">-- Pilih Anggota Lab --</option>` +
        (data.matrix || []).map(m => `<option value="${m.memberId}">${escapeHtml(m.name)} (${m.nim})</option>`).join('');
    }

    const totalMembers = data.matrix.length;
    let totalTarget = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let lunasCount = 0;

    data.matrix.forEach(m => {
      totalTarget += m.targetAmount || 0;
      totalPaid += m.paidAmount || 0;
      totalRemaining += m.remaining || 0;
      if (m.status === 'LUNAS' || m.status === 'BEBAS') lunasCount++;
    });

    const complianceRate = totalMembers > 0 ? Math.round((lunasCount / totalMembers) * 100) : 0;

    const statTargetPerMember = document.getElementById('statCashTargetPerMember');
    const statTotalMembers = document.getElementById('statCashTotalMembers');
    const statTotalPaid = document.getElementById('statCashTotalPaid');
    const statPaidCount = document.getElementById('statCashPaidCount');
    const statRemaining = document.getElementById('statCashRemaining');
    const statUnpaidCount = document.getElementById('statCashUnpaidCount');
    const statComplianceRate = document.getElementById('statCashComplianceRate');
    const statPercentText = document.getElementById('statCashPercentText');
    const statProgressBar = document.getElementById('statCashProgressBar');

    if (statTargetPerMember) statTargetPerMember.textContent = formatRupiah(data.targetAmount);
    if (statTotalMembers) statTotalMembers.textContent = `Dari ${totalMembers} Anggota Lab`;
    if (statTotalPaid) statTotalPaid.textContent = formatRupiah(totalPaid);
    if (statPaidCount) statPaidCount.textContent = `${lunasCount} anggota lunas`;
    if (statRemaining) statRemaining.textContent = formatRupiah(totalRemaining);
    if (statUnpaidCount) statUnpaidCount.textContent = `${totalMembers - lunasCount} belum lunas`;
    if (statComplianceRate) statComplianceRate.textContent = `${complianceRate}% Lunas`;
    if (statPercentText) statPercentText.textContent = `${complianceRate}%`;
    if (statProgressBar) statProgressBar.style.width = `${complianceRate}%`;

    const searchInput = document.getElementById('adminCashSearchInput');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = "true";
      searchInput.addEventListener('input', filterAdminCash);
    }

    const statusFilter = document.getElementById('adminCashStatusFilter');
    if (statusFilter && !statusFilter.dataset.bound) {
      statusFilter.dataset.bound = "true";
      statusFilter.addEventListener('change', filterAdminCash);
    }

    filterAdminCash();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="color: var(--kredit-red); text-align: center; padding: 2rem;">Gagal memuat matriks kas: ${err.message}</td></tr>`;
  }
}

function filterAdminCash() {
  const searchInput = document.getElementById('adminCashSearchInput');
  const statusFilter = document.getElementById('adminCashStatusFilter');

  const query = (searchInput?.value || '').toLowerCase().trim();
  const status = statusFilter?.value || '';

  const allMembers = state.cashMatrix || [];
  const filtered = allMembers.filter(m => {
    let matchStatus = true;
    if (status === 'LUNAS') matchStatus = m.status === 'LUNAS' || m.status === 'BEBAS';
    else if (status === 'BELUM_BAYAR') matchStatus = m.status === 'BELUM_BAYAR';
    else if (status === 'PARSIAL') matchStatus = m.status === 'PARSIAL';

    const matchQuery = !query ||
      (m.name || '').toLowerCase().includes(query) ||
      (m.nim || '').toLowerCase().includes(query) ||
      (m.role || '').toLowerCase().includes(query) ||
      (m.memberId || '').toLowerCase().includes(query);

    return matchStatus && matchQuery;
  });

  const countBadge = document.getElementById('adminCashCountBadge');
  if (countBadge) {
    if (query || status) {
      countBadge.textContent = `${filtered.length} / ${allMembers.length} Anggota`;
    } else {
      countBadge.textContent = `${allMembers.length} Anggota`;
    }
  }

  renderAdminCashMatrixTableRows(filtered);
}

function renderAdminCashMatrixTableRows(members) {
  const tbody = document.getElementById('adminCashMatrixTableBody');
  if (!tbody) return;

  if (members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--slate-500); padding: 2.5rem;">Tidak ada anggota yang sesuai kriteria filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = members.map(m => {
    const isLunas = m.status === 'LUNAS' || m.status === 'BEBAS';
    const statusBadgeStyle = isLunas
      ? 'background: rgba(0, 91, 130, 0.08); color: var(--navy); border: 1px solid rgba(0, 91, 130, 0.2);'
      : 'background: var(--slate-100); color: var(--slate-700); border: 1px solid var(--border-color);';

    const initials = (m.name || 'A')
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return `
      <tr>
        <td>
          <div class="member-profile-cell" style="display: flex; align-items: center; gap: 0.75rem; white-space: nowrap;">
            <div class="member-avatar" style="flex-shrink: 0;">${initials}</div>
            <div class="member-details" style="min-width: 0; white-space: nowrap;">
              <span class="member-name" style="white-space: nowrap; font-weight: 700; color: var(--slate-900);">${escapeHtml(m.name)}</span>
              <div class="member-sub" style="white-space: nowrap; display: flex; align-items: center; gap: 0.35rem; margin-top: 2px;">
                <span class="member-nim-badge" style="white-space: nowrap;">${m.nim}</span>
                <span style="color: var(--slate-400);">•</span>
                <span class="member-role-badge" style="white-space: nowrap;">${escapeHtml(m.role || 'Anggota Lab')}</span>
              </div>
            </div>
          </div>
        </td>
        <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--slate-800); white-space: nowrap;">
          ${formatRupiah(m.targetAmount)}
        </td>
        <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--slate-800); white-space: nowrap;">
          ${formatRupiah(m.paidAmount)}
        </td>
        <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--slate-800); white-space: nowrap;">
          ${formatRupiah(m.remaining)}
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <span style="display: inline-flex; align-items: center; justify-content: center; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.76rem; font-weight: 700; white-space: nowrap; ${statusBadgeStyle}">
            ${escapeHtml(m.statusLabel)}
          </span>
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <button type="button" class="btn btn-outline btn-sm" onclick="quickPayModal('${m.memberId}', '${escapeHtml(m.name)}', ${m.remaining})" style="font-weight: 700; padding: 0.35rem 0.75rem; white-space: nowrap;">
            Catat Bayar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.currentQuickPayRemaining = 0;

window.applyQuickAmount = function(val) {
  const amountInput = document.getElementById('quickPayAmount');
  if (!amountInput) return;
  if (val === 'full') {
    amountInput.value = window.currentQuickPayRemaining > 0 ? window.currentQuickPayRemaining : (state.cashTargetAmount || 20000);
  } else {
    amountInput.value = val;
  }
  amountInput.focus();
};

window.openQuickPayModal = function(memberId) {
  window.quickPayModal(memberId);
};

window.quickPayModal = function(memberId, memberName, remaining) {
  const modal = document.getElementById('modalRecordPayment');
  if (!modal) return;

  const currentPeriod = state.activeCashPeriod || state.cashMonth || new Date().toISOString().substring(0, 7);
  let monthLabel = currentPeriod;
  const parts = currentPeriod.split('-');
  if (parts.length === 2) {
    const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const mIdx = parseInt(parts[1]) - 1;
    if (monthNames[mIdx]) monthLabel = `${monthNames[mIdx]} ${parts[0]}`;
  }

  const periodInput = document.getElementById('quickPayPeriod');
  if (periodInput) periodInput.value = currentPeriod;

  const notesInput = document.getElementById('quickPayNotes');
  const amountInput = document.getElementById('quickPayAmount');
  const memberIdInput = document.getElementById('quickPayMemberId');
  const memberCard = document.getElementById('quickPayMemberCard');
  const memberSelectGroup = document.getElementById('quickPayMemberSelectGroup');
  const memberSelect = document.getElementById('quickPayMemberSelect');
  const btnFull = document.getElementById('btnQuickPayFull');

  let member = (state.cashMatrix || []).find(m => m.memberId === memberId);
  if (!member && state.cashMembers) {
    member = state.cashMembers.find(m => m.id === memberId);
  }

  if (memberId && (member || memberName)) {
    const finalName = member ? member.name : memberName;
    const finalNim = member ? member.nim : '';
    const finalRole = member ? (member.role || 'Anggota Lab') : 'Anggota Lab';
    const rem = (member && typeof member.remaining === 'number') ? member.remaining : (remaining || 0);

    if (memberIdInput) memberIdInput.value = memberId;
    if (memberCard) memberCard.style.display = 'flex';
    if (memberSelectGroup) memberSelectGroup.style.display = 'none';

    const initials = (finalName || 'A')
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const avatarEl = document.getElementById('quickPayAvatar');
    const nameEl = document.getElementById('quickPayMemberName');
    const nimRoleEl = document.getElementById('quickPayMemberNimRole');
    const periodTagEl = document.getElementById('quickPayPeriodTag');
    const remainingTagEl = document.getElementById('quickPayRemainingTag');

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = finalName;
    if (nimRoleEl) nimRoleEl.textContent = finalNim ? `${finalNim} • ${finalRole}` : finalRole;
    if (periodTagEl) periodTagEl.textContent = `Bulan: ${monthLabel}`;

    window.currentQuickPayRemaining = rem;
    if (remainingTagEl) {
      remainingTagEl.textContent = rem > 0 ? `Sisa: ${formatRupiah(rem)}` : 'Status: Lunas';
      remainingTagEl.style.color = 'var(--navy)';
    }

    if (amountInput) amountInput.value = rem > 0 ? rem : (state.cashTargetAmount || 20000);
    if (btnFull) btnFull.textContent = rem > 0 ? `Bayar Lunas (${formatRupiah(rem)})` : 'Bayar Target (Rp 20.000)';
    if (notesInput) notesInput.value = `Iuran kas ${monthLabel} - ${finalName}`;
  } else {

    if (memberIdInput) memberIdInput.value = '';
    if (memberCard) memberCard.style.display = 'none';
    if (memberSelectGroup) {
      memberSelectGroup.style.display = 'block';
      const membersList = (state.cashMatrix && state.cashMatrix.length > 0) ? state.cashMatrix : (state.cashMembers || []);
      memberSelect.innerHTML = `<option value="">-- Pilih Anggota Lab --</option>` +
        membersList.map(m => `<option value="${m.memberId || m.id}">${escapeHtml(m.name)} (${m.nim})</option>`).join('');

      memberSelect.onchange = function() {
        const selId = this.value;
        const selM = membersList.find(m => (m.memberId || m.id) === selId);
        if (selM) {
          const rem = typeof selM.remaining === 'number' ? selM.remaining : 20000;
          window.currentQuickPayRemaining = rem;
          if (amountInput) amountInput.value = rem > 0 ? rem : (state.cashTargetAmount || 20000);
          if (btnFull) btnFull.textContent = rem > 0 ? `Bayar Lunas (${formatRupiah(rem)})` : 'Bayar Target (Rp 20.000)';
          if (notesInput) notesInput.value = `Iuran kas ${monthLabel} - ${selM.name}`;
        }
      };
    }

    window.currentQuickPayRemaining = state.cashTargetAmount || 20000;
    if (amountInput) amountInput.value = state.cashTargetAmount || 20000;
    if (btnFull) btnFull.textContent = `Bayar Target (${formatRupiah(state.cashTargetAmount || 20000)})`;
    if (notesInput) notesInput.value = `Iuran kas ${monthLabel}`;
  }

  modal.classList.add('active');
  setTimeout(() => amountInput?.focus(), 100);
};

function formatIndoDate(dateStr) {
  if (!dateStr) return '-';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${months[m] || ''} ${y}`;
  }
  return dateStr;
}

function consolidateCashTransactions(transactions) {
  const duesByPeriod = {};
  const otherTransactions = [];

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  (transactions || []).forEach(trx => {
    if (trx.type === 'income_dues') {
      const period = trx.period || (trx.date ? trx.date.substring(0, 7) : 'Lainnya');
      if (!duesByPeriod[period]) {
        let monthLabel = period;
        const parts = period.split('-');
        if (parts.length === 2) {
          const mIdx = parseInt(parts[1], 10) - 1;
          monthLabel = `${monthNames[mIdx] || parts[1]} ${parts[0]}`;
        }
        duesByPeriod[period] = {
          period: period,
          periodLabel: monthLabel,
          type: 'income_dues',
          amount: 0,
          count: 0,
          latestDate: trx.date || `${period}-01`,
          methods: new Set()
        };
      }
      duesByPeriod[period].amount += (Number(trx.amount) || 0);
      duesByPeriod[period].count += 1;
      if (trx.date && trx.date > duesByPeriod[period].latestDate) {
        duesByPeriod[period].latestDate = trx.date;
      }
      if (trx.paymentMethod) {
        duesByPeriod[period].methods.add(trx.paymentMethod);
      }
    } else {
      otherTransactions.push({ ...trx });
    }
  });

  const consolidatedDues = Object.keys(duesByPeriod).map(period => {
    const group = duesByPeriod[period];
    const methodsArr = Array.from(group.methods);
    let methodStr = 'Kolektif';
    if (methodsArr.length === 1) {
      methodStr = methodsArr[0];
    } else if (methodsArr.length > 1) {
      methodStr = 'Transfer / Tunai';
    }

    return {
      id: `DUES-SUM-${period}`,
      date: group.latestDate,
      displayDate: group.periodLabel,
      type: 'income_dues',
      period: period,
      periodLabel: group.periodLabel,
      amount: group.amount,
      paymentMethod: methodStr,
      memberName: `Iuran Kas ${group.periodLabel}`,
      description: `Total akumulasi penerimaan iuran kas anggota (${group.count} pembayaran)`,
      notes: `Total penerimaan kas ${group.periodLabel}`,
      receiptFile: null,
      isConsolidated: true,
      count: group.count
    };
  });

  const merged = [...consolidatedDues, ...otherTransactions];

  merged.sort((a, b) => {
    const da = a.period || (a.date ? a.date.substring(0, 7) : '');
    const db = b.period || (b.date ? b.date.substring(0, 7) : '');
    if (da === db) {
      if (a.type === 'income_dues') return -1;
      if (b.type === 'income_dues') return 1;
      const dda = a.date || '';
      const ddb = b.date || '';
      if (dda === ddb) {
        return (a.id || '') > (b.id || '') ? 1 : -1;
      }
      return dda > ddb ? 1 : -1;
    }
    return da > db ? 1 : -1;
  });

  let runningBal = 0;
  merged.forEach(trx => {
    const amt = Number(trx.amount) || 0;
    if (trx.type === 'expense') {
      runningBal -= amt;
    } else {
      runningBal += amt;
    }
    trx.runningBalance = runningBal;
  });

  return merged;
}

async function loadAdminFinanceLedger() {
  try {
    const [summary, transactions] = await Promise.all([
      apiGet('/api/cash/summary'),
      apiGet('/api/cash/transactions')
    ]);

    const balEl = document.getElementById('financeStatBalance');
    const incEl = document.getElementById('financeStatIncome');
    const expEl = document.getElementById('financeStatExpense');
    const cntEl = document.getElementById('financeStatCount');

    if (balEl) balEl.textContent = formatRupiah(summary.balance || 0);
    if (incEl) incEl.textContent = formatRupiah(summary.totalIncome || 0);
    if (expEl) expEl.textContent = formatRupiah(summary.totalExpense || 0);

    const consolidated = consolidateCashTransactions(transactions || []);

    if (cntEl) cntEl.textContent = `${consolidated.length}`;

    state.financeTransactionsChronological = consolidated;
    state.financeTransactions = [...consolidated].reverse();

    renderAdminFinanceTable();
  } catch (err) {
    console.error("Gagal memuat buku rekapitulasi keuangan:", err);
  }
}

function renderAdminFinanceTable() {
  const tbody = document.getElementById('adminFinanceTableBody');
  const countBadge = document.getElementById('financeTrxCountBadge');
  if (!tbody) return;

  const search = (document.getElementById('financeSearchInput')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('financeTypeFilter')?.value || '';
  const monthFilter = document.getElementById('financeMonthFilter')?.value || '';

  const list = state.financeTransactions || [];
  const filtered = list.filter(trx => {

    if (typeFilter && trx.type !== typeFilter) return false;

    if (monthFilter) {
      const trxMonth = (trx.period || trx.date || '').substring(0, 7);
      if (trxMonth !== monthFilter) return false;
    }

    if (search) {
      const desc = (trx.description || '').toLowerCase();
      const name = (trx.memberName || '').toLowerCase();
      const notes = (trx.notes || '').toLowerCase();
      const cat = (trx.category || '').toLowerCase();
      const method = (trx.paymentMethod || '').toLowerCase();
      const dateStr = (trx.displayDate || trx.date || '').toLowerCase();
      const periodStr = (trx.periodLabel || '').toLowerCase();
      if (!desc.includes(search) && !name.includes(search) && !notes.includes(search) && !cat.includes(search) && !method.includes(search) && !dateStr.includes(search) && !periodStr.includes(search)) {
        return false;
      }
    }

    return true;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} Catatan`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--slate-500); padding: 2.5rem 1rem;">
          Tidak ada data transaksi keuangan yang sesuai dengan kriteria pencarian/filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((trx, idx) => {
    const isExpense = trx.type === 'expense';
    const isDues = trx.type === 'income_dues';

    let typeBadge = '';
    let categoryTitle = '';
    let descSubtitle = '';
    let displayDate = formatIndoDate(trx.date);

    if (isDues) {
      typeBadge = `<span style="display: inline-block; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.74rem; font-weight: 700; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">Iuran Kas</span>`;
      categoryTitle = `Iuran Kas ${escapeHtml(trx.periodLabel || trx.period || '')}`;
      descSubtitle = `Total akumulasi penerimaan iuran kas anggota (${trx.count || 1} penyetor)`;
      displayDate = trx.periodLabel || formatIndoDate(trx.date);
    } else if (trx.type === 'income_other') {
      typeBadge = `<span style="display: inline-block; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.74rem; font-weight: 700; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">Pemasukan Lain</span>`;
      categoryTitle = escapeHtml(trx.memberName || 'Pemasukan Kas Eksternal');
      descSubtitle = trx.notes ? escapeHtml(trx.notes) : 'Pemasukan kas laboratorium';
      displayDate = formatIndoDate(trx.date);
    } else {
      typeBadge = `<span style="display: inline-block; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.74rem; font-weight: 700; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">Pengeluaran</span>`;
      categoryTitle = escapeHtml(trx.category || 'Belanja Operasional');
      descSubtitle = escapeHtml(trx.description || '-');
      displayDate = formatIndoDate(trx.date);
    }

    const receiptHtml = trx.receiptFile 
      ? `<a href="${trx.receiptFile}" target="_blank" class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.72rem; text-decoration: none;" title="Lihat Nota Bukti">Lihat</a>`
      : `<span style="color: var(--slate-400); font-size: 0.8rem;">-</span>`;

    return `
      <tr>
        <td style="text-align: center; color: var(--slate-500); font-size: 0.8rem; font-weight: 600;">${idx + 1}</td>
        <td style="white-space: nowrap; font-size: 0.82rem; font-weight: 600; color: var(--slate-800);">${displayDate}</td>
        <td style="white-space: nowrap;">${typeBadge}</td>
        <td>
          <div style="font-weight: 700; color: var(--slate-900); font-size: 0.86rem;">${categoryTitle}</div>
          <div style="font-size: 0.78rem; color: var(--slate-500); margin-top: 1px;">${descSubtitle}</div>
        </td>
        <td style="font-size: 0.8rem; color: var(--slate-700); white-space: nowrap;">${escapeHtml(trx.paymentMethod || 'Kolektif')}</td>
        <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 0.84rem; font-weight: 700; color: var(--slate-900); white-space: nowrap;">
          ${!isExpense ? '+' + formatRupiah(trx.amount) : '-'}
        </td>
        <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 0.84rem; font-weight: 700; color: var(--slate-900); white-space: nowrap;">
          ${isExpense ? '-' + formatRupiah(trx.amount) : '-'}
        </td>
        <td style="text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 0.84rem; font-weight: 800; color: var(--navy); white-space: nowrap;">
          ${formatRupiah(trx.runningBalance || 0)}
        </td>
        <td style="text-align: center; white-space: nowrap;">${receiptHtml}</td>
      </tr>
    `;
  }).join('');
}

window.openFinancePdfModal = function() {
  const container = document.getElementById('printableFinanceReportArea');
  if (!container) return;

  const monthFilter = document.getElementById('financeMonthFilter')?.value || '';
  const allChronological = state.financeTransactionsChronological || [];

  let reportTransactions = allChronological;
  let periodLabel = 'Seluruh Periode (Akumulatif)';

  if (monthFilter) {
    const parts = monthFilter.split('-');
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    if (parts.length === 2) {
      const mIdx = parseInt(parts[1], 10) - 1;
      periodLabel = `Bulan ${monthNames[mIdx] || parts[1]} ${parts[0]}`;
    }
    reportTransactions = allChronological.filter(t => {
      const trxMonth = (t.period || t.date || '').substring(0, 7);
      return trxMonth === monthFilter;
    });
  }

  let totalIn = 0;
  let totalOut = 0;
  reportTransactions.forEach(t => {
    if (t.type === 'expense') {
      totalOut += (Number(t.amount) || 0);
    } else {
      totalIn += (Number(t.amount) || 0);
    }
  });
  const netBalance = totalIn - totalOut;
  const todayIndo = formatIndoDate(new Date().toISOString().substring(0, 10));

  const rowsHtml = reportTransactions.length > 0 ? reportTransactions.map((trx, idx) => {
    const isExpense = trx.type === 'expense';
    let jenisText = 'Iuran Kas';
    let uraian = '';
    let displayDate = formatIndoDate(trx.date);

    if (trx.type === 'income_dues') {
      jenisText = 'Iuran Kas';
      uraian = `Iuran Kas ${trx.periodLabel || trx.period || ''}`;
      displayDate = trx.periodLabel || formatIndoDate(trx.date);
    } else if (trx.type === 'income_other') {
      jenisText = 'Pemasukan Lain';
      uraian = `${escapeHtml(trx.memberName || 'Pemasukan Eksternal')}${trx.notes ? ' — ' + escapeHtml(trx.notes) : ''}`;
    } else {
      jenisText = 'Pengeluaran';
      uraian = `[${escapeHtml(trx.category || 'Belanja')}] ${escapeHtml(trx.description || '-')}`;
    }

    return `
      <tr>
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td style="white-space: nowrap;">${displayDate}</td>
        <td style="white-space: nowrap; font-weight: 600;">${jenisText}</td>
        <td>${uraian}</td>
        <td style="white-space: nowrap;">${escapeHtml(trx.paymentMethod || 'Kolektif')}</td>
        <td style="text-align: right; font-family: monospace; white-space: nowrap;">${!isExpense ? formatRupiah(trx.amount) : '-'}</td>
        <td style="text-align: right; font-family: monospace; white-space: nowrap;">${isExpense ? formatRupiah(trx.amount) : '-'}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; white-space: nowrap;">${formatRupiah(trx.runningBalance || 0)}</td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="8" style="text-align: center; color: #64748b; padding: 2rem;">Tidak ada catatan transaksi pada periode yang dipilih.</td>
    </tr>
  `;

  container.innerHTML = `
    <div class="pdf-kop">
      <img src="/assets/logo-iot-lab.png" alt="Logo Internet of Things Laboratory" class="pdf-kop-logo" onerror="this.style.display='none'">
      <div class="pdf-kop-text">
        <h2>INTERNET OF THINGS LABORATORY</h2>
        <h3>TELKOM UNIVERSITY</h3>
        <p>Telkom University Landmark Tower Lantai 6 Ruang 12<br>
        Jl. Telekomunikasi Terusan Buah Batu, Bandung 40257 | Email: iotlab@telkomuniversity.ac.id</p>
      </div>
    </div>

    <div class="pdf-doc-title">Laporan Rekapitulasi Arus Kas & Keuangan Laboratorium</div>
    <div class="pdf-doc-subtitle">
      Periode Laporan: <strong>${periodLabel}</strong> &nbsp;|&nbsp; Tanggal Cetak: ${todayIndo}
    </div>

    <div class="pdf-summary-grid">
      <div class="pdf-summary-card">
        <div class="pdf-summary-card-label">Total Pemasukan</div>
        <div class="pdf-summary-card-val">${formatRupiah(totalIn)}</div>
      </div>
      <div class="pdf-summary-card">
        <div class="pdf-summary-card-label">Total Pengeluaran</div>
        <div class="pdf-summary-card-val">${formatRupiah(totalOut)}</div>
      </div>
      <div class="pdf-summary-card">
        <div class="pdf-summary-card-label">Saldo Kas Bersih</div>
        <div class="pdf-summary-card-val">${formatRupiah(netBalance)}</div>
      </div>
      <div class="pdf-summary-card">
        <div class="pdf-summary-card-label">Total Transaksi</div>
        <div class="pdf-summary-card-val">${reportTransactions.length} Data</div>
      </div>
    </div>

    <table class="pdf-table">
      <thead>
        <tr>
          <th style="width: 32px; text-align: center;">No</th>
          <th style="width: 85px;">Tanggal</th>
          <th style="width: 95px;">Jenis</th>
          <th>Uraian Transaksi & Pihak Terkait</th>
          <th style="width: 85px;">Metode</th>
          <th style="width: 95px; text-align: right;">Masuk (+)</th>
          <th style="width: 95px; text-align: right;">Keluar (-)</th>
          <th style="width: 105px; text-align: right;">Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9; font-weight: 800;">
          <td colspan="5" style="text-align: right; padding: 0.5rem 0.65rem;">TOTAL KUMULATIF PERIODE INI:</td>
          <td style="text-align: right; font-family: monospace; font-weight: 800; padding: 0.5rem 0.45rem;">${formatRupiah(totalIn)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 800; padding: 0.5rem 0.45rem;">${formatRupiah(totalOut)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 900; padding: 0.5rem 0.45rem; color: #005b82;">${formatRupiah(netBalance)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="pdf-signatures">
      <div class="pdf-sig-box">
        <div>Mengetahui,</div>
        <div style="font-weight: 700; margin-top: 2px;">Dosen Pembina Laboratorium IoT</div>
        <div class="pdf-sig-space"></div>
        <div style="font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">( .................................................... )</div>
        <div style="font-size: 0.78rem; color: #475569; margin-top: 4px; letter-spacing: 0.5px;">NIP. ....................................................</div>
      </div>
      <div class="pdf-sig-box">
        <div>Bandung, ${todayIndo}</div>
        <div style="font-weight: 700; margin-top: 2px;">Bendahara / Pengelola Lab IoT</div>
        <div class="pdf-sig-space"></div>
        <div style="font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">( .................................................... )</div>
        <div style="font-size: 0.78rem; color: #475569; margin-top: 4px; letter-spacing: 0.5px;">NIM / NIP. ...........................................</div>
      </div>
    </div>
  `;

  const rowCount = reportTransactions.length;
  let pages = 1;
  if (rowCount > 11) {
    pages = Math.ceil((rowCount - 11) / 18) + 1;
    if (pages < 2) pages = 2;
  }
  container.setAttribute('data-pages', String(pages));
  container.style.minHeight = (pages === 1 ? '255mm' : (pages === 2 ? '490mm' : '740mm'));

  document.getElementById('modalFinancePdfPreview')?.classList.add('active');

  setTimeout(() => {
    const table = container.querySelector('.pdf-table');
    if (table) {
      const contentHeight = table.offsetTop + table.offsetHeight + 180;
      const domPages = Math.ceil(contentHeight / 980);
      if (domPages > pages) {
        pages = domPages;
        container.setAttribute('data-pages', String(pages));
        container.style.minHeight = (pages === 1 ? '255mm' : (pages === 2 ? '490mm' : '740mm'));
      }
    }
  }, 40);
};

window.printFinanceReport = function() {
  const container = document.getElementById('printableFinanceReportArea');
  if (container) {
    const pages = parseInt(container.getAttribute('data-pages') || '1', 10);
    container.style.minHeight = (pages === 1 ? '245mm' : (pages === 2 ? '475mm' : '720mm'));
  }
  window.print();
};

window.openAddIncomeModal = function() {
  const modal = document.getElementById('modalAddIncome');
  const dateInput = document.getElementById('addIncomeDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().substring(0, 10);
  }
  document.getElementById('formAddIncome')?.reset();
  if (dateInput) {
    dateInput.value = new Date().toISOString().substring(0, 10);
  }
  modal?.classList.add('active');
};

window.openAddExpenseModal = function() {
  const modal = document.getElementById('modalAddExpense');
  const dateInput = document.getElementById('addExpenseDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().substring(0, 10);
  }
  document.getElementById('formAddExpense')?.reset();
  if (dateInput) {
    dateInput.value = new Date().toISOString().substring(0, 10);
  }
  modal?.classList.add('active');
};

function formatRupiah(number) {
  const num = parseInt(number) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
