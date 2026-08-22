const STORAGE_KEY = "closedAuctionHelperStateV1";
const DATA_SCHEMA_VERSION = 2;

const DEFAULT_STATE = {
  schemaVersion: DATA_SCHEMA_VERSION,
  auctionTitle: "Weekend Closed Auction",
  view: "active",
  filter: "all",
  historyFilter: "all",
  bundleDraft: [],
  items: [],
  history: []
};

let state = structuredClone(DEFAULT_STATE);
let pendingIconData = "";
let pendingSourceItemId = "";
let editingBundleItems = [];
let editingBundleCoverItemId = "";
let bundleModalUsesDraft = false;
let saleItemId = null;
let showcaseLotId = null;
let draggedId = null;
let toastTimer = null;

let catalogPager = {
  query: "",
  page: 0,
  lastPage: 0,
  perPage: 12,
  total: 0,
  loading: false
};

const $ = (id) => document.getElementById(id);

const els = {
  auctionTitle: $("auctionTitle"),
  remainingStat: $("remainingStat"),
  soldStat: $("soldStat"),
  reserveStat: $("reserveStat"),
  salesStat: $("salesStat"),
  currentPosition: $("currentPosition"),
  emptyCurrent: $("emptyCurrent"),
  currentCard: $("currentCard"),
  currentIcon: $("currentIcon"),
  currentName: $("currentName"),
  currentReserve: $("currentReserve"),
  currentQty: $("currentQty"),
  currentQtyChip: $("currentQtyChip"),
  currentLotTypeChip: $("currentLotTypeChip"),
  currentNotes: $("currentNotes"),
  currentBundleSummary: $("currentBundleSummary"),
  soldBtn: $("soldBtn"),
  noSaleBtn: $("noSaleBtn"),
  skipBtn: $("skipBtn"),
  nextUpList: $("nextUpList"),
  itemCount: $("itemCount"),
  itemsList: $("itemsList"),
  searchInput: $("searchInput"),
  filterBar: $("filterBar"),
  activeView: $("activeView"),
  historyView: $("historyView"),
  historyCount: $("historyCount"),
  historyItemCount: $("historyItemCount"),
  historySearchInput: $("historySearchInput"),
  historyFilterBar: $("historyFilterBar"),
  historyList: $("historyList"),
  repairAllImagesBtn: $("repairAllImagesBtn"),
  viewCurrentItemsBtn: $("viewCurrentItemsBtn"),
  copyCurrentNameBtn: $("copyCurrentNameBtn"),

  catalogSearchForm: $("catalogSearchForm"),
  catalogSearchInput: $("catalogSearchInput"),
  catalogSearchBtn: $("catalogSearchBtn"),
  catalogStatus: $("catalogStatus"),
  catalogResults: $("catalogResults"),
  catalogPager: $("catalogPager"),
  catalogPrev: $("catalogPrev"),
  catalogNext: $("catalogNext"),
  catalogPageLabel: $("catalogPageLabel"),

  bundleDraftSection: $("bundleDraftSection"),
  bundleDraftCount: $("bundleDraftCount"),
  bundleDraftList: $("bundleDraftList"),
  clearBundleDraftBtn: $("clearBundleDraftBtn"),
  copyBundleDraftBtn: $("copyBundleDraftBtn"),
  createBundleFromDraftBtn: $("createBundleFromDraftBtn"),

  itemModal: $("itemModal"),
  itemModalTitle: $("itemModalTitle"),
  itemForm: $("itemForm"),
  editId: $("editId"),
  sourceItemId: $("sourceItemId"),
  lotTypeInput: $("lotTypeInput"),
  iconPreview: $("iconPreview"),
  iconInput: $("iconInput"),
  removeIconBtn: $("removeIconBtn"),
  iconSourceHint: $("iconSourceHint"),
  nameInput: $("nameInput"),
  reserveInput: $("reserveInput"),
  qtyInput: $("qtyInput"),
  qtyFieldWrap: $("qtyFieldWrap"),
  bundleEditor: $("bundleEditor"),
  bundleModalList: $("bundleModalList"),
  appendDraftBtn: $("appendDraftBtn"),
  clearBundleItemsBtn: $("clearBundleItemsBtn"),
  copyBundleItemsBtn: $("copyBundleItemsBtn"),
  statusInput: $("statusInput"),
  notesInput: $("notesInput"),
  soldFields: $("soldFields"),
  buyerInput: $("buyerInput"),
  soldPriceInput: $("soldPriceInput"),
  saleModal: $("saleModal"),
  saleForm: $("saleForm"),
  saleBuyer: $("saleBuyer"),
  salePrice: $("salePrice"),
  saleReserveHint: $("saleReserveHint"),
  saleItemMini: $("saleItemMini"),
  lotItemsModal: $("lotItemsModal"),
  lotShowcaseAuction: $("lotShowcaseAuction"),
  lotShowcaseTitle: $("lotShowcaseTitle"),
  lotShowcaseMeta: $("lotShowcaseMeta"),
  lotShowcaseGrid: $("lotShowcaseGrid"),
  copyShowcaseNamesBtn: $("copyShowcaseNamesBtn"),
  backupBtn: $("backupBtn"),
  backupMenu: $("backupMenu"),
  exportDataBtn: $("exportDataBtn"),
  exportBtn: $("exportBtn"),
  importInput: $("importInput"),
  toast: $("toast")
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneBundleItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    draftId: item?.draftId || uid(),
    name: typeof item?.name === "string" ? item.name : "",
    icon: typeof item?.icon === "string" ? item.icon : "",
    sourceItemId: item?.sourceItemId ? String(item.sourceItemId) : ""
  }));
}

function cleanLot(item, index = 0) {
  const bundleItems = cloneBundleItems(item?.bundleItems);
  const lotType = item?.lotType === "bundle" ? "bundle" : "single";
  const status = ["ready", "sold", "no-sale"].includes(item?.status) ? item.status : "ready";
  let bundleCoverItemId = typeof item?.bundleCoverItemId === "string" ? item.bundleCoverItemId : "";

  if (lotType === "bundle" && !bundleItems.some(bundleItem => bundleItem.draftId === bundleCoverItemId)) {
    const matchingIcon = bundleItems.find(bundleItem => bundleItem.icon && bundleItem.icon === item?.icon);
    bundleCoverItemId = matchingIcon?.draftId || "";
  }

  const cleaned = {
    id: typeof item?.id === "string" ? item.id : uid(),
    lotType,
    name: typeof item?.name === "string" ? item.name : `Auction Lot ${index + 1}`,
    reserve: Number.isFinite(Number(item?.reserve)) ? Number(item.reserve) : 0,
    quantity: Math.max(1, Number.parseInt(item?.quantity, 10) || 1),
    notes: typeof item?.notes === "string" ? item.notes : "",
    icon: typeof item?.icon === "string" ? item.icon : "",
    sourceItemId: item?.sourceItemId ? String(item.sourceItemId) : "",
    bundleItems,
    bundleCoverItemId,
    status,
    buyer: typeof item?.buyer === "string" ? item.buyer : "",
    soldPrice: Number.isFinite(Number(item?.soldPrice)) ? Number(item.soldPrice) : 0,
    createdAt: item?.createdAt || new Date().toISOString(),
    completedAt: status === "ready" ? null : (item?.completedAt || new Date().toISOString())
  };

  if (cleaned.lotType === "bundle") {
    cleaned.quantity = 1;
    cleaned.sourceItemId = "";
    const selected = cleaned.bundleItems.find(bundleItem => bundleItem.draftId === cleaned.bundleCoverItemId);
    if (selected) cleaned.icon = selected.icon || cleaned.icon;
    if (!cleaned.icon && cleaned.bundleItems[0]) {
      cleaned.bundleCoverItemId = cleaned.bundleItems[0].draftId;
      cleaned.icon = cleaned.bundleItems[0].icon || "";
    }
  } else {
    cleaned.bundleItems = [];
    cleaned.bundleCoverItemId = "";
  }

  return cleaned;
}

function cleanState(input) {
  const allInputItems = Array.isArray(input?.items) ? input.items.map(cleanLot) : [];
  const explicitHistory = Array.isArray(input?.history) ? input.history.map(cleanLot) : [];
  const migratedHistory = allInputItems.filter(item => item.status !== "ready");
  const historyById = new Map();
  [...explicitHistory, ...migratedHistory].forEach(item => historyById.set(item.id, item));

  const safe = {
    schemaVersion: DATA_SCHEMA_VERSION,
    auctionTitle: typeof input?.auctionTitle === "string" ? input.auctionTitle : DEFAULT_STATE.auctionTitle,
    view: input?.view === "history" ? "history" : "active",
    filter: ["all", "ready"].includes(input?.filter) ? input.filter : "all",
    historyFilter: ["all", "sold", "no-sale"].includes(input?.historyFilter) ? input.historyFilter : "all",
    bundleDraft: cloneBundleItems(input?.bundleDraft),
    items: allInputItems.filter(item => item.status === "ready"),
    history: [...historyById.values()]
  };

  return safe;
}

