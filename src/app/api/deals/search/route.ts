import { createClient } from "@/lib/supabase/server";
import {
  searchProducts,
  getProductUrl,
  parseDiscount,
  type PBProduct,
} from "@/lib/price-barometer";
import { NextRequest, NextResponse } from "next/server";

/** Serialised product result for the client */
export interface SearchResult {
  id: number;
  name: string;
  description: string | null;
  priceEur: number | null;
  oldPriceEur: number | null;
  discount: number | null;
  quantity: string | null;
  category: string | null;
  imageUrl: string | null;
  productUrl: string;
  store: string;
  storeLogo: string | null;
  validFrom: string | null;
  validUntil: string | null;
}

export interface SearchEstimate {
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  mostLikelyStore: string | null;
  confidence: "high" | "medium" | "low";
}

function serialise(p: PBProduct): SearchResult {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    priceEur: p.price_eur,
    oldPriceEur: p.old_price_eur,
    discount: parseDiscount(p.discount),
    quantity: p.quantity,
    category: p.category,
    imageUrl: p.image_url,
    productUrl: getProductUrl(p.id),
    store: p.supermarket.name,
    storeLogo: p.supermarket.logo,
    validFrom: p.brochure.valid_from,
    validUntil: p.brochure.valid_until,
  };
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

  // 2. Parse request body
  const { query } = (await req.json()) as { query: string };

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "No search query provided." },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim();

  // 3. Search Price Barometer (cached in-memory for 1h)
  let products: PBProduct[] = [];
  try {
    products = await searchProducts(trimmedQuery);
  } catch (err) {
    console.error("Price Barometer search failed:", err);
    // Fall through — will show estimate instead
  }

  const results: SearchResult[] = products.map(serialise);

  // 4. If no results, get AI price estimate
  let estimate: SearchEstimate | null = null;

  if (results.length === 0) {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
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
    }
  }

  return NextResponse.json({ results, estimate, query: trimmedQuery });
}
