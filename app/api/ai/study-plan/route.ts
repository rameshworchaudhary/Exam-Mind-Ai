// app/api/ai/study-plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateStudyPlan } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examDate, subjects, preparationLevel, dailyHours } = body;
    const uid = await getVerifiedUid(req, body.uid);

    if (!examDate || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { success: false, error: "Exam date and at least one subject are required to generate a study plan." },
        { status: 400 }
      );
    }

    // 1. CHECK DAILY USAGE LIMIT (35 AI uses per day)
    if (uid) {
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

    // 2. RUN STUDY PLANNER (Powered by Groq)
    const result = await generateStudyPlan({
      examDate,
      subjects: subjects.filter(Boolean),
      preparationLevel: preparationLevel || "intermediate",
      dailyHours: Number(dailyHours) || 4,
    });

    // Ensure AI response is valid before consuming usage quota
    if (!result || !result.dailyPlan || !Array.isArray(result.dailyPlan) || result.dailyPlan.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to generate comprehensive study plan. Please try again." },
        { status: 500 }
      );
    }

    // 3. ATOMICALLY INCREMENT USAGE ONLY AFTER SUCCESSFUL AI RESPONSE
    let usageInfo = null;
    if (uid) {
      usageInfo = await incrementServerDailyUsage(uid, "chat");
    }

    return NextResponse.json({
      success: true,
      overview: result.overview,
      dailyPlan: result.dailyPlan,
      weeklyGoals: result.weeklyGoals,
      tips: result.tips,
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
    console.error("Study plan API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate study plan";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

