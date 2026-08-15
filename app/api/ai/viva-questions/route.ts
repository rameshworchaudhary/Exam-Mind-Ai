// app/api/ai/viva-questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateVivaQuestions } from "@/services/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subject, topic } = body;

    if (!subject || !topic) {
      return NextResponse.json(
        { success: false, error: "Subject and topic are required to generate viva questions." },
        { status: 400 }
      );
    }

    // RUN VIVA QUESTIONS GENERATOR (Powered by Groq)
    const result = await generateVivaQuestions(subject, topic);

    return NextResponse.json({
      success: true,
      questions: result.questions,
      data: result,
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
