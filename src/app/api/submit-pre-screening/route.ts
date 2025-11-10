import { NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongoDB/mongoDB";

/*
  submit-pre-screening
  Body: { interviewID: string, answers: [{ questionId, question, answer }] }
  Effect: Stores answers and advances status from For Pre-Screening -> For CV Upload
*/
export async function POST(request: Request) {
  try {
    const { interviewID, answers } = await request.json();
    if (!interviewID || !Array.isArray(answers)) {
      return NextResponse.json({ error: "interviewID and answers array required" }, { status: 400 });
    }

    const { db } = await connectMongoDB();
    const interview = await db.collection("interviews").findOne({ interviewID });
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Basic validation: ensure each answer has question and answer text
    const cleaned = answers.filter(a => a && a.answer !== undefined).map(a => ({
      questionId: a.questionId || a.id || null,
      question: a.question || "",
      answer: a.answer,
      type: a.type || null,
    }));

    await db.collection("interviews").updateOne(
      { interviewID },
      { $set: { preScreeningAnswers: cleaned, status: "For CV Upload", updatedAt: new Date() } }
    );

    return NextResponse.json({ message: "Pre-screening answers submitted", preScreeningAnswers: cleaned });
  } catch (err) {
    console.error("submit-pre-screening error", err);
    return NextResponse.json({ error: "Failed to submit pre-screening" }, { status: 500 });
  }
}