async function loadState() {
  const saved = await chrome.storage.local.get(STORAGE_KEY);
  if (saved[STORAGE_KEY]) state = cleanState(saved[STORAGE_KEY]);
  els.auctionTitle.value = state.auctionTitle;
  render();
}

async function saveState() {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function parseCoins(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[, _]/g, "")
    .replace(/coins?/g, "");

  if (!raw) return 0;

  const match = raw.match(/^(-?\d*\.?\d+)([kmbt])?$/i);
  if (!match) return NaN;

  const n = Number(match[1]);
  const mult = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
  return n * (match[2] ? mult[match[2].toLowerCase()] : 1);
}

function formatCoins(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const table = [
    [1e12, "t"],
    [1e9, "b"],
    [1e6, "m"],
    [1e3, "k"]
  ];
  for (const [size, suffix] of table) {
    if (abs >= size) {
      const scaled = n / size;
      const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2;
      return `${Number(scaled.toFixed(digits))}${suffix}`;
    }
  }
  return Math.round(n).toLocaleString();
}

function formatPossiblePrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return formatCoins(n);
}

function getCatalogPrice(item) {
  const candidates = [
    item?.market_price,
    item?.marketPrice,
    item?.price,
    item?.average_price,
    item?.averagePrice
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildBadgeMarkup(item) {
  if (item.lotType === "bundle" && Array.isArray(item.bundleItems) && item.bundleItems.length > 1) {
    return `<span class="bundle-badge">${item.bundleItems.length}</span>`;
  }
  return "";
}

function getInitials(text) {
  return (text || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() || "")
    .join("") || "CA";
}

function getBundleCoverItem(item) {
  if (item?.lotType !== "bundle") return null;
  return (item.bundleItems || []).find(bundleItem => bundleItem.draftId === item.bundleCoverItemId) || null;
}

function getDisplaySourceItemId(item) {
  if (item?.lotType === "bundle") return getBundleCoverItem(item)?.sourceItemId || "";
  return item?.sourceItemId || "";
}

function iconMarkup(item, extraClass = "") {
  if (item.icon) {
    const sourceItemId = getDisplaySourceItemId(item);
    return `<div class="item-icon ${extraClass}"><img src="${escapeHtml(item.icon)}" alt="" referrerpolicy="no-referrer" data-image-fallback="${escapeHtml(getInitials(item.name))}"${sourceItemId ? ` data-yw-item-id="${escapeHtml(sourceItemId)}"` : ""}>${buildBadgeMarkup(item)}</div>`;
  }
  return `<div class="item-icon ${extraClass}"><span>${escapeHtml(getInitials(item.name))}</span>${buildBadgeMarkup(item)}</div>`;
}

function wireImageFallbacks(root = document) {
  root.querySelectorAll("img[data-image-fallback]").forEach(img => {
    if (img.dataset.fallbackBound === "1") return;
    img.dataset.fallbackBound = "1";
    img.addEventListener("error", () => {
      const sourceItemId = img.dataset.ywItemId || "";
      if (sourceItemId && img.dataset.jpgFallbackTried !== "1") {
        img.dataset.jpgFallbackTried = "1";
        img.src = buildYwCdnImageUrlFromId(sourceItemId, "jpg");
        return;
      }
      const initials = document.createElement("span");
      initials.textContent = img.dataset.imageFallback || "CA";
      initials.className = "image-fallback-initials";
      img.replaceWith(initials);
    });
  });
}

async function copyText(text, successMessage = "Name copied") {
  const value = String(text || "").trim();
  if (!value) return showToast("Nothing to copy");

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast(successMessage);
}

function formatCompletedAt(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function syncBundleCoverIcon(item) {
  if (item?.lotType !== "bundle") return;
  const cover = getBundleCoverItem(item);
  if (cover) item.icon = cover.icon || "";
}

function getLotTypeLabel(item) {
  return item.lotType === "bundle" ? `Bundle · ${item.bundleItems.length} items` : "Single Item";
}

function getReadyItems() {
  return state.items.filter(item => item.status === "ready");
}

function getCurrentItem() {
  return getReadyItems()[0] || null;
}

function getLotById(id) {
  return state.items.find(item => item.id === id) || state.history.find(item => item.id === id) || null;
}

function getLotShowcaseItems(lot) {
  if (!lot) return [];
  if (lot.lotType === "bundle" && lot.bundleItems.length) {
    return lot.bundleItems.map(item => ({
      ...item,
      lotType: "single",
      bundleItems: [],
      quantity: 1
    }));
  }
  return [{
    name: lot.name,
    icon: lot.icon,
    sourceItemId: lot.sourceItemId,
    lotType: "single",
    bundleItems: [],
    quantity: lot.quantity
  }];
}

function openLotItemsModal(lotId) {
  const lot = getLotById(lotId);
  if (!lot) return showToast("That auction lot could not be found");

  const showcaseItems = getLotShowcaseItems(lot);
  showcaseLotId = lot.id;
  els.lotShowcaseAuction.textContent = state.auctionTitle || "Auction";
  els.lotShowcaseTitle.textContent = lot.name;

  const lotType = lot.lotType === "bundle"
    ? `Bundle - ${showcaseItems.length} ${showcaseItems.length === 1 ? "item" : "items"}`
    : `Single Item${lot.quantity > 1 ? ` - Qty ${lot.quantity}` : ""}`;
  els.lotShowcaseMeta.textContent = `${lotType} - Reserve / Start ${formatCoins(lot.reserve)}`;

  els.lotShowcaseGrid.innerHTML = showcaseItems.map(item => `
    <article class="lot-showcase-item">
      ${iconMarkup(item, "lot-showcase-icon")}
      <h3>${escapeHtml(item.name)}</h3>
      ${item.quantity > 1 ? `<span class="lot-showcase-qty">Quantity ${item.quantity}</span>` : ""}
    </article>
  `).join("");
  els.lotShowcaseGrid.classList.toggle("compact", showcaseItems.length > 8);
  els.lotShowcaseGrid.classList.toggle("extra-compact", showcaseItems.length > 16);

  els.lotItemsModal.classList.remove("hidden");
  document.body.classList.add("showcase-open");
  wireImageFallbacks(els.lotShowcaseGrid);
}

function closeLotItemsModal() {
  showcaseLotId = null;
  els.lotItemsModal.classList.add("hidden");
  document.body.classList.remove("showcase-open");
  els.lotShowcaseGrid.innerHTML = "";
}

function generateBundleName(items) {
  const count = Array.isArray(items) ? items.length : 0;
  if (!count) return "Bundle Auction";
  if (count === 1) return `Bundle: ${items[0].name}`;
  return `Bundle (${count} items)`;
}

function render() {
  renderViews();
  renderStats();
  renderCurrent();
  renderNextUp();
  renderItems();
  renderFilters();
  renderBundleDraft();
  renderHistory();
  wireImageFallbacks();
}

function renderViews() {
  const showingHistory = state.view === "history";
  els.activeView.classList.toggle("hidden", showingHistory);
  els.historyView.classList.toggle("hidden", !showingHistory);
  document.querySelectorAll("[data-view-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.viewTab === state.view);
  });
}

function renderStats() {
  const remaining = state.items.length;
  const sold = state.history.filter(i => i.status === "sold").length;
  const allLots = [...state.items, ...state.history];
  const reserveTotal = allLots.reduce((sum, i) => sum + (i.reserve * (i.lotType === "bundle" ? 1 : i.quantity)), 0);
  const actualSales = state.history
    .filter(i => i.status === "sold")
    .reduce((sum, i) => sum + i.soldPrice, 0);

  els.remainingStat.textContent = remaining.toLocaleString();
  els.soldStat.textContent = sold.toLocaleString();
  els.reserveStat.textContent = formatCoins(reserveTotal);
  els.salesStat.textContent = formatCoins(actualSales);
  els.itemCount.textContent = `${state.items.length} ${state.items.length === 1 ? "item" : "items"}`;
  els.historyCount.textContent = state.history.length.toLocaleString();
  els.historyItemCount.textContent = `${state.history.length} ${state.history.length === 1 ? "record" : "records"}`;
}

function renderCurrent() {
  const item = getCurrentItem();

  if (!item) {
    els.emptyCurrent.classList.remove("hidden");
    els.currentCard.classList.add("hidden");
    els.currentPosition.textContent = state.items.length ? "Queue complete" : "—";
    return;
  }

  const originalIndex = state.items.findIndex(i => i.id === item.id);

  els.emptyCurrent.classList.add("hidden");
  els.currentCard.classList.remove("hidden");
  els.currentPosition.textContent = `${originalIndex + 1} of ${state.items.length}`;

  const currentSourceItemId = getDisplaySourceItemId(item);
  els.currentIcon.innerHTML = item.icon
    ? `<img src="${escapeHtml(item.icon)}" alt="" referrerpolicy="no-referrer" data-image-fallback="${escapeHtml(getInitials(item.name))}"${currentSourceItemId ? ` data-yw-item-id="${escapeHtml(currentSourceItemId)}"` : ""}>${buildBadgeMarkup(item)}`
    : `<span>${escapeHtml(getInitials(item.name))}</span>${buildBadgeMarkup(item)}`;

  els.currentName.textContent = item.name;
  els.currentReserve.textContent = formatCoins(item.reserve);
  els.currentLotTypeChip.textContent = item.lotType === "bundle" ? `Bundle · ${item.bundleItems.length}` : "Single";

  if (item.lotType === "bundle") {
    els.currentQtyChip.classList.add("hidden");
    const names = item.bundleItems.slice(0, 5).map(bundleItem =>
      `<span class="bundle-summary-chip">${escapeHtml(bundleItem.name)}</span>`
    ).join("");
    const more = item.bundleItems.length > 5
      ? `<span class="bundle-summary-chip">+${item.bundleItems.length - 5} more</span>`
      : "";
    els.currentBundleSummary.innerHTML = names + more;
    els.currentBundleSummary.classList.remove("hidden");
  } else {
    els.currentQty.textContent = item.quantity;
    els.currentQtyChip.classList.remove("hidden");
    els.currentBundleSummary.classList.add("hidden");
    els.currentBundleSummary.innerHTML = "";
  }

  els.currentNotes.textContent = item.notes || "";
  els.currentNotes.classList.toggle("hidden", !item.notes);
}

function renderNextUp() {
  const ready = getReadyItems().slice(1, 4);

  if (!ready.length) {
    els.nextUpList.innerHTML = `<div class="empty-list">${getCurrentItem() ? "No additional items queued." : "Nothing waiting in the queue."}</div>`;
    return;
  }

  els.nextUpList.innerHTML = ready.map((item, index) => `
    <div class="next-card">
      ${iconMarkup(item)}
      <div class="next-card-copy">
        <strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(getLotTypeLabel(item))} · Reserve ${formatCoins(item.reserve)}${item.lotType === "single" && item.quantity > 1 ? ` · Qty ${item.quantity}` : ""}</span>
      </div>
      <button class="mini-btn text-mini-btn showcase-mini-btn" data-view-lot="${escapeHtml(item.id)}" title="View all lot items">View</button>
      <button class="mini-btn text-mini-btn" data-copy-name="${item.id}" title="Copy item name">Copy</button>
      <span class="next-number">+${index + 1}</span>
    </div>
  `).join("");
}

function renderFilters() {
  els.filterBar.querySelectorAll("[data-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === state.filter);
  });
}

function renderItems() {
  const query = els.searchInput.value.trim().toLowerCase();

  const items = state.items.filter(item => {
    const filterOk = state.filter === "all" || item.status === state.filter;
    const searchTarget = [
      item.name,
      item.notes,
      item.buyer,
      ...(item.bundleItems || []).map(bundleItem => bundleItem.name)
    ].join(" ").toLowerCase();
    const searchOk = !query || searchTarget.includes(query);
    return filterOk && searchOk;
  });

  if (!items.length) {
    els.itemsList.innerHTML = `<div class="empty-list">${state.items.length ? "No items match this view." : "Add items to build your auction list."}</div>`;
    return;
  }

  const canDrag = state.filter === "all" && !query;

  els.itemsList.innerHTML = items.map(item => {
    const statusLabel = item.status === "sold" ? "Sold" : item.status === "no-sale" ? "No Sale" : "Ready";
    const soldMeta = item.status === "sold"
      ? `<span>Sold <b>${formatCoins(item.soldPrice)}</b>${item.buyer ? ` · ${escapeHtml(item.buyer)}` : ""}</span>`
      : "";
    return `
      <article class="item-card" data-id="${item.id}" draggable="${canDrag}">
        ${iconMarkup(item)}
        <div class="item-main">
          <div class="item-name-row">
            <span class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
            <span class="status-chip status-${item.status}">${statusLabel}</span>
          </div>
          <div class="item-sub">
            <span>${escapeHtml(getLotTypeLabel(item))}</span>
            <span>Reserve / Start <b>${formatCoins(item.reserve)}</b></span>
            ${item.lotType === "single" && item.quantity > 1 ? `<span>Qty <b>${item.quantity}</b></span>` : ""}
            ${soldMeta}
          </div>
        </div>
        <div class="item-menu">
          <button class="mini-btn text-mini-btn showcase-mini-btn" data-view-lot="${escapeHtml(item.id)}" title="View all lot items">View</button>
          <button class="mini-btn text-mini-btn" data-copy-name="${item.id}" title="Copy item name">Copy</button>
          <button class="mini-btn text-mini-btn" data-repair-lot="${item.id}" title="Repair saved YoWorld image URLs">Fix</button>
          <span class="mini-btn drag-handle" title="${canDrag ? "Drag to reorder" : "Clear search/filter to drag"}">⋮⋮</span>
          <button class="mini-btn" data-move-up="${item.id}" title="Move up">↑</button>
          <button class="mini-btn" data-move-down="${item.id}" title="Move down">↓</button>
          <button class="mini-btn" data-edit="${item.id}" title="Edit">✎</button>
          <button class="mini-btn" data-duplicate="${item.id}" title="Duplicate">⧉</button>
          <button class="mini-btn" data-delete="${item.id}" title="Delete">×</button>
        </div>
      </article>
    `;
  }).join("");

  wireDragAndDrop(canDrag);
  wireImageFallbacks(els.itemsList);
}

function renderHistory() {
  const query = els.historySearchInput.value.trim().toLowerCase();
  const records = state.history
    .filter(item => {
      const filterOk = state.historyFilter === "all" || item.status === state.historyFilter;
      const searchTarget = [item.name, item.buyer, ...(item.bundleItems || []).map(bundleItem => bundleItem.name)]
        .join(" ")
        .toLowerCase();
      return filterOk && (!query || searchTarget.includes(query));
    })
    .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));

  els.historyFilterBar.querySelectorAll("[data-history-filter]").forEach(button => {
    button.classList.toggle("active", button.dataset.historyFilter === state.historyFilter);
  });

  if (!records.length) {
    els.historyList.innerHTML = `<div class="empty-list">${state.history.length ? "No completed lots match this view." : "Completed lots will appear here with their pricing details."}</div>`;
    return;
  }

  els.historyList.innerHTML = records.map(item => {
    const sold = item.status === "sold";
    const difference = Number(item.soldPrice || 0) - Number(item.reserve || 0);
    const differenceMarkup = sold
      ? `<span class="history-value ${difference < 0 ? "under" : difference > 0 ? "over" : ""}">${difference < 0 ? "-" : difference > 0 ? "+" : ""}${formatCoins(Math.abs(difference))}</span>`
      : `<span class="history-value muted">-</span>`;
    const bundleCover = getBundleCoverItem(item);
    const bundleContents = item.lotType === "bundle"
      ? `<div class="history-bundle-list">${item.bundleItems.map(bundleItem => `
          <div class="history-bundle-item">
            ${iconMarkup({ ...bundleItem, lotType: "single", bundleItems: [] }, "history-component-icon")}
            <div class="history-component-copy">
              <strong>${escapeHtml(bundleItem.name)}</strong>
              <span>${bundleItem.sourceItemId ? `YoWorld ID ${escapeHtml(bundleItem.sourceItemId)}` : "No saved YoWorld ID"}${bundleItem.draftId === item.bundleCoverItemId ? " - Bundle cover" : ""}</span>
            </div>
            <button class="mini-btn text-mini-btn" data-copy-bundle-component="${item.id}" data-component-id="${escapeHtml(bundleItem.draftId)}" title="Copy component name">Copy</button>
            <button class="mini-btn text-mini-btn" data-repair-component="${item.id}" data-component-id="${escapeHtml(bundleItem.draftId)}" title="Repair component image">Fix</button>
          </div>
        `).join("")}</div>`
      : "";

    return `
      <article class="history-card">
        <div class="history-card-head">
          ${iconMarkup(item, "history-icon")}
          <div class="history-title-copy">
            <div class="item-name-row">
              <span class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
              <span class="status-chip status-${item.status}">${sold ? "Sold" : "No Sale"}</span>
            </div>
            <span>${formatCompletedAt(item.completedAt)}</span>
            ${item.buyer ? `<span>Buyer: <b>${escapeHtml(item.buyer)}</b></span>` : ""}
          </div>
          <div class="history-actions">
            <button class="mini-btn text-mini-btn showcase-mini-btn" data-view-lot="${escapeHtml(item.id)}" title="View all lot items">View</button>
            <button class="mini-btn text-mini-btn" data-copy-name="${item.id}" title="Copy item name">Copy</button>
            <button class="mini-btn text-mini-btn" data-repair-lot="${item.id}" title="Repair saved YoWorld image URLs">Fix</button>
          </div>
        </div>
        <div class="history-price-grid">
          <div><span>Reserve / Start</span><strong>${formatCoins(item.reserve)}</strong></div>
          <div><span>Sold Price</span><strong>${sold ? formatCoins(item.soldPrice) : "No Sale"}</strong></div>
          <div><span>Difference</span>${differenceMarkup}</div>
        </div>
        <details class="history-details">
          <summary>Lot details</summary>
          <div class="history-detail-grid">
            <span>Type <b>${escapeHtml(getLotTypeLabel(item))}</b></span>
            <span>Quantity <b>${item.lotType === "bundle" ? 1 : item.quantity}</b></span>
            ${item.sourceItemId ? `<span>YoWorld item ID <b>${escapeHtml(item.sourceItemId)}</b></span>` : ""}
            ${bundleCover ? `<span>Bundle cover <b>${escapeHtml(bundleCover.name)}</b></span>` : ""}
          </div>
          ${item.notes ? `<p class="history-notes">${escapeHtml(item.notes)}</p>` : ""}
          ${bundleContents}
        </details>
      </article>
    `;
  }).join("");
}

