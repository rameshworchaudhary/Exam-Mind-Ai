// app/api/ai/study-from-syllabus/teach-topic/route.ts
import { NextRequest, NextResponse } from "next/server";
import { teachSyllabusTopic } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subject,
      unitTitle,
      topicTitle,
      subtopics,
      language = "english",
      syllabusSummary,
    } = body;

    const uid = await getVerifiedUid(req, body.uid);

    if (!topicTitle || !unitTitle || !subject) {
      return NextResponse.json(
        { success: false, error: "Subject, unit title, and topic title are required." },
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
            error: `Daily limit reached! You have reached your limit of ${limitCheck.limit} AI lessons for today. Please try again tomorrow.`,
            limitReached: true,
            current: limitCheck.current,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
          },
          { status: 429 }
        );
      }
    }

    // 2. Run Topic Teacher AI
    const lesson = await teachSyllabusTopic({
      subject,
      unitTitle,
      topicTitle,
      subtopics: Array.isArray(subtopics) ? subtopics : [],
      language: language === "hinglish" ? "hinglish" : "english",
      syllabusSummary,
    });

    if (!lesson || !lesson.simpleExplanation) {
      return NextResponse.json(
        { success: false, error: "Failed to generate topic lesson. Please try again." },
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
      data: lesson,
      usage: usageInfo
        ? {
            current: usageInfo.chatCount,
            limit: usageInfo.maxChat,
            remaining: usageInfo.chatRemaining,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Teach topic API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to teach syllabus topic";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
