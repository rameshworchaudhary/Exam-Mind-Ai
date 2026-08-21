// app/api/ai/generate-notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateNotes } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic, noteType } = body;
    const uid = await getVerifiedUid(req, body.uid);

    if (!subject || !topic) {
      return NextResponse.json(
        { success: false, error: "Subject and topic are required to generate notes." },
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

    // 2. RUN AI NOTES GENERATOR (Powered by Groq)
    const result = await generateNotes(topic, subject, noteType || "short");

    // Ensure AI response is valid before consuming usage quota
    if (!result || !result.content || result.content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to generate comprehensive notes. Please try again." },
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
      title: result.title,
      content: result.content,
      keyPoints: result.keyPoints,
      formulas: result.formulas,
      definitions: result.definitions,
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
    console.error("Generate notes API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate notes";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

