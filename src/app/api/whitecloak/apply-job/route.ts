// TODO (Vince) : For Checking

import connectMongoDB from "@/lib/mongoDB/mongoDB";
import { guid } from "@/lib/Utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { user, selectedCareer } = await request.json();
  const { db } = await connectMongoDB();
  const newDate = new Date();
  const hasPreScreening = Array.isArray(selectedCareer?.preScreeningQuestions) && selectedCareer.preScreeningQuestions.length > 0;
  const interviewData = {
    ...selectedCareer,
    ...user,
    applicationStatus: "Ongoing", // important
    currentStep: "Applied", // important
    status: hasPreScreening ? "For Pre-Screening" : "For CV Upload", // gate CV upload if questions exist
    createdAt: newDate,
    updatedAt: newDate,
    interviewID: guid(),
    completedAt: null,
    reviewers: [],
    preScreeningAnswers: [], // will be populated once applicant submits
  };

  delete interviewData._id;
  delete interviewData.role;

  const interviewInstance = await db
    .collection("interviews")
    .findOne({ id: interviewData.id, email: interviewData.email });

  if (interviewInstance) {
    return NextResponse.json({
      error: "Job Application Failed.",
      message: "You have a pending application for this role.",
    });
  }

  await db.collection("interviews").insertOne(interviewData);

  const existingAffiliation = await db.collection("affiliations").findOne({
    "applicantInfo.email": interviewData.email,
    orgID: interviewData.orgID,
  });

  if (!existingAffiliation) {
    await db.collection("affiliations").insertOne({
      type: "applicant",
      applicantInfo: {
        name: interviewData.name,
        email: interviewData.email,
        image: interviewData.image,
      },
      createdAt: new Date(),
      orgID: interviewData.orgID,
    });
  }

  return NextResponse.json({
    message: "Interview added successfully",
    interviewData,
  });
}
