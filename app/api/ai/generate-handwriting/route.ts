// app/api/ai/generate-handwriting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateHandwrittenHTML } from "@/services/handwriting";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, answer, studentName, subject, inkColor } = body;
    
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

    if (!question || !answer) {
      return NextResponse.json(
        { success: false, error: "Question and answer content are required for handwritten rendering." },
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

    // 2. RUN HANDWRITING GENERATION
    const html = generateHandwrittenHTML(
      answer,
      studentName || "Student",
      subject || "Assignment",
      question,
      { inkColor: inkColor || "#1a3a6b" }
    );

    // Ensure handwriting HTML is valid before consuming usage quota
    if (!html || typeof html !== "string" || html.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to generate handwriting rendering. Please try again." },
        { status: 500 }
      );
    }

    // 3. ATOMICALLY INCREMENT USAGE ONLY AFTER SUCCESSFUL RENDERING
    let usageInfo = null;
    if (uid && uid !== "anonymous") {
      usageInfo = await incrementServerDailyUsage(uid, "chat");
    }

    return NextResponse.json({
      success: true,
      html,
      data: { html },
      usage: usageInfo
        ? {
            current: usageInfo.chatCount,
            limit: usageInfo.maxChat,
            remaining: usageInfo.chatRemaining,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Handwriting generation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Handwriting generation failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
