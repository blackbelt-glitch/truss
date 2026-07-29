import AsyncStorage from '@react-native-async-storage/async-storage';
import { Material, MaterialCalculation, calculateMaterial } from './materials';

const STORAGE_KEY = '@truss_default_prices';

/**
 * The user's own price for a material, keyed by material id.
 * These override the catalog price everywhere a material is added, so a
 * contractor enters their supplier's price once instead of per project.
 */
export type DefaultPrices = { [materialId: string]: number };

let cache: DefaultPrices | null = null;

/** Load saved prices. Cached, so screens can read synchronously after warm-up. */
export async function loadDefaultPrices(): Promise<DefaultPrices> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load default prices:', e);
    cache = {};
  }
  return cache!;
}

/** Prices already loaded this session, or an empty map before the first load. */
export function getCachedDefaultPrices(): DefaultPrices {
  return cache ?? {};
}

/** The user's saved price for a material, if they've set one. */
export function getDefaultPrice(materialId: string): number | undefined {
  return cache?.[materialId];
}

/** Save a price as the user's default. Non-finite or negative values are ignored. */
export async function setDefaultPrice(materialId: string, price: number): Promise<DefaultPrices> {
  if (!isFinite(price) || price < 0) return await loadDefaultPrices();
  const prices = { ...(await loadDefaultPrices()), [materialId]: price };
  return await persist(prices);
}

/** Drop a saved default, reverting the material to its catalog price. */
export async function clearDefaultPrice(materialId: string): Promise<DefaultPrices> {
  const prices = { ...(await loadDefaultPrices()) };
  delete prices[materialId];
  return await persist(prices);
}

/**
 * Build a calculation seeded with the user's saved price for this material.
 * The resolved price is stored on the line item, so editing a default later
 * never silently rewrites estimates that were already quoted.
 */
export function calculateWithDefaultPrice(
  material: Material,
  quantity: number,
  wastePercent?: number
): MaterialCalculation {
  return calculateMaterial(material, quantity, wastePercent, getDefaultPrice(material.id));
}

async function persist(prices: DefaultPrices): Promise<DefaultPrices> {
  cache = prices;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prices));
  } catch (e) {
    console.error('Failed to save default prices:', e);
  }
  return prices;
}
