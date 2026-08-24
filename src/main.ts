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

  actions.append(toggleBtn, deleteBtn);
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

function render(): void {
  const inShelf = (slot: RoutineSlot) =>
    products.filter((p) => p.isActive && (p.routineSlot === slot || p.routineSlot === 'both'));
  const paused = products.filter((p) => !p.isActive);

  renderList(els.morningList, inShelf('morning'), 'Nothing here yet — your AM essentials go on this shelf.');
  renderList(els.eveningList, inShelf('evening'), 'Nothing here yet — your PM essentials go on this shelf.');
  renderList(els.pausedList, paused, 'No products on pause.');

  els.morningCount.textContent = String(inShelf('morning').length);
  els.eveningCount.textContent = String(inShelf('evening').length);
  els.pausedCount.textContent = String(paused.length);
  els.pausedSection.hidden = paused.length === 0;

  renderSummary();
}

/* --------------------------------- actions -------------------------------- */

function handleAdd(event: SubmitEvent): void {
  event.preventDefault();
  const data = new FormData(els.form);

  const name = String(data.get('name') ?? '').trim();
  const brand = String(data.get('brand') ?? '').trim();
  const concernRaw = String(data.get('concern') ?? '').trim();
  const slotValue = data.get('slot');

  if (!name || !brand || !concernRaw || !isRoutineSlot(slotValue)) {
    showToast('Please fill in every field before adding.');
    return;
  }

  const concern = concernRaw.charAt(0).toUpperCase() + concernRaw.slice(1);

  products.unshift({ id: createId(), name, brand, concern, routineSlot: slotValue, isActive: true });
  if (!persist()) return;

  cancelPendingDelete();
  render();
  els.form.reset();
  qs<HTMLInputElement>('#product-name').focus();
  showToast(`${name} added to your shelf.`);
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
  persist();
  render();
  showToast(`${removed.name} removed from your shelf.`);
}

/* ------------------------------ event wiring ------------------------------ */

els.form.addEventListener('submit', handleAdd);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && pendingDeleteId !== null) {
    cancelPendingDelete();
    render();
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
});

render();
