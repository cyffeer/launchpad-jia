import { NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongoDB/mongoDB";
import OpenAI from "openai";
import { sendEmail } from "@/lib/Email";
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { interviewID, userEmail, testMode, testInterviewData, testCVData } =
    await request.json();

  const { db } = await connectMongoDB();

  let interviewData;

  // set interview data with test mode case
  if (!testMode) {
    interviewData = await db.collection("interviews").findOne({
      interviewID: interviewID,
    });
  } else {
    interviewData = testInterviewData;
  }

  let cvData;

  if (!testMode) {
    cvData = await db.collection("applicant-cv").findOne({
      email: userEmail,
    });
  } else {
    cvData = testCVData;
  }

  let cvScreeningPromptData = await db.collection("global-settings").findOne(
    {
      name: "global-settings",
    },
    {
      projection: {
        cv_screening_prompt: 1,
      },
    }
  );

  const cvScreeningPromptText =
    cvScreeningPromptData?.cv_screening_prompt?.prompt;

  if (!interviewData) {
    return NextResponse.json({
      message: "[CV Screening Error] Interview not found - Operation Aborted",
    });
  }

  if (!cvData) {
    let noCVError = {
      cvStatus: "No CV",
      stateClass: "state-muted",
      cvSettingResult: null,
      cvScreeningReason: "Applicant has no CV uploaded.",
    };

    await db.collection("interviews").updateOne(
      { interviewID: interviewID },
      {
        $set: noCVError,
      }
    );

    return NextResponse.json(noCVError);
  }

  let parsedCV = "";
  const preAnswers = Array.isArray(interviewData?.preScreeningAnswers) ? interviewData.preScreeningAnswers : [];

  cvData.digitalCV.forEach((section) => {
    parsedCV += `${section.name}\n${section.content}\n`;
  });

  function generateScreeningPrompt(
    interviewInstance: any,
    cvData: any,
    globalSettings: any
  ) {
    if (!interviewInstance) {
      console.error("Error: interviewInstance parameter is missing");
      return "";
    }

    if (!cvData) {
      console.error("Error: cvData parameter is missing");
      return "";
    }

    if (!globalSettings) {
      console.error("Error: globalSettings parameter is missing");
      return "";
    }

    let promptText = `
    You are a helpful AI assistant. 
  You are given a candidate's CV and a job description.
  You need to screen the candidate's CV and determine if they are a good fit for the job.

  Job Details:
  Job Title: 
  ${interviewInstance.jobTitle}
  Job Description: 
  ${interviewInstance.description}

  Applicant CV information:
  Applicant Name: ${interviewInstance.name}

  Applicant CV:
  ${parsedCV}

  ${preAnswers.length ? `Pre-screening Answers Provided by Applicant:\n${preAnswers.map((a:any, i:number)=> `${i+1}. ${a.question}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`).join('\n')}` : ''}

  Processing Steps: 
  ${cvScreeningPromptText}
  - format your response as json: 
  {
    "result": <Result (No Fit / Bad Fit / Good Fit / Strong Fit / Ineligible CV / Insufficient Data)>,
    "reason": <Reason>,
    "confidence": <AI Assessment Confidence (0-100)>
    "jobFitScore": <Overall Score (0-100)>
  } 
  - return only the code JSON, nothing else.
  - carefully analyze the applicant's CV and job description
  - be as accurate as possible
  - give a detailed reason for the result, be clear, concise, and specific.
  - set result to Ineligible CV if the applicant's CV is not in the correct format.
  - set result to Insufficient Data if the applicant's CV is missing important information.
  - do not include any other text or comments.
  `;

    return promptText;
  }

  let screeningPrompt = generateScreeningPrompt(
    interviewData,
    parsedCV,
    cvScreeningPromptText
  );

  // console.log(screeningPrompt);

  async function runWithGemini(prompt: string) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(geminiKey);
    const candidateModels = [
      process.env.GEMINI_MODEL || "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];
    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          result: { type: "string" },
          reason: { type: "string" },
          confidence: { type: "number" },
          jobFitScore: { type: "number" },
        },
        required: ["result", "reason", "confidence", "jobFitScore"],
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
        return JSON.parse(resp.response.text());
      } catch (e: any) {
        lastErr = e;
        if (
          typeof e?.message === "string" &&
          (e.message.includes("404") ||
            e.message.includes("not found") ||
            e.message.includes("not supported"))
        ) {
          continue;
        }
        break;
      }
    }
    throw lastErr || new Error("Gemini generation failed");
  }

  let result: any = null;
  try {
    const completion = await openai.responses.create({
      model: "o4-mini",
      reasoning: { effort: "high" },
      input: [
        {
          role: "user",
          content: screeningPrompt,
        },
      ],
    });

    let out: any = completion.output_text;
    try {
      out = out.replace("```json", "").replace("```", "");
      result = JSON.parse(out);
    } catch (parseErr) {
      result = await runWithGemini(screeningPrompt);
    }
  } catch (err) {
    result = await runWithGemini(screeningPrompt);
  }

  let screeningData: any = {
    cvStatus: result.result,
    stateClass: "state-accepted",
    cvSettingResult: null,
    cvScreeningReason: result.reason,
    currentStep: "CV Screening",
    confidence: result.confidence,
    jobFitScore: result.jobFitScore,
  };

  if (result.result === "No Fit" || result.result === "Bad Fit") {
    screeningData.stateClass = "state-rejected";
    screeningData.cvSettingResult = "Failed";
  }

  // manage state class
  if (result.result === "Good Fit") {
    screeningData.stateClass = "state-good";
    screeningData.cvSettingResult = "Passed";
  }

  if (result.result === "Strong Fit") {
    screeningData.stateClass = "state-accepted";
    screeningData.cvSettingResult = "Passed";
  }

  if (
    result.result === "Ineligible CV" ||
    result.result === "Insufficient Data"
  ) {
    screeningData.stateClass = "state-rejected";
    screeningData.cvSettingResult = "Failed";
  }

  // check screening setting
  if (interviewData.screeningSetting) {
    if (interviewData.screeningSetting === "Only Strong Fit") {
      if (result.result === "Strong Fit") {
        screeningData.stateClass = "state-accepted";
        screeningData.cvSettingResult = "Passed";
        screeningData.currentStep = "AI Interview";
        screeningData.status = "For Interview";
      } else {
        screeningData.stateClass = "state-rejected";
        screeningData.cvSettingResult = "Failed";
        screeningData.status = "Failed CV Screening";
      }
    }

    if (interviewData.screeningSetting === "Good Fit and above") {
      if (result.result === "Good Fit" || result.result === "Strong Fit") {
        screeningData.stateClass = "state-accepted";
        screeningData.cvSettingResult = "Passed";
        screeningData.currentStep = "AI Interview";
        screeningData.status = "For Interview";
      } else {
        screeningData.stateClass = "state-rejected";
        screeningData.cvSettingResult = "Failed";
        screeningData.status = "Failed CV Screening";
      }
    }
  }

  if (!testMode) {
    await db
      .collection("interviews")
      .updateOne({ interviewID: interviewID }, { $set: screeningData });
  }

  if (testMode) {
    screeningData.testMode = true;
  }

  // await sendEmail({
  //   recipient: userEmail,
  //   html: `
  //     <div>
  //       <p>Dear ${interviewData.name},</p>
  //       <p>Your CV has been successfully screened.</p>
  //     </div>
  //   `,
  // });

  return NextResponse.json(screeningData);
}