function wireDragAndDrop(canDrag) {
  if (!canDrag) return;

  const cards = [...els.itemsList.querySelectorAll(".item-card")];

  cards.forEach(card => {
    card.addEventListener("dragstart", () => {
      draggedId = card.dataset.id;
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      draggedId = null;
      cards.forEach(c => c.classList.remove("dragging", "drop-target"));
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (card.dataset.id !== draggedId) card.classList.add("drop-target");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drop-target"));
    card.addEventListener("drop", async (event) => {
      event.preventDefault();
      card.classList.remove("drop-target");
      if (!draggedId || card.dataset.id === draggedId) return;

      const from = state.items.findIndex(i => i.id === draggedId);
      const to = state.items.findIndex(i => i.id === card.dataset.id);
      if (from < 0 || to < 0) return;

      const [moved] = state.items.splice(from, 1);
      state.items.splice(to, 0, moved);
      await saveState();
      render();
    });
  });
}

/* ---------- YoWorld.info item search ---------- */

function buildYwCdnImageUrlFromId(itemId, ext = "png") {
  const id = Number(itemId);
  if (!Number.isFinite(id) || id <= 0) return "";
  const safeExt = ["png", "jpg", "jpeg"].includes(String(ext).toLowerCase()) ? String(ext).toLowerCase() : "png";
  const s = String(Math.trunc(id)).padStart(4, "0");
  const g1 = s.substring(0, 2);
  const g2 = s.substring(2, 4);
  return `https://yw-web.yoworld.com/cdn/items/${g1}/${g2}/${id}/${id}.${safeExt}`;
}

function repairBundleItemImage(bundleItem) {
  if (!bundleItem?.sourceItemId) return false;
  const rebuiltUrl = buildYwCdnImageUrlFromId(bundleItem.sourceItemId);
  if (!rebuiltUrl) return false;
  bundleItem.icon = rebuiltUrl;
  return true;
}

function repairLotImages(item) {
  if (!item) return 0;
  if (item.lotType === "single") {
    if (!item.sourceItemId) return 0;
    const rebuiltUrl = buildYwCdnImageUrlFromId(item.sourceItemId);
    if (!rebuiltUrl) return 0;
    item.icon = rebuiltUrl;
    return 1;
  }

  let repaired = 0;
  (item.bundleItems || []).forEach(bundleItem => {
    if (repairBundleItemImage(bundleItem)) repaired += 1;
  });
  syncBundleCoverIcon(item);
  return repaired;
}

async function repairLotById(id) {
  const item = getLotById(id);
  const repaired = repairLotImages(item);
  if (!repaired) return showToast("No saved YoWorld item ID is available for this lot");
  await saveState();
  render();
  showToast(`Rebuilt ${repaired} image URL${repaired === 1 ? "" : "s"}`);
}

async function repairLotComponent(lotId, componentId) {
  const item = getLotById(lotId);
  const bundleItem = item?.bundleItems?.find(component => component.draftId === componentId);
  if (!repairBundleItemImage(bundleItem)) return showToast("No saved YoWorld item ID is available for this component");
  syncBundleCoverIcon(item);
  await saveState();
  render();
  showToast("Component image URL rebuilt");
}

async function repairAllImages() {
  let repaired = 0;
  state.items.forEach(item => { repaired += repairLotImages(item); });
  state.history.forEach(item => { repaired += repairLotImages(item); });
  state.bundleDraft.forEach(item => { if (repairBundleItemImage(item)) repaired += 1; });

  if (!repaired) return showToast("No saved YoWorld item IDs were found");
  await saveState();
  render();
  showToast(`Rebuilt ${repaired} YoWorld image URL${repaired === 1 ? "" : "s"}`);
}

async function apiSearchPaged(query, page = 1, itemsPerPage = 12) {
  const q = String(query || "").trim();
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const ipp = Math.min(50, Math.max(1, Math.floor(Number(itemsPerPage) || 12)));
  const url = `https://api.yoworld.info/api/items/search?query=${encodeURIComponent(q)}&page=${p}&itemsPerPage=${ipp}&itemCategoryId=-1`;

  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) throw new Error(`YoWorld.info search returned ${response.status}`);

  const json = await response.json();
  const pagination = json?.data?.pagination || {};

  return {
    items: Array.isArray(pagination?.data) ? pagination.data : [],
    page: Number(pagination?.current_page) || p,
    lastPage: Number(pagination?.last_page) || 1,
    total: Number(pagination?.total) || 0,
    perPage: Number(pagination?.per_page) || ipp
  };
}

function setCatalogStatus(message, isError = false) {
  els.catalogStatus.textContent = message;
  els.catalogStatus.classList.toggle("error", isError);
}

function updateCatalogPager() {
  const page = Math.max(1, Number(catalogPager.page) || 1);
  const lastPage = Math.max(1, Number(catalogPager.lastPage) || 1);
  const show = !!catalogPager.query && (lastPage > 1 || catalogPager.loading);

  els.catalogPager.classList.toggle("hidden", !show);
  els.catalogPageLabel.textContent = catalogPager.loading ? "Loading…" : `Page ${page} / ${lastPage}`;
  els.catalogPrev.disabled = catalogPager.loading || page <= 1;
  els.catalogNext.disabled = catalogPager.loading || page >= lastPage;
  els.catalogSearchBtn.disabled = catalogPager.loading;
  els.catalogSearchBtn.textContent = catalogPager.loading ? "Searching…" : "Search";
}

function renderCatalogResults(items) {
  if (!items.length) {
    els.catalogResults.innerHTML = `<div class="catalog-empty">No matching items found.</div>`;
    return;
  }

  els.catalogResults.innerHTML = items.map(item => {
    const img = buildYwCdnImageUrlFromId(item.id);
    const storeText = item.active_in_store ? "In store" : "Not in store";
    const marketPrice = getCatalogPrice(item);
    return `
      <article class="catalog-result" data-catalog-id="${escapeHtml(item.id)}">
        <div class="catalog-result-thumb item-icon">
          <img
            src="${escapeHtml(img)}"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
            data-image-fallback="${escapeHtml(getInitials(item.name || ""))}"
            data-yw-item-id="${escapeHtml(item.id)}">
        </div>
        <div class="catalog-result-info">
          <strong class="catalog-result-name">${escapeHtml(item.name || "(Unnamed item)")}</strong>
          <div class="catalog-result-meta">
            <span>${storeText}</span>
            ${marketPrice ? `<span>Market ${formatPossiblePrice(marketPrice)}</span>` : ""}
            <span>ID ${escapeHtml(item.id)}</span>
          </div>
        </div>
        <div class="catalog-result-actions">
          <button
            type="button"
            class="catalog-copy-btn"
            data-catalog-copy="${escapeHtml(item.name || "")}">
            Copy
          </button>
          <button
            type="button"
            class="catalog-add-btn"
            data-catalog-add="${escapeHtml(item.id)}"
            data-catalog-name="${escapeHtml(item.name || "")}"
            data-catalog-price="${marketPrice || ""}">
            Add Item
          </button>
          <button
            type="button"
            class="catalog-bundle-btn"
            data-catalog-bundle="${escapeHtml(item.id)}"
            data-catalog-name="${escapeHtml(item.name || "")}">
            Add Bundle
          </button>
        </div>
      </article>
    `;
  }).join("");

  wireImageFallbacks(els.catalogResults);
}

async function loadCatalogPage(page) {
  if (catalogPager.loading) return;

  const q = String(catalogPager.query || "").trim();
  if (!q) return;

  catalogPager.loading = true;
  updateCatalogPager();
  setCatalogStatus(`Searching YoWorld.info for “${q}”…`);
  els.catalogResults.innerHTML = "";

  try {
    const result = await apiSearchPaged(q, page, catalogPager.perPage);

    catalogPager.page = result.page;
    catalogPager.lastPage = result.lastPage;
    catalogPager.total = result.total;
    catalogPager.perPage = result.perPage;

    renderCatalogResults(result.items);

    if (result.total) {
      setCatalogStatus(`${result.total.toLocaleString()} result${result.total === 1 ? "" : "s"} for “${q}”. Add a single item or send items into the bundle builder.`);
    } else {
      setCatalogStatus(`No results for “${q}”.`);
    }
  } catch (error) {
    console.error("Auction Helper YoWorld.info search error:", error);
    catalogPager.page = 1;
    catalogPager.lastPage = 1;
    catalogPager.total = 0;
    els.catalogResults.innerHTML = `<div class="catalog-empty">Search could not be loaded.</div>`;
    setCatalogStatus("YoWorld.info search is unavailable right now. Manual Add still works.", true);
  } finally {
    catalogPager.loading = false;
    updateCatalogPager();
  }
}

async function doCatalogSearch() {
  const q = els.catalogSearchInput.value.trim();

  if (!q) {
    catalogPager = { query: "", page: 0, lastPage: 0, perPage: 12, total: 0, loading: false };
    els.catalogResults.innerHTML = "";
    setCatalogStatus("Type an item name or keyword first.", true);
    updateCatalogPager();
    return;
  }

  catalogPager = {
    query: q,
    page: 1,
    lastPage: 1,
    perPage: catalogPager.perPage || 12,
    total: 0,
    loading: false
  };

  await loadCatalogPage(1);
}

function openCatalogItem(itemId, name, marketPrice = 0) {
  const iconUrl = buildYwCdnImageUrlFromId(itemId);
  openItemModal(null, {
    lotType: "single",
    sourceItemId: String(itemId),
    name,
    icon: iconUrl,
    marketPrice
  });
}

async function addItemToBundleDraft(itemId, name) {
  const bundleItem = {
    draftId: uid(),
    sourceItemId: String(itemId),
    name,
    icon: buildYwCdnImageUrlFromId(itemId)
  };
  state.bundleDraft.push(bundleItem);
  await saveState();
  renderBundleDraft();
  showToast("Added to bundle draft");
}

function renderBundleDraft() {
  const items = state.bundleDraft || [];
  const visible = items.length > 0;
  els.bundleDraftSection.classList.toggle("hidden", !visible);

  if (!visible) return;

  els.bundleDraftCount.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  els.bundleDraftList.innerHTML = items.map((item, index) => `
    <div class="bundle-draft-item">
      ${iconMarkup({ ...item, lotType: "single", bundleItems: [] })}
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>Bundle item ${index + 1}</span>
      </div>
      <div class="line-actions">
        <button type="button" class="mini-btn text-mini-btn" data-copy-draft-item="${escapeHtml(item.draftId)}" title="Copy item name">Copy</button>
        <button type="button" class="mini-btn text-mini-btn" data-repair-draft-item="${escapeHtml(item.draftId)}" title="Repair item image">Fix</button>
        <button type="button" class="remove-line-btn" data-remove-draft-item="${escapeHtml(item.draftId)}" title="Remove">X</button>
      </div>
    </div>
  `).join("");
  wireImageFallbacks(els.bundleDraftList);
}

async function removeBundleDraftItem(draftId) {
  state.bundleDraft = state.bundleDraft.filter(item => item.draftId !== draftId);
  await saveState();
  renderBundleDraft();
}

async function clearBundleDraft() {
  state.bundleDraft = [];
  await saveState();
  renderBundleDraft();
}

function openBundleFromDraft() {
  if (!state.bundleDraft.length) {
    showToast("Add at least 2 items to the bundle draft");
    return;
  }
  openItemModal(null, {
    lotType: "bundle",
    bundleItems: cloneBundleItems(state.bundleDraft),
    name: generateBundleName(state.bundleDraft)
  }, { useDraft: true });
}

/* ---------- Item form ---------- */

function updateIconPreview() {
  if (pendingIconData) {
    const pseudoItem = {
      icon: pendingIconData,
      name: els.nameInput.value || "CA",
      lotType: els.lotTypeInput.value,
      bundleItems: editingBundleItems,
      bundleCoverItemId: editingBundleCoverItemId,
      sourceItemId: pendingSourceItemId
    };
    const sourceItemId = getDisplaySourceItemId(pseudoItem);
    els.iconPreview.innerHTML = pseudoItem.icon
      ? `<img src="${escapeHtml(pendingIconData)}" alt="" referrerpolicy="no-referrer" data-image-fallback="${escapeHtml(getInitials(pseudoItem.name))}"${sourceItemId ? ` data-yw-item-id="${escapeHtml(sourceItemId)}"` : ""}>${buildBadgeMarkup(pseudoItem)}`
      : `<span>${escapeHtml(getInitials(pseudoItem.name))}</span>${buildBadgeMarkup(pseudoItem)}`;
  } else {
    const pseudoItem = { icon: "", name: els.nameInput.value || "CA", lotType: els.lotTypeInput.value, bundleItems: editingBundleItems };
    els.iconPreview.innerHTML = `<span>${escapeHtml(getInitials(pseudoItem.name))}</span>${buildBadgeMarkup(pseudoItem)}`;
  }
  wireImageFallbacks(els.iconPreview);
}

function updateIconSourceHint() {
  if (els.lotTypeInput.value === "bundle") {
    const cover = editingBundleItems.find(item => item.draftId === editingBundleCoverItemId);
    els.iconSourceHint.textContent = cover
      ? `Bundle cover: ${cover.name}. Choose Cover beside another component to change it.`
      : "Choose Cover beside a bundle component, or upload a custom icon.";
    return;
  }
  els.iconSourceHint.textContent = pendingSourceItemId
    ? `YoWorld item #${pendingSourceItemId} · icon loaded from the YoWorld CDN.`
    : "Images are resized and saved locally.";
}

function renderBundleModalList() {
  const isBundle = els.lotTypeInput.value === "bundle";
  els.bundleEditor.classList.toggle("hidden", !isBundle);
  els.qtyFieldWrap.classList.toggle("hidden", isBundle);

  if (!isBundle) return;

  els.appendDraftBtn.classList.toggle("hidden", !(state.bundleDraft.length && !bundleModalUsesDraft));

  if (!editingBundleItems.length) {
    els.bundleModalList.innerHTML = `<div class="bundle-editor-empty">No bundle items yet. Use “Add Bundle” in the YoWorld.info search section, then create or edit your bundle lot.</div>`;
    updateIconPreview();
    return;
  }

  if (!editingBundleCoverItemId && !pendingIconData) {
    editingBundleCoverItemId = editingBundleItems[0].draftId;
    pendingIconData = editingBundleItems[0].icon || "";
  }

  els.bundleModalList.innerHTML = editingBundleItems.map((item, index) => `
    <div class="bundle-modal-item ${item.draftId === editingBundleCoverItemId ? "cover-selected" : ""}">
      ${iconMarkup({ ...item, lotType: "single", bundleItems: [] })}
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>Bundle position ${index + 1}</span>
      </div>
      <label class="cover-radio" title="Use this component icon as the bundle cover">
        <input type="radio" name="bundleCover" data-select-bundle-cover="${escapeHtml(item.draftId)}" ${item.draftId === editingBundleCoverItemId ? "checked" : ""}>
        Cover
      </label>
      <div class="line-actions">
        <button type="button" class="mini-btn text-mini-btn" data-copy-modal-item="${escapeHtml(item.draftId)}" title="Copy item name">Copy</button>
        <button type="button" class="mini-btn text-mini-btn" data-repair-modal-item="${escapeHtml(item.draftId)}" title="Repair item image">Fix</button>
        <button type="button" class="remove-line-btn" data-remove-bundle-item="${escapeHtml(item.draftId)}" title="Remove">X</button>
      </div>
    </div>
  `).join("");

  updateIconPreview();
  wireImageFallbacks(els.bundleModalList);
}

function updateLotTypeUI() {
  const isBundle = els.lotTypeInput.value === "bundle";
  els.qtyFieldWrap.classList.toggle("hidden", isBundle);
  renderBundleModalList();
  updateIconSourceHint();
  if (isBundle) {
    els.nameInput.placeholder = "e.g. Bundle (4 items)";
    if (!els.nameInput.value.trim() && editingBundleItems.length) {
      els.nameInput.value = generateBundleName(editingBundleItems);
    }
  } else {
    els.nameInput.placeholder = "e.g. Black Devilish Designer Hair";
  }
}

function updateSoldFields() {
  els.soldFields.classList.toggle("hidden", els.statusInput.value !== "sold");
}

function openItemModal(item = null, catalogItem = null, options = {}) {
  pendingIconData = item?.icon || catalogItem?.icon || "";
  pendingSourceItemId = item?.sourceItemId || catalogItem?.sourceItemId || "";
  editingBundleItems = cloneBundleItems(item?.bundleItems || catalogItem?.bundleItems || []);
  editingBundleCoverItemId = item?.bundleCoverItemId || catalogItem?.bundleCoverItemId || "";
  bundleModalUsesDraft = !!options.useDraft;

  if ((item?.lotType === "bundle" || catalogItem?.lotType === "bundle") && !editingBundleCoverItemId && !pendingIconData && editingBundleItems[0]) {
    editingBundleCoverItemId = editingBundleItems[0].draftId;
    pendingIconData = editingBundleItems[0].icon || "";
  }

  els.editId.value = item?.id || "";
  els.sourceItemId.value = pendingSourceItemId;
  els.itemModalTitle.textContent = item
    ? "Edit Lot"
    : (catalogItem?.lotType === "bundle" ? "Create Bundle Auction" : "Add Lot");

  els.lotTypeInput.value = item?.lotType || catalogItem?.lotType || "single";
  els.nameInput.value = item?.name || catalogItem?.name || "";
  els.reserveInput.value = item ? formatCoins(item.reserve) : "";
  els.qtyInput.value = item?.quantity || 1;
  els.statusInput.value = item?.status || "ready";
  els.notesInput.value = item?.notes || "";
  els.buyerInput.value = item?.buyer || "";
  els.soldPriceInput.value = item?.soldPrice ? formatCoins(item.soldPrice) : "";

  if (catalogItem?.marketPrice) {
    els.reserveInput.placeholder = `YoWorld.info market: ${formatCoins(catalogItem.marketPrice)} — choose your reserve`;
  } else {
    els.reserveInput.placeholder = "e.g. 4m";
  }

  if (els.lotTypeInput.value === "bundle" && !els.nameInput.value.trim()) {
    els.nameInput.value = generateBundleName(editingBundleItems);
  }

  updateIconPreview();
  updateLotTypeUI();
  updateSoldFields();
  updateIconSourceHint();

  els.itemModal.classList.remove("hidden");
  setTimeout(() => {
    if (catalogItem?.lotType === "bundle") els.reserveInput.focus();
    else if (catalogItem?.lotType === "single") els.reserveInput.focus();
    else els.nameInput.focus();
  }, 50);
}

function closeItemModal() {
  els.itemModal.classList.add("hidden");
  els.itemForm.reset();
  els.qtyInput.value = 1;
  els.reserveInput.placeholder = "e.g. 4m";
  pendingIconData = "";
  pendingSourceItemId = "";
  editingBundleItems = [];
  editingBundleCoverItemId = "";
  bundleModalUsesDraft = false;
  updateIconPreview();
}

async function resizeImage(file, maxSize = 256) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/webp", 0.84);
}

