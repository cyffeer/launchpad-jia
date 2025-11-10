import { NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongoDB/mongoDB";
import { guid } from "@/lib/Utils";
import { ObjectId } from "mongodb";

// SECURITY: Lightweight input sanitization helpers to mitigate XSS.
// Rationale: We avoid adding a dependency (e.g., DOMPurify/sanitize-html) to keep the change minimal,
// and instead implement a conservative sanitizer:
//  - For plain text fields: strip tags entirely (no HTML is expected)
//  - For rich text (description): keep a small whitelist of tags and clean attributes/URLs
//  - For arrays/objects (questions, preScreeningQuestions): sanitize all nested strings
// NOTE: This does not attempt to be a full HTML parser; it targets common XSS vectors (script tags,
// event-handler attrs, javascript: URLs, dangerous embeds) and removes unknown tags.

const ALLOWED_HTML_TAGS = ["p", "br", "ul", "ol", "li", "strong", "em", "b", "i", "u", "a"]; // minimal formatting
const SAFE_URL_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

function toStringSafe(v: any): string {
  return typeof v === "string" ? v : v === undefined || v === null ? "" : String(v);
}

// SECURITY: Plain text sanitizer for fields that should never contain HTML (e.g., jobTitle, city, workSetup).
function sanitizePlain(input: any): string {
  let s = toStringSafe(input);
  // Remove null bytes and trim
  s = s.replace(/\0/g, "").trim();
  // Strip all tags
  s = s.replace(/<[^>]*>/g, "");
  // Remove leftover script-looking payloads
  s = s.replace(/javascript:/gi, "");
  return s;
}

// SECURITY: URL sanitizer for href/src; defaults to '#'
function sanitizeUrl(href: string): string {
  const raw = toStringSafe(href).trim();
  try {
    const u = new URL(raw, "http://localhost");
    return SAFE_URL_PROTOCOLS.includes(u.protocol) ? raw : "#";
  } catch {
    return "#";
  }
}

// SECURITY: Rich text sanitizer with tiny whitelist. Removes unknown tags/attrs and dangerous protocols.
function sanitizeRichHTML(htmlInput: any): string {
  let html = toStringSafe(htmlInput);
  // Remove null bytes
  html = html.replace(/\0/g, "");
  // Drop script/style/iframe/object/embed entirely
  html = html.replace(/<\/(?:script|style|iframe|object|embed)[^>]*>/gi, "")
             .replace(/<(?:script|style|iframe|object|embed)[^>]*>.*?<\/(?:script|style|iframe|object|embed)>/gis, "");
  // Remove on* event handler attributes (onclick, onerror, etc.)
  html = html.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Neutralize javascript: and data: URIs in href/src
  html = html.replace(/\s(href|src)\s*=\s*("|')(.*?)(\2)/gi, (_m, attr, q, val) => {
    const safe = sanitizeUrl(val);
    return ` ${attr}=${q}${safe}${q}`;
  });
  // Remove all tags not in the whitelist
  html = html.replace(/<\/?(?!p\b|br\b|ul\b|ol\b|li\b|strong\b|em\b|b\b|i\b|u\b|a\b)[^>]*>/gi, "");
  // For allowed non-anchor tags, strip all attributes to prevent style/event injection
  html = html.replace(/<(p|br|ul|ol|li|strong|em|b|i|u)\b[^>]*>/gi, "<$1>");
  // For anchor tags, only allow sanitized href and set safe rel/target
  html = html.replace(/<a\b([^>]*?)>/gi, (m, attrs) => {
    const hrefMatch = attrs.match(/href\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
    const hrefVal = hrefMatch ? hrefMatch[1].replace(/^['"]|['"]$/g, "") : "#";
    const safeHref = sanitizeUrl(hrefVal);
    return `<a href="${safeHref}" rel="nofollow noopener noreferrer" target="_blank">`;
  });
  return html.trim();
}

// SECURITY: Deep sanitize all strings in nested structures (arrays/objects).
function deepSanitize(value: any, asRichText = false): any {
  if (Array.isArray(value)) return value.map((v) => deepSanitize(v, asRichText));
  if (value && typeof value === "object") {
    const out: any = {};
    for (const k of Object.keys(value)) {
      // For object fields that are obviously text-like, sanitize as plain
      out[k] = deepSanitize(value[k], false);
    }
    return out;
  }
  return asRichText ? sanitizeRichHTML(value) : sanitizePlain(value);
}

export async function POST(request: Request) {
  try {
    const {
      jobTitle,
      description,
      questions,
      lastEditedBy,
      createdBy,
      screeningSetting,
      orgID,
      requireVideo,
      location,
      workSetup,
      workSetupRemarks,
      status,
      salaryNegotiable,
      minimumSalary,
      maximumSalary,
      country,
      province,
      employmentType,
      teamMembers,
      cvSecretPrompt,
      preScreeningQuestions,
      aiSecretPrompt,
      pipelineStages,
    } = await request.json();
    // Validate required fields (basic presence check)
    if (!jobTitle || !description || !questions || !location || !workSetup) {
      return NextResponse.json(
        {
          error:
            "Job title, description, questions, location and work setup are required",
        },
        { status: 400 }
      );
    }

    const { db } = await connectMongoDB();

    const orgDetails = await db.collection("organizations").aggregate([
      {
        $match: {
          _id: new ObjectId(orgID)
        }
      },
      {
        $lookup: {
            from: "organization-plans",
            let: { planId: "$planId" },
            pipeline: [
                {
                    $addFields: {
                        _id: { $toString: "$_id" }
                    }
                },
                {
                    $match: {
                        $expr: { $eq: ["$_id", "$$planId"] }
                    }
                }
            ],
            as: "plan"
        }
      },
      // Minimal change: allow orgs without a plan to pass through by preserving empty plan arrays
      // This avoids blocking job creation during setup when planId is null/unset.
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
    ]).toArray();

    if (!orgDetails || orgDetails.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const totalActiveCareers = await db.collection("careers").countDocuments({ orgID, status: "active" });

    // Minimal change: add a safe fallback plan when no plan is attached
    // Rationale: In early setups, org.planId can be null. Fallback allows limited job creation without forcing a plan record.
    const plan = orgDetails[0].plan || { jobLimit: 1 }; // default to 1 base job if no plan
    const planJobLimit = typeof plan?.jobLimit === "number" && plan.jobLimit >= 0 ? plan.jobLimit : 1;
    const extraSlots = orgDetails[0]?.extraJobSlots || 0;
    const maxJobs = planJobLimit + extraSlots;

    if (totalActiveCareers >= maxJobs) {
      return NextResponse.json({ error: "You have reached the maximum number of jobs for your plan" }, { status: 400 });
    }

    // SECURITY: Sanitize all user-provided fields before persisting to DB.
    // - Plain text fields use sanitizePlain (no HTML)
    // - Description uses sanitizeRichHTML (allow minimal HTML)
    // - Complex objects/arrays are deep-sanitized (all strings cleaned)
    const safeJobTitle = sanitizePlain(jobTitle);
    const safeDescription = sanitizeRichHTML(description);
    const safeLocation = sanitizePlain(location);
    const safeWorkSetup = sanitizePlain(workSetup);
    const safeWorkSetupRemarks = sanitizePlain(workSetupRemarks);
    const safeLastEditedBy = sanitizePlain(lastEditedBy);
    const safeCreatedBy = sanitizePlain(createdBy);
    const safeCountry = sanitizePlain(country);
    const safeProvince = sanitizePlain(province);
    const safeEmploymentType = sanitizePlain(employmentType);
    const safeCvSecretPrompt = sanitizePlain(cvSecretPrompt);
    const safeAiSecretPrompt = sanitizePlain(aiSecretPrompt);

    // Normalize numeric inputs to finite numbers or null
    const minSal = Number.isFinite(Number(minimumSalary)) ? Number(minimumSalary) : null;
    const maxSal = Number.isFinite(Number(maximumSalary)) ? Number(maximumSalary) : null;

    // Deep sanitize arrays/objects (strip any HTML/script in nested strings)
    const safeQuestions = deepSanitize(questions);
    const safeTeamMembers = Array.isArray(teamMembers) ? teamMembers.filter(Boolean) : [];
    const safePreScreening = Array.isArray(preScreeningQuestions)
      ? preScreeningQuestions.map((q: any) => ({
          // Explicitly sanitize expected fields
          id: sanitizePlain(q?.id),
          type: sanitizePlain(q?.type),
          question: sanitizePlain(q?.question),
          options: Array.isArray(q?.options) ? q.options.map((o: any) => sanitizePlain(o)) : [],
        }))
      : [];

    const career = {
      id: guid(),
      jobTitle: safeJobTitle,
      description: safeDescription,
      questions: safeQuestions,
      location: safeLocation,
      workSetup: safeWorkSetup,
      workSetupRemarks: safeWorkSetupRemarks,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastEditedBy: safeLastEditedBy,
      createdBy: safeCreatedBy,
      status: status || "active",
      screeningSetting,
      orgID,
      requireVideo,
      lastActivityAt: new Date(),
      salaryNegotiable,
      minimumSalary: minSal,
      maximumSalary: maxSal,
      country: safeCountry,
      province: safeProvince,
      employmentType: safeEmploymentType,
      teamMembers: safeTeamMembers, // optional new field for segmented Team Access step
      cvSecretPrompt: safeCvSecretPrompt,
      preScreeningQuestions: safePreScreening,
      aiSecretPrompt: safeAiSecretPrompt,
      pipelineStages: Array.isArray(pipelineStages) ? pipelineStages : [],
    };

    await db.collection("careers").insertOne(career);

    return NextResponse.json({
      message: "Career added successfully",
      career,
    });
  } catch (error) {
    console.error("Error adding career:", error);
    return NextResponse.json(
      { error: "Failed to add career" },
      { status: 500 }
    );
  }
}
