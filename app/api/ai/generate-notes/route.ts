// app/api/ai/generate-notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateNotes } from "@/services/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic, noteType } = body;

    if (!subject || !topic) {
      return NextResponse.json(
        { success: false, error: "Subject and topic are required to generate notes." },
        { status: 400 }
      );
    }

    // RUN AI NOTES GENERATOR (Powered by Groq)
    const result = await generateNotes(topic, subject, noteType || "short");

    return NextResponse.json({
      success: true,
      title: result.title,
      content: result.content,
      keyPoints: result.keyPoints,
      formulas: result.formulas,
      definitions: result.definitions,
      data: result,
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
