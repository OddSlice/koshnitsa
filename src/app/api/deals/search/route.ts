import { createClient } from "@/lib/supabase/server";
import {
  getPromoProducts,
  findAllDeals,
  type FlatPromoProduct,
} from "@/lib/supermarkets";
import { NextRequest, NextResponse } from "next/server";

export interface SearchDealResult {
  store: string;
  promoName: string;
  price: number;
  oldPrice: number;
  discount: number;
  validUntil: string;
  picUrl: string;
  score: number;
}

export interface SearchEstimate {
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  mostLikelyStore: string | null;
  confidence: "high" | "medium" | "low";
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

  // 2. Parse request body — single search query
  const { query } = (await req.json()) as { query: string };

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "No search query provided." },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim();

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

  // 4. Find ALL matching deals (not just best)
  const matches = findAllDeals(trimmedQuery, promos);

  const deals: SearchDealResult[] = matches.map((m) => ({
    store: m.product.store,
    promoName: m.product.name,
    price: m.product.price,
    oldPrice: m.product.oldPrice,
    discount: m.product.discount,
    validUntil: m.product.validUntil,
    picUrl: m.product.picUrl,
    score: Math.round(m.score * 100) / 100,
  }));

  // 5. If no deals found, get a price estimate (non-blocking for client but we do it server-side)
  let estimate: SearchEstimate | null = null;

  if (deals.length === 0) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        // Inline single-item estimate to avoid extra network hop
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: `You are a grocery price estimator for Sofia, Bulgaria.
Given a grocery product name (in Bulgarian), estimate the current retail price range at Sofia supermarkets.

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "estimated_price_min": <number in €>,
  "estimated_price_max": <number in €>,
  "most_likely_store": "<one of: Billa, Kaufland, Lidl, Fantastico, T-Market, or null>",
  "confidence": "<high | medium | low>"
}

Rules:
- Prices must be in euros (€ / EUR) — Bulgaria uses the euro
- Base estimates on typical Bulgarian supermarket prices
- Confidence: "high" for everyday staples, "medium" for brand-varying items, "low" for unusual products
- Round prices to 2 decimal places`,
            },
            {
              role: "user",
              content: `Estimate the price of: ${trimmedQuery}`,
            },
          ],
        });

        const raw = response.choices[0]?.message?.content?.trim() ?? "";
        const cleaned = raw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const parsed = JSON.parse(cleaned);
        const VALID_STORES = [
          "Billa",
          "Kaufland",
          "Lidl",
          "Fantastico",
          "T-Market",
        ];

        const min = Math.max(
          0,
          Math.round((Number(parsed.estimated_price_min) || 0) * 100) / 100
        );
        const max = Math.max(
          min,
          Math.round((Number(parsed.estimated_price_max) || 0) * 100) / 100
        );

        estimate = {
          estimatedPriceMin: min,
          estimatedPriceMax: max,
          mostLikelyStore: VALID_STORES.includes(parsed.most_likely_store ?? "")
            ? parsed.most_likely_store
            : null,
          confidence: (["high", "medium", "low"] as const).includes(
            parsed.confidence
          )
            ? parsed.confidence
            : "low",
        };
      }
    } catch (err) {
      console.error("Price estimation error in search:", err);
      // Non-blocking — just return deals without estimate
    }
  }

  return NextResponse.json({ deals, estimate, query: trimmedQuery });
}
