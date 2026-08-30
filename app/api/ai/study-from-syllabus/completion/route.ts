// app/api/ai/study-from-syllabus/completion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateSyllabusCompletion } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, units, language = "english" } = body;
    const uid = await getVerifiedUid(req, body.uid);

    if (!subject || !Array.isArray(units) || units.length === 0) {
      return NextResponse.json(
        { success: false, error: "Subject and units array are required for syllabus completion." },
        { status: 400 }
      );
    }

    // 1. Check daily AI chat/lesson usage limit
    if (uid) {
      const limitCheck = await checkServerDailyUsage(uid, "chat");
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Daily limit reached! You have reached your limit of ${limitCheck.limit} AI requests for today. Please try again tomorrow.`,
            limitReached: true,
            current: limitCheck.current,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
          },
          { status: 429 }
        );
      }
    }

    // 2. Run Completion Generator AI
    const completion = await generateSyllabusCompletion({
      subject,
      units,
      language: language === "hinglish" ? "hinglish" : "english",
    });

    if (!completion || !completion.overallRevision) {
      return NextResponse.json(
        { success: false, error: "Failed to generate syllabus completion package." },
        { status: 500 }
      );
    }

    // 3. Atomically increment usage only after successful AI response
    let usageInfo = null;
    if (uid) {
      usageInfo = await incrementServerDailyUsage(uid, "chat");
    }

    return NextResponse.json({
      success: true,
      data: completion,
      usage: usageInfo
        ? {
            current: usageInfo.chatCount,
            limit: usageInfo.maxChat,
            remaining: usageInfo.chatRemaining,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Syllabus completion API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate syllabus completion";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
