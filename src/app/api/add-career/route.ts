import { NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongoDB/mongoDB";
import { guid } from "@/lib/Utils";
import { ObjectId } from "mongodb";

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
    } = await request.json();
    // Validate required fields
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

    const career = {
      id: guid(),
      jobTitle,
      description,
      questions,
      location,
      workSetup,
      workSetupRemarks,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastEditedBy,
      createdBy,
      status: status || "active",
      screeningSetting,
      orgID,
      requireVideo,
      lastActivityAt: new Date(),
      salaryNegotiable,
      minimumSalary,
      maximumSalary,
      country,
      province,
      employmentType,
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