function openSaleModal() {
  const item = getCurrentItem();
  if (!item) return;
  saleItemId = item.id;
  els.saleBuyer.value = "";
  els.salePrice.value = "";

  const extra = item.lotType === "bundle"
    ? `Bundle · ${item.bundleItems.length} items`
    : `Qty ${item.quantity}`;

  els.saleItemMini.innerHTML = `
    <strong>${escapeHtml(item.name)}</strong>
    <span>${extra} · Reserve / Starting Bid ${formatCoins(item.reserve)}</span>
  `;
  els.saleReserveHint.textContent = `Reserve: ${formatCoins(item.reserve)}`;
  els.saleReserveHint.className = "reserve-hint";
  els.saleModal.classList.remove("hidden");
  setTimeout(() => els.salePrice.focus(), 50);
}

function closeSaleModal() {
  saleItemId = null;
  els.saleModal.classList.add("hidden");
  els.saleForm.reset();
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 2200);
}

async function moveItem(id, direction) {
  const index = state.items.findIndex(i => i.id === id);
  if (index < 0) return;
  const target = index + direction;
  if (target < 0 || target >= state.items.length) return;
  [state.items[index], state.items[target]] = [state.items[target], state.items[index]];
  await saveState();
  render();
}

async function deleteItem(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Delete "${item.name}" from this auction?`)) return;
  state.items = state.items.filter(i => i.id !== id);
  await saveState();
  render();
  showToast("Lot deleted");
}

async function duplicateItem(id) {
  const index = state.items.findIndex(i => i.id === id);
  if (index < 0) return;
  const source = state.items[index];
  const copy = {
    ...source,
    id: uid(),
    name: `${source.name} (Copy)`,
    bundleItems: cloneBundleItems(source.bundleItems),
    status: "ready",
    buyer: "",
    soldPrice: 0,
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  state.items.splice(index + 1, 0, copy);
  await saveState();
  render();
  showToast("Lot duplicated");
}

function moveCompletedLotToHistory(item) {
  state.items = state.items.filter(activeItem => activeItem.id !== item.id);
  state.history = state.history.filter(historyItem => historyItem.id !== item.id);
  state.history.push(item);
}

async function markNoSale() {
  const item = getCurrentItem();
  if (!item) return;
  item.status = "no-sale";
  item.completedAt = new Date().toISOString();
  moveCompletedLotToHistory(item);
  await saveState();
  render();
  showToast(`${item.name} marked No Sale`);
}

async function skipCurrent() {
  const current = getCurrentItem();
  if (!current) return;

  const from = state.items.findIndex(i => i.id === current.id);
  const [moved] = state.items.splice(from, 1);

  let lastReady = -1;
  state.items.forEach((item, idx) => {
    if (item.status === "ready") lastReady = idx;
  });

  state.items.splice(lastReady + 1, 0, moved);
  await saveState();
  render();
  showToast("Moved to end of ready queue");
}


function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function statusLabel(status) {
  if (status === "sold") return "Sold / Traded";
  if (status === "no-sale") return "No Sale";
  return "Ready";
}

function exportAuctionDataCsv() {
  const headers = [
    "Auction",
    "List",
    "Order",
    "Lot Type",
    "Lot Name",
    "Bundle Item Count",
    "Bundle Contents",
    "Bundle Item IDs",
    "Bundle Item Image URLs",
    "Bundle Cover Component ID",
    "Bundle Cover Source Item ID",
    "Lot Icon URL",
    "Quantity",
    "Reserve / Starting Bid",
    "Status",
    "Buyer",
    "Sold Price",
    "Difference From Reserve",
    "Notes",
    "YoWorld Item ID",
    "Created",
    "Completed"
  ];

  const exportedLots = [
    ...state.items.map((item, index) => ({ item, index, list: "Active" })),
    ...state.history.map((item, index) => ({ item, index, list: "History" }))
  ];

  const rows = exportedLots.map(({ item, index, list }) => {
    const bundleContents = item.lotType === "bundle"
      ? (item.bundleItems || []).map(bundleItem => bundleItem.name).join(" | ")
      : "";
    const bundleItemIds = item.lotType === "bundle"
      ? (item.bundleItems || []).map(bundleItem => bundleItem.sourceItemId || "").join(" | ")
      : "";
    const bundleItemIcons = item.lotType === "bundle"
      ? (item.bundleItems || []).map(bundleItem => bundleItem.icon || "").join(" | ")
      : "";
    const bundleCover = getBundleCoverItem(item);

    const diff = item.status === "sold"
      ? (Number(item.soldPrice || 0) - Number(item.reserve || 0))
      : "";

    return [
      state.auctionTitle,
      list,
      index + 1,
      item.lotType === "bundle" ? "Bundle" : "Single Item",
      item.name,
      item.lotType === "bundle" ? (item.bundleItems || []).length : "",
      bundleContents,
      bundleItemIds,
      bundleItemIcons,
      item.bundleCoverItemId || "",
      bundleCover?.sourceItemId || "",
      item.icon || "",
      item.lotType === "bundle" ? 1 : item.quantity,
      Number(item.reserve || 0),
      statusLabel(item.status),
      item.buyer || "",
      item.status === "sold" ? Number(item.soldPrice || 0) : "",
      diff,
      item.notes || "",
      item.lotType === "single" ? (item.sourceItemId || "") : "",
      item.createdAt || "",
      item.completedAt || ""
    ];
  });

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map(row => row.map(csvCell).join(","))
  ].join("\r\n");

  // Add UTF-8 BOM so Excel opens names/symbols cleanly.
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = (state.auctionTitle || "auction")
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  a.href = url;
  a.download = `${safeTitle || "auction"}_data.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  els.backupMenu.classList.add("hidden");
  showToast(`Exported ${exportedLots.length} auction lot${exportedLots.length === 1 ? "" : "s"}`);
}

