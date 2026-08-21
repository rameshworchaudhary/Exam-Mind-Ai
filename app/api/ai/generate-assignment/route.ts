// app/api/ai/generate-assignment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateAssignmentAnswer } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, subject } = body;
    const uid = await getVerifiedUid(req, body.uid);

    if (!question || !subject) {
      return NextResponse.json(
        { success: false, error: "Question and subject are required to generate an assignment answer." },
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

    // 2. RUN AI ASSIGNMENT GENERATOR (Powered by Groq)
    const result = await generateAssignmentAnswer(question, subject);

    // Ensure AI response is valid before consuming usage quota
    if (!result || !result.answer || result.answer.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to generate assignment answer. Please try again." },
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
      answer: result.answer,
      wordCount: result.wordCount,
      sections: result.sections,
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
    console.error("Generate assignment API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate assignment answer";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

