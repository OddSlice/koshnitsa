/**
 * Server-side helper for the Price Barometer API.
 * https://prices.alexandergekov.com/docs
 *
 * Provides semantic product search across Bulgarian supermarkets with rich
 * data: pricing in EUR, discount %, images, brochure links, and more.
 *
 * Rate limit: 50 requests/day — aggressive in-memory caching is critical.
 */

const API_BASE = "https://prices.alexandergekov.com/api/v1";

function getApiKey(): string {
  const key = process.env.PRICE_BAROMETER_API_KEY;
  if (!key) throw new Error("PRICE_BAROMETER_API_KEY is not set");
  return key;
}

// --- Types matching the API response ---

export interface PBSupermarket {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
}

export interface PBBrochure {
  id: number;
  code: string;
  valid_from: string | null;
  valid_until: string | null;
}

export interface PBProduct {
  id: number;
  name: string;
  description: string | null;
  price_eur: number | null;
  old_price_eur: number | null;
  discount: string | null;
  quantity: string | null;
  category: string | null;
  image_url: string | null;
  brochure: PBBrochure;
  supermarket: PBSupermarket;
}

interface PBPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface PBProductsResponse {
  data: PBProduct[];
  meta: PBPaginationMeta;
}

interface PBSupermarketsResponse {
  data: PBSupermarket[];
  meta: { total: number };
}

// --- In-memory cache ---

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<PBProduct[]>>();
const SEARCH_CACHE_TTL = 60 * 60 * 1000; // 1 hour

let supermarketsCache: CacheEntry<PBSupermarket[]> | null = null;

function normaliseCacheKey(query: string): string {
  return query.toLowerCase().trim();
}

// --- API fetch helper ---

async function apiFetch<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
    },
    // No Next.js cache — we manage our own in-memory cache
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Price Barometer API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// --- Public functions ---

/**
 * Search for products by name (semantic search).
 * Results are cached in-memory for 1 hour.
 */
export async function searchProducts(
  query: string,
  options?: {
    limit?: number;
    hasDiscount?: boolean;
    onlyValid?: boolean;
  }
): Promise<PBProduct[]> {
  const key = normaliseCacheKey(query);
  const cached = searchCache.get(key);

  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    return cached.data;
  }

  const params: Record<string, string> = {
    search: query,
    limit: String(options?.limit ?? 20),
    only_valid: String(options?.onlyValid ?? true),
  };

  if (options?.hasDiscount) {
    params.has_discount = "true";
  }

  const response = await apiFetch<PBProductsResponse>("/products", params);

  // Cache the results
  searchCache.set(key, { data: response.data, timestamp: Date.now() });

  return response.data;
}

/**
 * Fetch all supermarkets (cached permanently after first fetch).
 */
export async function getSupermarkets(): Promise<PBSupermarket[]> {
  if (supermarketsCache) {
    return supermarketsCache.data;
  }

  const response = await apiFetch<PBSupermarketsResponse>("/supermarkets");
  supermarketsCache = { data: response.data, timestamp: Date.now() };
  return response.data;
}

/**
 * Search for a product and group results by supermarket.
 * Returns the best deal (lowest price) first, with all alternatives.
 */
export async function searchWithGrouping(
  query: string
): Promise<{
  bestDeal: PBProduct | null;
  allResults: PBProduct[];
  query: string;
}> {
  const products = await searchProducts(query);

  if (products.length === 0) {
    return { bestDeal: null, allResults: [], query };
  }

  // Sort by price (cheapest first), filtering out nulls
  const withPrice = products.filter((p) => p.price_eur != null);
  withPrice.sort((a, b) => (a.price_eur ?? 999) - (b.price_eur ?? 999));

  return {
    bestDeal: withPrice[0] ?? products[0],
    allResults: products,
    query,
  };
}

/**
 * Batch search for multiple item names (e.g. from a shopping list).
 * Uses cache to minimise API calls. Returns a map of itemName → products.
 */
export async function batchSearch(
  itemNames: string[]
): Promise<Map<string, PBProduct[]>> {
  const results = new Map<string, PBProduct[]>();

  // Deduplicate queries
  const unique = [...new Set(itemNames.map((n) => n.trim()))];

  for (const name of unique) {
    try {
      const products = await searchProducts(name, { limit: 5 });
      results.set(name, products);
    } catch (err) {
      console.error(`Search failed for "${name}":`, err);
      results.set(name, []);
    }
  }

  return results;
}

/**
 * Get the direct product URL on Price Barometer website.
 */
export function getProductUrl(productId: number): string {
  return `https://prices.alexandergekov.com/products/${productId}`;
}

/**
 * Get a human-readable discount percentage from the API's discount string.
 * The API returns strings like "-56%" or null.
 */
export function parseDiscount(discount: string | null): number | null {
  if (!discount) return null;
  const match = discount.match(/-?(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