function exportBackup() {
  const payload = {
    format: "Auction Helper Backup",
    version: 4,
    exportedAt: new Date().toISOString(),
    state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTitle = (state.auctionTitle || "auction").replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "");
  a.href = url;
  a.download = `${safeTitle || "auction"}_backup.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  els.backupMenu.classList.add("hidden");
  showToast("Backup exported");
}

async function importBackup(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const incoming = parsed?.state || parsed;
  const cleaned = cleanState(incoming);

  const totalLots = cleaned.items.length + cleaned.history.length;
  if (!confirm(`Import "${cleaned.auctionTitle}" with ${totalLots} lot(s)? This replaces the current active list and history.`)) return;

  state = cleaned;
  els.auctionTitle.value = state.auctionTitle;
  els.searchInput.value = "";
  els.historySearchInput.value = "";
  await saveState();
  render();
  els.backupMenu.classList.add("hidden");
  showToast("Backup imported");
}

async function appendDraftToCurrentBundle() {
  if (!state.bundleDraft.length) return;
  editingBundleItems.push(...cloneBundleItems(state.bundleDraft));
  state.bundleDraft = [];
  await saveState();
  renderBundleDraft();
  renderBundleModalList();
  if (!els.nameInput.value.trim()) {
    els.nameInput.value = generateBundleName(editingBundleItems);
  }
  showToast("Bundle draft appended");
}

/* ---------- Events ---------- */

document.addEventListener("click", async (event) => {
  if (event.target.closest("[data-close-lot-items]")) {
    closeLotItemsModal();
    return;
  }

  const viewLotButton = event.target.closest("[data-view-lot]");
  if (viewLotButton) {
    openLotItemsModal(viewLotButton.dataset.viewLot);
    return;
  }

  const viewTab = event.target.closest("[data-view-tab]");
  if (viewTab) {
    state.view = viewTab.dataset.viewTab === "history" ? "history" : "active";
    await saveState();
    render();
    return;
  }

  const historyFilter = event.target.closest("[data-history-filter]");
  if (historyFilter) {
    state.historyFilter = historyFilter.dataset.historyFilter;
    await saveState();
    renderHistory();
    wireImageFallbacks(els.historyList);
    return;
  }

  const catalogCopy = event.target.closest("[data-catalog-copy]");
  if (catalogCopy) {
    await copyText(catalogCopy.dataset.catalogCopy, "Catalog item name copied");
    return;
  }

  const copyNameButton = event.target.closest("[data-copy-name]");
  if (copyNameButton) {
    const item = getLotById(copyNameButton.dataset.copyName);
    if (item) await copyText(item.name, "Item name copied");
    return;
  }

  const copyDraftItem = event.target.closest("[data-copy-draft-item]");
  if (copyDraftItem) {
    const item = state.bundleDraft.find(bundleItem => bundleItem.draftId === copyDraftItem.dataset.copyDraftItem);
    if (item) await copyText(item.name, "Bundle item name copied");
    return;
  }

  const copyModalItem = event.target.closest("[data-copy-modal-item]");
  if (copyModalItem) {
    const item = editingBundleItems.find(bundleItem => bundleItem.draftId === copyModalItem.dataset.copyModalItem);
    if (item) await copyText(item.name, "Bundle item name copied");
    return;
  }

  const copyHistoryComponent = event.target.closest("[data-copy-bundle-component]");
  if (copyHistoryComponent) {
    const lot = getLotById(copyHistoryComponent.dataset.copyBundleComponent);
    const item = lot?.bundleItems?.find(bundleItem => bundleItem.draftId === copyHistoryComponent.dataset.componentId);
    if (item) await copyText(item.name, "Bundle item name copied");
    return;
  }

  const repairLotButton = event.target.closest("[data-repair-lot]");
  if (repairLotButton) {
    await repairLotById(repairLotButton.dataset.repairLot);
    return;
  }

  const repairComponentButton = event.target.closest("[data-repair-component]");
  if (repairComponentButton) {
    await repairLotComponent(repairComponentButton.dataset.repairComponent, repairComponentButton.dataset.componentId);
    return;
  }

  const repairDraftItem = event.target.closest("[data-repair-draft-item]");
  if (repairDraftItem) {
    const item = state.bundleDraft.find(bundleItem => bundleItem.draftId === repairDraftItem.dataset.repairDraftItem);
    if (!repairBundleItemImage(item)) return showToast("No saved YoWorld item ID is available for this component");
    await saveState();
    renderBundleDraft();
    wireImageFallbacks(els.bundleDraftList);
    showToast("Component image URL rebuilt");
    return;
  }

  const repairModalItem = event.target.closest("[data-repair-modal-item]");
  if (repairModalItem) {
    const item = editingBundleItems.find(bundleItem => bundleItem.draftId === repairModalItem.dataset.repairModalItem);
    if (!repairBundleItemImage(item)) return showToast("No saved YoWorld item ID is available for this component");
    if (item.draftId === editingBundleCoverItemId) pendingIconData = item.icon;
    renderBundleModalList();
    updateIconSourceHint();
    showToast("Component image URL rebuilt");
    return;
  }

  const bundleCoverInput = event.target.closest("[data-select-bundle-cover]");
  if (bundleCoverInput) {
    const item = editingBundleItems.find(bundleItem => bundleItem.draftId === bundleCoverInput.dataset.selectBundleCover);
    if (item) {
      editingBundleCoverItemId = item.draftId;
      pendingIconData = item.icon || "";
      renderBundleModalList();
      updateIconSourceHint();
      showToast("Bundle cover selected");
    }
    return;
  }

  const catalogAdd = event.target.closest("[data-catalog-add]");
  if (catalogAdd) {
    openCatalogItem(
      catalogAdd.dataset.catalogAdd,
      catalogAdd.dataset.catalogName || "",
      Number(catalogAdd.dataset.catalogPrice) || 0
    );
    return;
  }

  const catalogBundle = event.target.closest("[data-catalog-bundle]");
  if (catalogBundle) {
    await addItemToBundleDraft(catalogBundle.dataset.catalogBundle, catalogBundle.dataset.catalogName || "");
    return;
  }

  const removeDraftItemBtn = event.target.closest("[data-remove-draft-item]");
  if (removeDraftItemBtn) {
    await removeBundleDraftItem(removeDraftItemBtn.dataset.removeDraftItem);
    return;
  }

  const removeBundleItemBtn = event.target.closest("[data-remove-bundle-item]");
  if (removeBundleItemBtn) {
    const removedId = removeBundleItemBtn.dataset.removeBundleItem;
    editingBundleItems = editingBundleItems.filter(item => item.draftId !== removedId);
    if (editingBundleCoverItemId === removedId) {
      editingBundleCoverItemId = editingBundleItems[0]?.draftId || "";
      pendingIconData = editingBundleItems[0]?.icon || "";
    }
    if (!els.nameInput.value.trim() || /^Bundle\b/i.test(els.nameInput.value.trim())) {
      els.nameInput.value = generateBundleName(editingBundleItems);
    }
    renderBundleModalList();
    return;
  }

  const addBtn = event.target.closest("[data-open-add]");
  if (addBtn) {
    openItemModal();
    return;
  }

  if (event.target.closest("[data-close-modal]")) {
    closeItemModal();
    return;
  }

  if (event.target.closest("[data-close-sale]")) {
    closeSaleModal();
    return;
  }

  const editBtn = event.target.closest("[data-edit]");
  if (editBtn) {
    const item = state.items.find(i => i.id === editBtn.dataset.edit);
    if (item) openItemModal(item);
    return;
  }

  const delBtn = event.target.closest("[data-delete]");
  if (delBtn) {
    await deleteItem(delBtn.dataset.delete);
    return;
  }

  const dupBtn = event.target.closest("[data-duplicate]");
  if (dupBtn) {
    await duplicateItem(dupBtn.dataset.duplicate);
    return;
  }

  const upBtn = event.target.closest("[data-move-up]");
  if (upBtn) {
    await moveItem(upBtn.dataset.moveUp, -1);
    return;
  }

  const downBtn = event.target.closest("[data-move-down]");
  if (downBtn) {
    await moveItem(downBtn.dataset.moveDown, 1);
    return;
  }

  const filterBtn = event.target.closest("[data-filter]");
  if (filterBtn) {
    state.filter = filterBtn.dataset.filter;
    await saveState();
    render();
    return;
  }

  if (!event.target.closest("#backupMenu") && !event.target.closest("#backupBtn")) {
    els.backupMenu.classList.add("hidden");
  }
});

els.catalogSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await doCatalogSearch();
});

els.catalogPrev.addEventListener("click", () => {
  if (catalogPager.page > 1) void loadCatalogPage(catalogPager.page - 1);
});

els.catalogNext.addEventListener("click", () => {
  if (catalogPager.page < catalogPager.lastPage) void loadCatalogPage(catalogPager.page + 1);
});

els.clearBundleDraftBtn.addEventListener("click", async () => {
  await clearBundleDraft();
});

els.copyBundleDraftBtn.addEventListener("click", async () => {
  await copyText(state.bundleDraft.map(item => item.name).join("\n"), "Bundle draft names copied");
});

els.copyBundleItemsBtn.addEventListener("click", async () => {
  await copyText(editingBundleItems.map(item => item.name).join("\n"), "Bundle item names copied");
});

els.createBundleFromDraftBtn.addEventListener("click", () => {
  if (state.bundleDraft.length < 2) {
    showToast("Bundles need at least 2 items");
    return;
  }
  openBundleFromDraft();
});

els.lotTypeInput.addEventListener("change", () => {
  if (els.lotTypeInput.value === "bundle" && !editingBundleItems.length && state.bundleDraft.length && !bundleModalUsesDraft) {
    // user switched an empty form to bundle while a draft exists; leave it available via append button
  }
  updateLotTypeUI();
  updateIconSourceHint();
  if (els.lotTypeInput.value === "bundle" && (!els.nameInput.value.trim() || /^Bundle\b/i.test(els.nameInput.value.trim()))) {
    els.nameInput.value = generateBundleName(editingBundleItems);
  }
  updateIconPreview();
});

els.appendDraftBtn.addEventListener("click", async () => {
  await appendDraftToCurrentBundle();
});

els.clearBundleItemsBtn.addEventListener("click", () => {
  editingBundleItems = [];
  editingBundleCoverItemId = "";
  pendingIconData = "";
  if (/^Bundle\b/i.test(els.nameInput.value.trim())) {
    els.nameInput.value = generateBundleName(editingBundleItems);
  }
  renderBundleModalList();
});

els.itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const lotType = els.lotTypeInput.value === "bundle" ? "bundle" : "single";
  let name = els.nameInput.value.trim();
  const reserve = parseCoins(els.reserveInput.value);
  const quantity = Math.max(1, Number.parseInt(els.qtyInput.value, 10) || 1);
  const status = els.statusInput.value;
  const soldPrice = parseCoins(els.soldPriceInput.value);

  if (lotType === "bundle") {
    if (editingBundleItems.length < 2) return showToast("Bundle auctions need at least 2 items");
    if (!name) name = generateBundleName(editingBundleItems);
  } else if (!name) {
    return showToast("Lot name is required");
  }

  if (!Number.isFinite(reserve) || reserve < 0) return showToast("Enter a valid reserve / starting bid");
  if (status === "sold" && (!Number.isFinite(soldPrice) || soldPrice < 0)) return showToast("Enter a valid sold price");

  const existing = state.items.find(i => i.id === els.editId.value);
  const selectedBundleCover = editingBundleItems.find(bundleItem => bundleItem.draftId === editingBundleCoverItemId);

  const item = {
    id: existing?.id || uid(),
    lotType,
    name,
    reserve,
    quantity: lotType === "bundle" ? 1 : quantity,
    notes: els.notesInput.value.trim(),
    icon: lotType === "bundle"
      ? (editingBundleCoverItemId ? (selectedBundleCover?.icon || "") : (pendingIconData || editingBundleItems[0]?.icon || ""))
      : pendingIconData,
    sourceItemId: lotType === "bundle" ? "" : pendingSourceItemId,
    bundleItems: lotType === "bundle" ? cloneBundleItems(editingBundleItems) : [],
    bundleCoverItemId: lotType === "bundle" ? editingBundleCoverItemId : "",
    status,
    buyer: status === "sold" ? els.buyerInput.value.trim() : "",
    soldPrice: status === "sold" ? soldPrice : 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
    completedAt: status === "ready" ? null : (existing?.completedAt || new Date().toISOString())
  };

  if (existing) {
    Object.assign(existing, item);
    if (status !== "ready") moveCompletedLotToHistory(existing);
  } else if (status === "ready") {
    state.items.push(item);
  } else {
    state.history.push(item);
  }

  if (lotType === "bundle" && bundleModalUsesDraft) {
    state.bundleDraft = [];
  }

  await saveState();
  closeItemModal();
  render();
  showToast(existing ? "Lot updated" : "Lot added to auction");
});

els.statusInput.addEventListener("change", updateSoldFields);

els.iconInput.addEventListener("change", async () => {
  const file = els.iconInput.files?.[0];
  if (!file) return;
  try {
    pendingIconData = await resizeImage(file);
    if (els.lotTypeInput.value === "bundle") editingBundleCoverItemId = "";
    else pendingSourceItemId = "";
    updateIconPreview();
    updateIconSourceHint();
  } catch {
    showToast("Could not read that image");
  }
});

els.removeIconBtn.addEventListener("click", () => {
  pendingIconData = "";
  if (els.lotTypeInput.value !== "bundle") pendingSourceItemId = "";
  els.iconInput.value = "";
  updateIconPreview();
  updateIconSourceHint();
});

els.nameInput.addEventListener("input", updateIconPreview);

els.soldBtn.addEventListener("click", openSaleModal);
els.noSaleBtn.addEventListener("click", markNoSale);
els.skipBtn.addEventListener("click", skipCurrent);
els.viewCurrentItemsBtn.addEventListener("click", () => {
  const item = getCurrentItem();
  if (item) openLotItemsModal(item.id);
});
els.copyCurrentNameBtn.addEventListener("click", async () => {
  const item = getCurrentItem();
  if (item) await copyText(item.name, "Item name copied");
});

els.copyShowcaseNamesBtn.addEventListener("click", async () => {
  const lot = getLotById(showcaseLotId);
  if (!lot) return;
  const names = getLotShowcaseItems(lot).map(item => item.name).join("\n");
  await copyText(names, "All lot item names copied");
});

els.repairAllImagesBtn.addEventListener("click", repairAllImages);

els.salePrice.addEventListener("input", () => {
  const item = state.items.find(i => i.id === saleItemId);
  if (!item) return;
  const value = parseCoins(els.salePrice.value);
  els.saleReserveHint.className = "reserve-hint";
  if (!Number.isFinite(value)) {
    els.saleReserveHint.textContent = `Reserve: ${formatCoins(item.reserve)}`;
    return;
  }
  const diff = value - item.reserve;
  if (diff < 0) {
    els.saleReserveHint.textContent = `${formatCoins(Math.abs(diff))} below reserve`;
    els.saleReserveHint.classList.add("under");
  } else if (diff > 0) {
    els.saleReserveHint.textContent = `${formatCoins(diff)} above reserve`;
    els.saleReserveHint.classList.add("over");
  } else {
    els.saleReserveHint.textContent = "Exactly at reserve";
  }
});

els.saleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const item = state.items.find(i => i.id === saleItemId);
  if (!item) return closeSaleModal();

  const soldPrice = parseCoins(els.salePrice.value);
  if (!Number.isFinite(soldPrice) || soldPrice < 0) return showToast("Enter a valid final sale price");

  item.status = "sold";
  item.buyer = els.saleBuyer.value.trim();
  item.soldPrice = soldPrice;
  item.completedAt = new Date().toISOString();
  moveCompletedLotToHistory(item);

  await saveState();
  closeSaleModal();
  render();
  showToast(`Trade complete · ${formatCoins(soldPrice)}`);
});

els.searchInput.addEventListener("input", renderItems);
els.historySearchInput.addEventListener("input", () => {
  renderHistory();
  wireImageFallbacks(els.historyList);
});

els.auctionTitle.addEventListener("change", async () => {
  state.auctionTitle = els.auctionTitle.value.trim() || DEFAULT_STATE.auctionTitle;
  els.auctionTitle.value = state.auctionTitle;
  await saveState();
});

els.backupBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  els.backupMenu.classList.toggle("hidden");
});

els.exportDataBtn.addEventListener("click", exportAuctionDataCsv);

els.exportBtn.addEventListener("click", exportBackup);

els.importInput.addEventListener("change", async () => {
  const file = els.importInput.files?.[0];
  if (!file) return;
  try {
    await importBackup(file);
  } catch (error) {
    console.error(error);
    showToast("That backup file could not be imported");
  } finally {
    els.importInput.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeItemModal();
    closeSaleModal();
    closeLotItemsModal();
    els.backupMenu.classList.add("hidden");
  }
});

loadState();
