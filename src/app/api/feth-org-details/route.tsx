import connectMongoDB from "@/lib/mongoDB/mongoDB";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const { orgID } = await req.json();

    if (!orgID) {
      return Response.json(
        { error: "Missing orgID parameter" },
        { status: 400 }
      );
    }

    const { db } = await connectMongoDB();

    // Try to convert orgID to ObjectId if possible, else use as string
    let query;
    try {
      query = { _id: new ObjectId(orgID) };
    } catch (e) {
      query = { _id: orgID };
    }

  const orgDoc = await db.collection("organizations").aggregate([
      {
        $match: query
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
  // Minimal change: preserve empty plan arrays to allow orgs without planId
  { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
    ]).toArray();

    if (!orgDoc || orgDoc.length === 0) {
      return Response.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Provide a lightweight fallback when plan is missing so UI can still compute job slots
    const doc = orgDoc[0];
    if (!doc.plan) {
      doc.plan = { jobLimit: 1 }; // fallback base limit
    }
    return Response.json(doc);
  } catch (error) {
    console.error("Error in feth-org-details endpoint:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
