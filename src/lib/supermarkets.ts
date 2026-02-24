/**
 * Server-side helper for the Sofia Supermarkets API.
 * Fetches and caches promotional products from Billa, Kaufland, Lidl, etc.
 *
 * Public API — no key required.
 * Cache TTL: 6 hours.
 */

const API_BASE =
  "https://sofia-supermarkets-api-proxy.stefan-bratanov.workers.dev";

// --- Types ---

export interface PromoProduct {
  name: string;
  quantity: string;
  price: number;
  oldPrice: number;
  category: string;
  picUrl: string;
  validFrom: string;
  validUntil: string;
}

export interface SupermarketEntry {
  supermarket: string;
  updatedAt: string;
  products: PromoProduct[];
}

/** Flattened product with store name attached */
export interface FlatPromoProduct extends PromoProduct {
  store: string;
  discount: number; // percentage off, e.g. 25
}

// --- In-memory cache ---

let cachedProducts: FlatPromoProduct[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function isCacheValid(): boolean {
  return cachedProducts !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

/**
 * Fetch all current promotional products, flattened with store name.
 * Results are cached in-memory for 6 hours.
 */
export async function getPromoProducts(): Promise<FlatPromoProduct[]> {
  if (isCacheValid()) {
    return cachedProducts!;
  }

  const res = await fetch(`${API_BASE}/products?offers=true`, {
    next: { revalidate: 21600 }, // 6h for Next.js fetch cache too
  });

  if (!res.ok) {
    throw new Error(`Supermarkets API error: ${res.status}`);
  }

  const data: SupermarketEntry[] = await res.json();

  const flat: FlatPromoProduct[] = [];

  for (const entry of data) {
    for (const product of entry.products) {
      const discount =
        product.oldPrice > 0
          ? Math.round(
              ((product.oldPrice - product.price) / product.oldPrice) * 100
            )
          : 0;

      flat.push({
        ...product,
        store: entry.supermarket,
        discount,
      });
    }
  }

  // Update cache
  cachedProducts = flat;
  cacheTimestamp = Date.now();

  return flat;
}

// --- Fuzzy matching ---

/**
 * Normalise a Bulgarian string for comparison:
 * lowercase, strip punctuation, collapse whitespace.
 */
function normalise(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "") // keep letters + digits + spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split a string into bigrams (pairs of consecutive characters).
 * Used for Dice-Sørensen coefficient.
 */
function bigrams(str: string): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < str.length - 1; i++) {
    s.add(str.slice(i, i + 2));
  }
  return s;
}

/**
 * Dice-Sørensen similarity coefficient (0–1).
 * Good for fuzzy matching Bulgarian product names.
 */
function diceSimilarity(a: string, b: string): number {
  const na = normalise(a);
  const nb = normalise(b);

  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const biA = bigrams(na);
  const biB = bigrams(nb);

  let intersection = 0;
  for (const bg of biA) {
    if (biB.has(bg)) intersection++;
  }

  return (2 * intersection) / (biA.size + biB.size);
}

/**
 * Check if one normalised string contains the other.
 * Catches cases like "домати" inside "Чери домати 500г".
 */
function containsMatch(itemName: string, promoName: string): boolean {
  const ni = normalise(itemName);
  const np = normalise(promoName);
  return np.includes(ni) || ni.includes(np);
}

export interface DealMatch {
  itemName: string;
  product: FlatPromoProduct;
  score: number;
}

/**
 * Find the best promotional match for a shopping list item name.
 * Returns null if no match above the threshold.
 */
export function findBestDeal(
  itemName: string,
  promos: FlatPromoProduct[],
  threshold = 0.35
): DealMatch | null {
  let bestScore = 0;
  let bestProduct: FlatPromoProduct | null = null;

  for (const promo of promos) {
    // Dice similarity
    let score = diceSimilarity(itemName, promo.name);

    // Boost if one contains the other
    if (containsMatch(itemName, promo.name)) {
      score = Math.max(score, 0.6);
    }

    if (score > bestScore) {
      bestScore = score;
      bestProduct = promo;
    }
  }

  if (bestProduct && bestScore >= threshold) {
    return {
      itemName,
      product: bestProduct,
      score: bestScore,
    };
  }

  return null;
}
