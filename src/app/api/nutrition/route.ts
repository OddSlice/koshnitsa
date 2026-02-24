import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse product info
  const { name, quantity } = await req.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Missing product name." },
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

  // 4. Call OpenAI for nutrition estimation
  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are a nutritional information estimator for a Bulgarian grocery app.
Given a product name and quantity, estimate the nutritional values per 100g and respond with ONLY valid JSON (no markdown, no backticks):
{
  "calories": <number, kcal per 100g>,
  "protein": <number, grams per 100g>,
  "carbs": <number, grams per 100g>,
  "fat": <number, grams per 100g>,
  "description": "<one-line description of the product in Bulgarian>"
}

Rules:
- Use typical nutritional values for the product
- The description should be a brief one-line description in Bulgarian (e.g. "Пълнозърнест хляб с високо съдържание на фибри")
- Round numbers to 1 decimal place
- If unsure, provide your best estimate based on common values for that type of product`,
        },
        {
          role: "user",
          content: `Product: ${name}${quantity ? ` (${quantity})` : ""}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";

    let result: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      description: string;
    };

    try {
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse nutrition response:", raw);
      return NextResponse.json(
        { error: "Could not parse nutrition data." },
        { status: 502 }
      );
    }

    // Sanitize numbers
    result.calories = Math.max(0, Math.round(Number(result.calories) || 0));
    result.protein = Math.max(
      0,
      Math.round((Number(result.protein) || 0) * 10) / 10
    );
    result.carbs = Math.max(
      0,
      Math.round((Number(result.carbs) || 0) * 10) / 10
    );
    result.fat = Math.max(
      0,
      Math.round((Number(result.fat) || 0) * 10) / 10
    );

    return NextResponse.json({
      ...result,
      estimated: true,
    });
  } catch (err: unknown) {
    console.error("OpenAI nutrition API error:", err);
    const message =
      err instanceof Error ? err.message : "Nutrition lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
