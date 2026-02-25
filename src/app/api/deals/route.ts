import { createClient } from "@/lib/supabase/server";
import {
  searchProducts,
  getProductUrl,
  parseDiscount,
  type PBProduct,
} from "@/lib/price-barometer";
import { NextRequest, NextResponse } from "next/server";

export interface DealResult {
  itemId: string;
  itemName: string;
  status: "deal" | "no_deal" | "estimated";
  // Present when status === "deal"
  productId?: number;
  store?: string;
  storeLogo?: string | null;
  promoName?: string;
  price?: number | null;
  oldPrice?: number | null;
  discount?: number | null;
  quantity?: string | null;
  imageUrl?: string | null;
  productUrl?: string;
  validFrom?: string | null;
  validUntil?: string | null;
  // Present when status === "estimated"
  estimatedPriceMin?: number;
  estimatedPriceMax?: number;
  estimatedStore?: string | null;
  confidence?: "high" | "medium" | "low";
  priceEstimatedAt?: string | null;
}

function bestProduct(products: PBProduct[]): PBProduct | null {
  if (products.length === 0) return null;
  // Prefer products with a price, sorted by lowest price
  const withPrice = products.filter((p) => p.price_eur != null);
  if (withPrice.length > 0) {
    withPrice.sort((a, b) => (a.price_eur ?? 999) - (b.price_eur ?? 999));
    return withPrice[0];
  }
  return products[0];
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request body — list of items to check
  const { items } = (await req.json()) as {
    items: {
      id: string;
      name: string;
      estimated_price_min?: number | null;
      estimated_price_max?: number | null;
      estimated_store?: string | null;
      price_confidence?: string | null;
      price_estimated_at?: string | null;
    }[];
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "No items provided." },
      { status: 400 }
    );
  }

  // 3. Search Price Barometer for each item (cached — no duplicate API calls)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const results: DealResult[] = [];

  for (const item of items) {
    let products: PBProduct[] = [];
    try {
      products = await searchProducts(item.name, { limit: 5 });
    } catch (err) {
      console.error(`Search failed for "${item.name}":`, err);
    }

    const best = bestProduct(products);

    if (best) {
      results.push({
        itemId: item.id,
        itemName: item.name,
        status: "deal",
        productId: best.id,
        store: best.supermarket.name,
        storeLogo: best.supermarket.logo,
        promoName: best.name,
        price: best.price_eur,
        oldPrice: best.old_price_eur,
        discount: parseDiscount(best.discount),
        quantity: best.quantity,
        imageUrl: best.image_url,
        productUrl: getProductUrl(best.id),
        validFrom: best.brochure.valid_from,
        validUntil: best.brochure.valid_until,
      });
    } else if (
      item.estimated_price_min != null &&
      item.price_estimated_at != null
    ) {
      // Use cached estimate if fresh
      const estimatedAt = new Date(item.price_estimated_at).getTime();
      const isFresh = Date.now() - estimatedAt < TWENTY_FOUR_HOURS;

      if (isFresh) {
        results.push({
          itemId: item.id,
          itemName: item.name,
          status: "estimated",
          estimatedPriceMin: item.estimated_price_min,
          estimatedPriceMax:
            item.estimated_price_max ?? item.estimated_price_min,
          estimatedStore: item.estimated_store,
          confidence:
            (item.price_confidence as "high" | "medium" | "low") ?? "low",
          priceEstimatedAt: item.price_estimated_at,
        });
      } else {
        results.push({
          itemId: item.id,
          itemName: item.name,
          status: "no_deal",
        });
      }
    } else {
      results.push({
        itemId: item.id,
        itemName: item.name,
        status: "no_deal",
      });
    }
  }

  return NextResponse.json({ results });
}
