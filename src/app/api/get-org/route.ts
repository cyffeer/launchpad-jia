import { NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongoDB/mongoDB";

// Optional recruiter auto-provisioning:
// To allow specific emails immediate recruiter portal access without manual DB inserts,
// set NEXT_PUBLIC_RECRUITER_ALLOWLIST to a comma-separated list of emails, e.g.
// NEXT_PUBLIC_RECRUITER_ALLOWLIST=anne.liangco@whitecloak.com,miguel.fermin@whitecloak.com
// Optionally set NEXT_PUBLIC_DEFAULT_ORG_ID to force membership to a specific organization _id.
// If DEFAULT_ORG_ID is not set, the first active organization is used.
// This runs before returning org membership; if a membership already exists it is left unchanged.

export async function POST(req: Request) {
  const { db } = await connectMongoDB();
  const { user } = await req.json();

  const allowlistRaw = process.env.NEXT_PUBLIC_RECRUITER_ALLOWLIST || "";
  const allowlist = allowlistRaw.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  const emailLower = (user.email || "").toLowerCase();

  // Auto-provision membership if email is in allowlist and not already a member.
  // CHANGE: Promote allowlist users to super_admin instead of hiring_manager so they have
  // unified access to both recruiter and admin portals without needing a UI switch button.
  if (allowlist.includes(emailLower)) {
    // Check existing membership quickly
    const existing = await db.collection("members").findOne({ email: user.email });
    if (!existing) {
      // Determine target org
      let orgIdToUse = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || null;
      if (!orgIdToUse) {
        const firstActiveOrg = await db.collection("organizations").findOne({ status: "active" });
        if (firstActiveOrg) orgIdToUse = String(firstActiveOrg._id);
      }
      if (orgIdToUse) {
        await db.collection("members").insertOne({
          email: user.email,
          orgID: orgIdToUse,
          // Mark as super_admin for elevated dual-portal access
          role: "super_admin",
          careers: [],
          status: "joined",
          name: user.name,
          image: user.picture || user.image,
          createdAt: new Date(),
          lastLogin: new Date(),
        });
      }
    }
  }

  const orgs = await db
    .collection("members")
    .aggregate([
      { $match: { email: user.email } },
      {
        $lookup: {
          from: "organizations",
          let: { orgIdStr: "$orgID" },
          pipeline: [
            {
              $addFields: {
                _idStr: { $toString: "$_id" },
              },
            },
            {
              $match: {
                $expr: { 
                  $and: [
                    { $eq: ["$_idStr", "$$orgIdStr"] },
                    { $eq: ["$status", "active"] }
                  ]
                },
              },
            },
          ],
          as: "organizationDetails",
        },
      },
      { $unwind: "$organizationDetails" },
      {
        $addFields: {
          "organizationDetails.role": "$role",
          "organizationDetails.careers": "$careers",
        },
      },
    ])
    .toArray();

  const orgList = orgs.map((org) => org.organizationDetails);

  if (orgList.length > 0) {
    // Update member records with fresh user data
    await db.collection("members").updateMany(
      { email: user.email },
      {
        $set: {
          name: user.name,
          image: user.picture || user.image,
          lastLogin: new Date(),
          status: "joined",
        },
      }
    );
  }
  return NextResponse.json(orgList);
}

export async function GET() {
  const { db } = await connectMongoDB();

  const orgs = await db.collection("organizations").find({ status: "active" }).toArray();

  return NextResponse.json(orgs);
}
