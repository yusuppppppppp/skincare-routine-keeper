import './styles.css';
import { isRoutineSlot, type RoutineSlot, type SkincareProduct } from './types';
import { loadProducts, saveProducts } from './utils/storage';

/* ---------------------------------- state --------------------------------- */

let products: SkincareProduct[] = loadProducts();
let pendingDeleteId: string | null = null;
let pendingDeleteTimer: number | undefined;
let toastTimer: number | undefined;

/* ------------------------------- dom helpers ------------------------------ */

function qs<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

const els = {
  form: qs<HTMLFormElement>('#product-form'),
  submitBtn: qs<HTMLButtonElement>('#submit-btn'),
  cancelEditBtn: qs<HTMLButtonElement>('#cancel-edit-btn'),
  searchInput: qs<HTMLInputElement>('#search-input'),
  seedRow: qs<HTMLElement>('#seed-row'),
  seedBtn: qs<HTMLButtonElement>('#seed-btn'),
  morningList: qs<HTMLUListElement>('#morning-list'),
  eveningList: qs<HTMLUListElement>('#evening-list'),
  pausedList: qs<HTMLUListElement>('#paused-list'),
  pausedSection: qs<HTMLElement>('#paused-section'),
  morningCount: qs<HTMLElement>('#morning-count'),
  eveningCount: qs<HTMLElement>('#evening-count'),
  pausedCount: qs<HTMLElement>('#paused-count'),
  summary: qs<HTMLElement>('#shelf-summary'),
  toast: qs<HTMLElement>('#toast'),
};

/* ---------------------------------- state --------------------------------- */

let editingId: string | null = null;
let searchQuery = '';

/* --------------------------------- utilities ------------------------------ */

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function slotLabel(slot: RoutineSlot): string {
  if (slot === 'morning') return 'AM';
  if (slot === 'evening') return 'PM';
  return 'AM · PM';
}

function showToast(message: string): void {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => els.toast.classList.remove('is-visible'), 2600);
}

function persist(): boolean {
  const ok = saveProducts(products);
  if (!ok) showToast('Could not save — your browser storage may be full.');
  return ok;
}

function cancelPendingDelete(): void {
  if (pendingDeleteId === null) return;
  pendingDeleteId = null;
  window.clearTimeout(pendingDeleteTimer);
}

/* --------------------------------- rendering ------------------------------ */

function createTag(text: string, variant: string): HTMLLIElement {
  const li = document.createElement('li');
  li.className = `tag tag-${variant}`;
  li.textContent = text;
  return li;
}

