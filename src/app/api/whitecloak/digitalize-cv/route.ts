// TODO (Vince) - For Merging

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const { chunks } = await req.json();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const corePrompt = `
    You are a helpful assistant that will extract the following data from the CV:
    
    CV chunks:
    ${chunks.map((chunk: any) => chunk.pageContent).join("\n")}

    Extract the following data from the CV:
      - Name
      - Email
      - Phone
      - Address
      - LinkedIn
      - GitHub
      - Twitter

    JSON template: 
    {
      errorRemarks: <error remarks>,
      digitalCV:
        [
          {name: "Introduction", content: <Introduction content markdown format>},
          {name: "Current Position", content: <Current Position content markdown format>},
          {name: "Contact Info", content: <Contact Info content markdown format>},
          {name: "Skills", content: <Skills content markdown format>},
          {name: "Experience", content: <Experience content markdown format>},
          {name: "Education", content: <Education content markdown format>},
          {name: "Projects", content: <Projects content markdown format>},
          {name: "Certifications", content: <Certifications content markdown format>},
          {name: "Awards", content: <Awards content markdown format>},
        ]
    }

    Processing Instructions:
      - follow the JSON template strictly
      - for contact info content make sure links are formatted as markdown links,
      - give detailed info in the content field.
      - in Awards content field give details of each award.
      - make sure the markdown format is correct, all section headlines are in bold. all paragraphs are in normal text, all lists are in bullet points, etc.
      - make sure all markdown lead text are equivalent to h2 tags in html,
      - for the Error Remarks, give a message if the chunks does seem to be a curriculum vitae, otherwise set it to null,
      - Do not include any other text or comments in the JSON output.
      - Only return the JSON output.
      - DO NOT include \`\`\`json or \`\`\` around the response.
    `;
  // Helper: Gemini fallback using JSON schema to ensure valid JSON
  async function runWithGemini(prompt: string): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(geminiKey);

    // Preferred model followed by fallbacks
    const candidateModels = [
      process.env.GEMINI_MODEL || "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    const generationConfig = {
      responseMimeType: "application/json",
      // We keep schema light; sections are strings in markdown
      responseSchema: {
        type: "object",
        properties: {
          errorRemarks: { type: "string" },
          digitalCV: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                content: { type: "string" },
              },
              required: ["name", "content"],
            },
          },
          fileInfo: {
            type: "object",
            properties: {
              name: { type: "string" },
              size: { type: "number" },
              type: { type: "string" },
            },
          },
        },
        required: ["digitalCV"],
      } as any,
      temperature: 0.2,
    } as const;

    let lastErr: any = null;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig,
        });
        const resp = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        });
        return resp.response.text();
      } catch (e: any) {
        lastErr = e;
        // Try next candidate if 404/not found or unsupported
        if (
          typeof e?.message === "string" &&
          (e.message.includes("404") ||
            e.message.includes("not found") ||
            e.message.includes("not supported"))
        ) {
          continue;
        }
        // For other errors (e.g., quota), break
        break;
      }
    }
    throw lastErr || new Error("Gemini generation failed");
  }

  // Try OpenAI first if available. If it fails or is not configured, try Gemini if available.
  if (hasOpenAI) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const completion = await openai.responses.create({
        model: "o4-mini",
        reasoning: { effort: "high" },
        input: [
          {
            role: "user",
            content: corePrompt,
          },
        ],
      });

      return NextResponse.json({
        result: completion.output_text,
        provider: "openai",
      });
    } catch (err: any) {
      console.error("OpenAI digitalize-cv failed:", err?.message || err);
      if (hasGemini) {
        try {
          const fallback = await runWithGemini(corePrompt);
          return NextResponse.json({ result: fallback, provider: "gemini" });
        } catch (err2: any) {
          console.error("Gemini fallback failed:", err2?.message || err2);
          return NextResponse.json(
            {
              error: "Digitalize CV failed",
              cause: "openai_and_gemini_failed",
              details: err2?.message || String(err2),
            },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          {
            error: "Digitalize CV failed",
            cause: "openai_failed_gemini_not_configured",
            details:
              "OpenAI failed and GEMINI_API_KEY is not set. Please set GEMINI_API_KEY to enable fallback.",
          },
          { status: 500 }
        );
      }
    }
  } else if (hasGemini) {
    // No OpenAI configured; go straight to Gemini
    try {
      const fallback = await runWithGemini(corePrompt);
      return NextResponse.json({ result: fallback, provider: "gemini" });
    } catch (err3: any) {
      console.error("Gemini digitalize-cv failed:", err3?.message || err3);
      return NextResponse.json(
        {
          error: "Digitalize CV failed",
          cause: "gemini_failed",
          details: err3?.message || String(err3),
        },
        { status: 500 }
      );
    }
  } else {
    // Neither provider configured
    return NextResponse.json(
      {
        error: "Digitalize CV failed",
        cause: "no_providers_configured",
        details:
          "Neither OPENAI_API_KEY nor GEMINI_API_KEY are set. Configure at least one provider.",
      },
      { status: 500 }
    );
  }
}
