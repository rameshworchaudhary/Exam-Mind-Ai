// app/api/ai/generate-handwriting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateHandwrittenHTML } from "@/services/handwriting";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, answer, studentName, subject, inkColor } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { success: false, error: "Question and answer content are required for handwritten rendering." },
        { status: 400 }
      );
    }

    const html = generateHandwrittenHTML(
      answer,
      studentName || "Student",
      subject || "Assignment",
      question,
      { inkColor: inkColor || "#1a3a6b" }
    );

    return NextResponse.json({
      success: true,
      html,
      data: { html },
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
