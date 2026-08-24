import { isSkincareProduct, type SkincareProduct } from '../types';

const STORAGE_KEY = 'skincare-routine-keeper:v1';

export function loadProducts(): SkincareProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSkincareProduct).map((p) => ({ ...p, name: p.name.trim(), brand: p.brand.trim(), concern: p.concern.trim() }));
  } catch (error) {
    console.error('Could not read saved products:', error);
    return [];
  }
}

export function saveProducts(products: SkincareProduct[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return true;
  } catch (error) {
    console.error('Could not save products:', error);
    return false;
  }
}
