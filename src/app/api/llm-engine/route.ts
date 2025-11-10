import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Minimal Gemini client; used as fallback or primary when OpenAI is unavailable
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

async function callGemini(systemPrompt?: string, userPrompt?: string) {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");

  const tryModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]; // cascade for availability
  let lastErr: any;
  for (const model of tryModels) {
    try {
      const modelClient = genAI.getGenerativeModel({
        model,
        // Prefer native systemInstruction when available; falls back to prefix in prompt otherwise
        ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
      } as any);

      const promptText = userPrompt || "";
      const result = await modelClient.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: promptText }],
          },
        ],
      });
      const text = result?.response?.text?.() ?? result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return { text, provider: "gemini", model } as const;
    } catch (err) {
      lastErr = err;
      // try next
    }
  }
  throw lastErr || new Error("Gemini generation failed");
}

export async function POST(request: Request) {
  try {
    const { systemPrompt, prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Try OpenAI first when configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                systemPrompt ||
                "You are a helpful assistant that can answer questions and help with tasks.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });
        return NextResponse.json({
          result: completion.choices[0].message.content,
          provider: "openai",
          model: "gpt-4o-mini",
        });
      } catch (err) {
        // fall through to Gemini
        console.warn("LLM engine OpenAI failed, falling back to Gemini:", err);
      }
    }

    // Fallback: Gemini cascade (2.5-flash → 2.0-flash → 1.5-flash)
    const g = await callGemini(systemPrompt, prompt);
    return NextResponse.json({ result: g.text, provider: g.provider, model: g.model });
  } catch (error) {
    console.error("Error in LLM engine:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
