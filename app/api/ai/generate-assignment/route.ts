// app/api/ai/generate-assignment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateAssignmentAnswer } from "@/services/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, subject } = body;

    if (!question || !subject) {
      return NextResponse.json(
        { success: false, error: "Question and subject are required to generate an assignment answer." },
        { status: 400 }
      );
    }

    // RUN AI ASSIGNMENT GENERATOR (Powered by Groq)
    const result = await generateAssignmentAnswer(question, subject);

    return NextResponse.json({
      success: true,
      answer: result.answer,
      wordCount: result.wordCount,
      sections: result.sections,
      data: result,
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
