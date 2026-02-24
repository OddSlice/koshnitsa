import { createClient } from "@/lib/supabase/server";
import {
  getPromoProducts,
  findBestDeal,
  type FlatPromoProduct,
} from "@/lib/supermarkets";
import { NextRequest, NextResponse } from "next/server";

export interface DealResult {
  itemId: string;
  itemName: string;
  status: "deal" | "no_deal" | "estimated";
  // Present when status === "deal"
  store?: string;
  promoName?: string;
  price?: number;
  oldPrice?: number;
  discount?: number;
  validUntil?: string;
  picUrl?: string;
  score?: number;
  // Present when status === "estimated"
  estimatedPriceMin?: number;
  estimatedPriceMax?: number;
  estimatedStore?: string | null;
  confidence?: "high" | "medium" | "low";
  priceEstimatedAt?: string | null;
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

  // 2. Parse request body — list of items to check (now with estimate columns)
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

  // 3. Fetch promotional products (cached server-side)
  let promos: FlatPromoProduct[];
  try {
    promos = await getPromoProducts();
  } catch (err) {
    console.error("Failed to fetch promos:", err);
    return NextResponse.json(
      { error: "Could not fetch promotional data. Try again later." },
      { status: 502 }
    );
  }

  // 4. Match each item against promotions
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const results: DealResult[] = items.map((item) => {
    const match = findBestDeal(item.name, promos);

    if (match) {
      return {
        itemId: item.id,
        itemName: item.name,
        status: "deal" as const,
        store: match.product.store,
        promoName: match.product.name,
        price: match.product.price,
        oldPrice: match.product.oldPrice,
        discount: match.product.discount,
        validUntil: match.product.validUntil,
        picUrl: match.product.picUrl,
        score: Math.round(match.score * 100) / 100,
      };
    }

    // Check if we have a fresh saved estimate
    if (
      item.estimated_price_min != null &&
      item.price_estimated_at != null
    ) {
      const estimatedAt = new Date(item.price_estimated_at).getTime();
      const isFresh = Date.now() - estimatedAt < TWENTY_FOUR_HOURS;

      if (isFresh) {
        return {
          itemId: item.id,
          itemName: item.name,
          status: "estimated" as const,
          estimatedPriceMin: item.estimated_price_min,
          estimatedPriceMax: item.estimated_price_max ?? item.estimated_price_min,
          estimatedStore: item.estimated_store,
          confidence: (item.price_confidence as "high" | "medium" | "low") ?? "low",
          priceEstimatedAt: item.price_estimated_at,
        };
      }
    }

    return {
      itemId: item.id,
      itemName: item.name,
      status: "no_deal" as const,
    };
  });

  return NextResponse.json({ results });
}
