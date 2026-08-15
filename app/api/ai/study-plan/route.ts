// app/api/ai/study-plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateStudyPlan } from "@/services/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { examDate, subjects, preparationLevel, dailyHours } = body;

    if (!examDate || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { success: false, error: "Exam date and at least one subject are required to generate a study plan." },
        { status: 400 }
      );
    }

    // RUN STUDY PLANNER (Powered by Groq)
    const result = await generateStudyPlan({
      examDate,
      subjects: subjects.filter(Boolean),
      preparationLevel: preparationLevel || "intermediate",
      dailyHours: Number(dailyHours) || 4,
    });

    return NextResponse.json({
      success: true,
      overview: result.overview,
      dailyPlan: result.dailyPlan,
      weeklyGoals: result.weeklyGoals,
      tips: result.tips,
      data: result,
    });
  } catch (error) {
    console.error("Study plan API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate study plan";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
