// app/api/ai/viva-questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateVivaQuestions } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic } = body;
    const uid = await getVerifiedUid(req, body.uid);

    if (!subject || !topic) {
      return NextResponse.json(
        { success: false, error: "Subject and topic are required to generate viva questions." },
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
            questions: [],
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

    // 2. RUN VIVA QUESTIONS GENERATOR (Powered by Groq)
    const result = await generateVivaQuestions(subject, topic);

    // Ensure AI response is valid before consuming usage quota
    if (!result || !result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to generate viva questions. Please try again." },
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
      questions: result.questions,
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
    console.error("Viva question API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate viva questions";
    return NextResponse.json(
      { success: false, questions: [], error: errorMessage },
      { status: 500 }
    );
  }
}

