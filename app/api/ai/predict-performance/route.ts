// app/api/ai/predict-performance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { predictPerformance } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      attendance,
      internalMarks,
      studyHours,
      syllabusCompletion,
      subjects,
    } = body;
    
    let uid: string | null = null;
    try {
      uid = await getVerifiedUid(req, body.uid);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Authentication error";
      const status = message.includes("UID_MISMATCH") ? 403 : 401;
      return NextResponse.json(
        { success: false, error: message },
        { status }
      );
    }

    const validSubjects = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
    if (validSubjects.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please provide at least one subject to predict performance." },
        { status: 400 }
      );
    }

    // 1. CHECK DAILY USAGE LIMIT (35 AI uses per day)
    if (uid && uid !== "anonymous") {
      const limitCheck = await checkServerDailyUsage(uid, "chat");
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Daily limit reached! You have reached your limit of ${limitCheck.limit} AI uses for today. Please try again tomorrow.`,
            limitReached: true,
            current: limitCheck.current,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
          },
          { status: 429 }
        );
      }
    }

    // 2. RUN PERFORMANCE PREDICTOR (Powered by Groq)
    const result = await predictPerformance({
      attendance: Number(attendance) || 75,
      internalMarks: Number(internalMarks) || 70,
      studyHours: Number(studyHours) || 4,
      syllabusCompletion: Number(syllabusCompletion) || 60,
      subjects: validSubjects,
    });

    // Ensure AI response is valid before consuming usage quota
    if (!result || typeof result.predictedMarks !== "number" || typeof result.passProbability !== "number") {
      return NextResponse.json(
        { success: false, error: "Failed to generate performance prediction. Please try again." },
        { status: 500 }
      );
    }

    // 3. ATOMICALLY INCREMENT USAGE ONLY AFTER SUCCESSFUL AI RESPONSE
    let usageInfo = null;
    if (uid && uid !== "anonymous") {
      usageInfo = await incrementServerDailyUsage(uid, "chat");
    }

    return NextResponse.json({
      success: true,
      passProbability: result.passProbability,
      predictedMarks: result.predictedMarks,
      grade: result.grade,
      weakSubjects: result.weakSubjects,
      strengths: result.strengths,
      recommendations: result.recommendations,
      breakdown: result.breakdown,
      data: result,
      usage: usageInfo
        ? {
            current: usageInfo.chatCount,
            limit: usageInfo.maxChat,
            remaining: usageInfo.chatRemaining,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Performance prediction API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Performance prediction failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
