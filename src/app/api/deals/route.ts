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
  status: "deal" | "no_deal";
  // Present when status === "deal"
  store?: string;
  promoName?: string;
  price?: number;
  oldPrice?: number;
  discount?: number;
  validUntil?: string;
  picUrl?: string;
  score?: number;
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
    items: { id: string; name: string }[];
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
  const results: DealResult[] = items.map(({ id, name }) => {
    const match = findBestDeal(name, promos);

    if (match) {
      return {
        itemId: id,
        itemName: name,
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

    return {
      itemId: id,
      itemName: name,
      status: "no_deal" as const,
    };
  });

  return NextResponse.json({ results });
}
