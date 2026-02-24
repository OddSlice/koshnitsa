import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const CATEGORIES = [
  "Плодове и зеленчуци",
  "Месо и риба",
  "Мляко и яйца",
  "Хляб и тестени",
  "Замразени",
  "Почистване",
  "Лични грижи",
  "Друго",
];

export async function POST(req: NextRequest) {
  // 1. Auth check — only logged-in users
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse the image from the request
  const { image } = await req.json();

  if (!image || typeof image !== "string") {
    return NextResponse.json(
      { error: "Missing image data. Send a base64 data URL." },
      { status: 400 }
    );
  }

  // 3. Validate that OPENAI_API_KEY is set
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not configured");
    return NextResponse.json(
      { error: "AI service is not configured." },
      { status: 500 }
    );
  }

  // 4. Call OpenAI GPT-4o with the image
  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a grocery item identifier for a Bulgarian shopping list app.
Given a photo of a grocery product, identify it and respond with ONLY valid JSON (no markdown, no backticks):
{
  "name": "<product name in Bulgarian>",
  "quantity": "<suggested quantity, e.g. 1x, 500g, 1л>",
  "category": "<one of the exact categories listed below>",
  "confidence": <number between 0 and 1>
}

Valid categories (use EXACTLY one of these):
${CATEGORIES.map((c) => `- ${c}`).join("\n")}

Rules:
- The product name MUST be in Bulgarian (e.g. "Домати", "Прясно мляко", "Пилешко филе")
- If you can read a brand name on the packaging, include it (e.g. "Верея прясно мляко")
- Pick the most specific matching category
- Set confidence based on how sure you are (1.0 = very clear, 0.5 = somewhat guessing, <0.3 = very uncertain)
- If you cannot identify the product at all, return: {"name": "", "quantity": "1x", "category": "Друго", "confidence": 0}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What grocery product is in this photo?",
            },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "low",
              },
            },
          ],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";

    // Parse the JSON response
    let result: {
      name: string;
      quantity: string;
      category: string;
      confidence: number;
    };

    try {
      // Handle cases where the model wraps JSON in markdown code blocks
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse OpenAI response:", raw);
      return NextResponse.json(
        { error: "Could not understand the AI response. Try a clearer photo." },
        { status: 502 }
      );
    }

    // Validate category — fall back to "Друго" if invalid
    if (!CATEGORIES.includes(result.category)) {
      result.category = "Друго";
    }

    // Clamp confidence
    result.confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("OpenAI API error:", err);
    const message =
      err instanceof Error ? err.message : "AI identification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
