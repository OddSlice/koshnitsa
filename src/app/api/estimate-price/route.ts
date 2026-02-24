import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const VALID_STORES = [
  "Billa",
  "Kaufland",
  "Lidl",
  "Fantastico",
  "T-Market",
];

interface EstimateInput {
  itemId: string;
  name: string;
}

interface EstimateResult {
  name: string;
  estimated_price_min: number;
  estimated_price_max: number;
  most_likely_store: string | null;
  confidence: "high" | "medium" | "low";
}

export interface PriceEstimate {
  itemId: string;
  itemName: string;
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

  // 2. Parse items
  const { items } = (await req.json()) as { items: EstimateInput[] };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "No items provided." },
      { status: 400 }
    );
  }

  // 3. Validate API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not configured");
    return NextResponse.json(
      { error: "AI service is not configured." },
      { status: 500 }
    );
  }

  // 4. Batched OpenAI call — all items in one prompt
  const openai = new OpenAI({ apiKey });

  const itemNames = items.map((i) => i.name);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `You are a grocery price estimator for Sofia, Bulgaria.
Given a list of grocery product names (in Bulgarian), estimate the current retail price range for each product at Sofia supermarkets.

Respond with ONLY valid JSON (no markdown, no backticks) — a JSON array with one entry per product, in the same order as the input:
[
  {
    "name": "<the product name as given>",
    "estimated_price_min": <number in лв>,
    "estimated_price_max": <number in лв>,
    "most_likely_store": "<one of: Billa, Kaufland, Lidl, Fantastico, T-Market, or null>",
    "confidence": "<high | medium | low>"
  }
]

Rules:
- Prices must be in Bulgarian лв (BGN)
- Base estimates on typical Bulgarian supermarket prices for that product type and quantity
- Set most_likely_store to the store that is most known for good prices on this type of product, or null if unsure
- Confidence levels:
  - "high": common everyday products with well-known prices (bread, milk, eggs)
  - "medium": products where price varies by brand/quality
  - "low": unusual products or when you're very uncertain
- Price range should be reasonable (min < max, both > 0)
- Round prices to 2 decimal places`,
        },
        {
          role: "user",
          content: `Estimate prices for these ${itemNames.length} products in Sofia:\n${itemNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";

    let estimates: EstimateResult[];

    try {
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      estimates = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse price estimates:", raw);
      return NextResponse.json(
        { error: "Could not parse AI price estimates." },
        { status: 502 }
      );
    }

    // 5. Map results back to item IDs + sanitise
    const results: PriceEstimate[] = items.map((item, idx) => {
      const est = estimates[idx];

      if (!est) {
        return {
          itemId: item.itemId,
          itemName: item.name,
          estimatedPriceMin: 0,
          estimatedPriceMax: 0,
          mostLikelyStore: null,
          confidence: "low" as const,
        };
      }

      const min = Math.max(0, Math.round((Number(est.estimated_price_min) || 0) * 100) / 100);
      const max = Math.max(min, Math.round((Number(est.estimated_price_max) || 0) * 100) / 100);
      const store = VALID_STORES.includes(est.most_likely_store ?? "")
        ? est.most_likely_store
        : null;
      const confidence = (["high", "medium", "low"] as const).includes(
        est.confidence as "high" | "medium" | "low"
      )
        ? (est.confidence as "high" | "medium" | "low")
        : "low";

      return {
        itemId: item.itemId,
        itemName: item.name,
        estimatedPriceMin: min,
        estimatedPriceMax: max,
        mostLikelyStore: store,
        confidence,
      };
    });

    // 6. Save estimates to list_items in Supabase
    const now = new Date().toISOString();
    for (const est of results) {
      await supabase
        .from("list_items")
        .update({
          estimated_price_min: est.estimatedPriceMin,
          estimated_price_max: est.estimatedPriceMax,
          estimated_store: est.mostLikelyStore,
          price_confidence: est.confidence,
          price_estimated_at: now,
        })
        .eq("id", est.itemId);
    }

    return NextResponse.json({ estimates: results });
  } catch (err: unknown) {
    console.error("OpenAI price estimation error:", err);
    const message =
      err instanceof Error ? err.message : "Price estimation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