function createCard(product: SkincareProduct): HTMLLIElement {
  const li = document.createElement('li');
  li.className = product.isActive ? 'product-card' : 'product-card is-paused';
  if (editingId === product.id) li.classList.add('is-editing');
  li.dataset.id = product.id;

  const info = document.createElement('div');
  info.className = 'product-info';

  const name = document.createElement('h3');
  name.className = 'product-name';
  name.textContent = product.name;
  info.appendChild(name);

  const brand = document.createElement('p');
  brand.className = 'product-brand';
  brand.textContent = product.brand;
  info.appendChild(brand);

  const tags = document.createElement('ul');
  tags.className = 'tag-list';
  tags.appendChild(createTag(product.concern, 'concern'));
  tags.appendChild(createTag(slotLabel(product.routineSlot), 'slot'));
  info.appendChild(tags);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn btn-small btn-toggle';
  editBtn.dataset.action = 'edit';
  editBtn.textContent = 'Edit';
  editBtn.setAttribute('aria-label', `Edit ${product.name}`);

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'btn btn-small btn-toggle';
  toggleBtn.dataset.action = 'toggle';
  toggleBtn.textContent = product.isActive ? 'Pause' : 'Resume';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-small btn-danger';
  deleteBtn.dataset.action = 'delete';
  if (pendingDeleteId === product.id) {
    deleteBtn.classList.add('is-confirming');
    deleteBtn.textContent = 'Tap again to delete';
    deleteBtn.setAttribute('aria-label', `Confirm deleting ${product.name}`);
  } else {
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete ${product.name}`);
  }

  actions.append(editBtn, toggleBtn, deleteBtn);
  li.append(info, actions);
  return li;
}

function createEmptyItem(message: string): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'empty-state';
  li.textContent = message;
  return li;
}

function renderList(list: HTMLUListElement, items: SkincareProduct[], emptyMessage: string): void {
  list.replaceChildren();
  if (items.length === 0) {
    list.appendChild(createEmptyItem(emptyMessage));
    return;
  }
  for (const product of items) list.appendChild(createCard(product));
}

function renderSummary(): void {
  const active = products.filter((p) => p.isActive).length;
  const paused = products.length - active;
  if (products.length === 0) {
    els.summary.textContent = 'Your shelf is empty — add your first product below.';
    return;
  }
  const parts = [`${active} active`, `${paused} paused`];
  els.summary.textContent = parts.filter((_, i) => (i === 1 ? paused > 0 : true)).join(' · ');
}

const SLOT_KEYWORDS: Record<RoutineSlot, string> = {
  morning: 'morning am pagi',
  evening: 'evening pm night malam',
  both: 'both am pm keduanya',
};

function matchesSearch(product: SkincareProduct): boolean {
  if (!searchQuery) return true;
  const haystack = `${product.name} ${product.brand} ${product.concern} ${SLOT_KEYWORDS[product.routineSlot]}`.toLowerCase();
  return haystack.includes(searchQuery);
}

function render(): void {
  const inShelf = (slot: RoutineSlot) =>
    products.filter(
      (p) => p.isActive && (p.routineSlot === slot || p.routineSlot === 'both') && matchesSearch(p),
    );
  const paused = products.filter((p) => !p.isActive && matchesSearch(p));
  const searching = searchQuery.length > 0;

  const morningEmpty = searching
    ? 'No morning products match your search.'
    : 'Nothing here yet — your AM essentials go on this shelf.';
  const eveningEmpty = searching
    ? 'No evening products match your search.'
    : 'Nothing here yet — your PM essentials go on this shelf.';
  const pausedEmpty = searching ? 'No paused products match your search.' : 'No products on pause.';

  renderList(els.morningList, inShelf('morning'), morningEmpty);
  renderList(els.eveningList, inShelf('evening'), eveningEmpty);
  renderList(els.pausedList, paused, pausedEmpty);

  els.morningCount.textContent = String(inShelf('morning').length);
  els.eveningCount.textContent = String(inShelf('evening').length);
  els.pausedCount.textContent = String(paused.length);
  els.pausedSection.hidden = paused.length === 0;
  els.seedRow.hidden = products.length > 0;

  renderSummary();
}

/* --------------------------------- actions -------------------------------- */

function handleSave(event: SubmitEvent): void {
  event.preventDefault();
  const data = new FormData(els.form);

  const name = String(data.get('name') ?? '').trim();
  const brand = String(data.get('brand') ?? '').trim();
  const concernRaw = String(data.get('concern') ?? '').trim();
  const slotValue = data.get('slot');

  if (!name || !brand || !concernRaw || !isRoutineSlot(slotValue)) {
    showToast('Please fill in every field before saving.');
    return;
  }

  const concern = concernRaw.charAt(0).toUpperCase() + concernRaw.slice(1);

  if (editingId !== null) {
    const product = products.find((p) => p.id === editingId);
    if (product) {
      Object.assign(product, { name, brand, concern, routineSlot: slotValue });
      if (!persist()) return;
      cancelEdit(false);
      render();
      showToast(`${name} updated.`);
      return;
    }
    cancelEdit(false);
  }

  products.unshift({ id: createId(), name, brand, concern, routineSlot: slotValue, isActive: true });
  if (!persist()) return;

  cancelPendingDelete();
  render();
  els.form.reset();
  qs<HTMLInputElement>('#product-name').focus();
  showToast(`${name} added to your shelf.`);
}

function startEdit(id: string): void {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  editingId = id;
  cancelPendingDelete();

  (els.form.elements.namedItem('name') as HTMLInputElement).value = product.name;
  (els.form.elements.namedItem('brand') as HTMLInputElement).value = product.brand;
  (els.form.elements.namedItem('concern') as HTMLInputElement).value = product.concern;
  (els.form.elements.namedItem('slot') as HTMLInputElement).value = product.routineSlot;

  els.submitBtn.textContent = 'Save changes';
  els.cancelEditBtn.hidden = false;
  els.form.classList.add('is-editing');

  els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  qs<HTMLInputElement>('#product-name').focus();
  render();
}

function cancelEdit(announce = true): void {
  if (editingId === null) return;
  editingId = null;
  els.form.reset();
  els.submitBtn.textContent = 'Add to shelf';
  els.cancelEditBtn.hidden = true;
  els.form.classList.remove('is-editing');
  if (announce) {
    render();
    showToast('Edit cancelled.');
  }
}

function seedShelf(): void {
  const samples: Array<Omit<SkincareProduct, 'id'>> = [
    { name: 'Hydrating Serum', brand: 'Glow Lab', concern: 'Hydration', routineSlot: 'both', isActive: true },
    { name: 'Solar Defense SPF 50', brand: 'Sunshield', concern: 'SPF', routineSlot: 'morning', isActive: true },
    { name: 'Ceramide Repair Cream', brand: 'Barrier Co', concern: 'Hydration', routineSlot: 'both', isActive: true },
    { name: 'Retinol Night Oil', brand: 'Luna Labs', concern: 'Anti-aging', routineSlot: 'evening', isActive: true },
    { name: 'Clarifying Toner', brand: 'Pure Root', concern: 'Acne', routineSlot: 'evening', isActive: false },
  ];
  products.unshift(...samples.map((s) => ({ ...s, id: createId() })));
  if (!persist()) return;
  render();
  showToast('Sample shelf loaded — make it yours!');
}

function handleToggle(id: string): void {
  const product = products.find((p) => p.id === id);
  if (!product) return;
  product.isActive = !product.isActive;
  persist();
  cancelPendingDelete();
  render();
  showToast(product.isActive ? `${product.name} is back on your routine.` : `${product.name} paused.`);
}

function handleDelete(id: string): void {
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return;

  if (pendingDeleteId !== id) {
    cancelPendingDelete();
    pendingDeleteId = id;
    render();
    pendingDeleteTimer = window.setTimeout(() => {
      pendingDeleteId = null;
      render();
    }, 4000);
    return;
  }

  const [removed] = products.splice(index, 1);
  pendingDeleteId = null;
  window.clearTimeout(pendingDeleteTimer);
  if (editingId === removed.id) cancelEdit(false);
  persist();
  render();
  showToast(`${removed.name} removed from your shelf.`);
}

/* ------------------------------ event wiring ------------------------------ */

els.form.addEventListener('submit', handleSave);
els.cancelEditBtn.addEventListener('click', () => cancelEdit());
els.seedBtn.addEventListener('click', seedShelf);

els.searchInput.addEventListener('input', () => {
  searchQuery = els.searchInput.value.trim().toLowerCase();
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (pendingDeleteId !== null) {
      cancelPendingDelete();
      render();
    } else if (editingId !== null) {
      cancelEdit();
    }
    return;
  }

  const inField =
    event.target instanceof HTMLElement &&
    (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA');
  if (event.key === '/' && !inField) {
    event.preventDefault();
    els.searchInput.focus();
  }
});

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest<HTMLButtonElement>('button[data-action]');
  if (!button) return;
  const card = button.closest<HTMLElement>('.product-card');
  if (!card?.dataset.id) return;

  if (button.dataset.action === 'toggle') handleToggle(card.dataset.id);
  else if (button.dataset.action === 'delete') handleDelete(card.dataset.id);
  else if (button.dataset.action === 'edit') startEdit(card.dataset.id);
});

render();
