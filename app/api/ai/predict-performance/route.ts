// app/api/ai/predict-performance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { predictPerformance } from "@/services/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      attendance,
      internalMarks,
      studyHours,
      syllabusCompletion,
      subjects,
    } = body;

    const validSubjects = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
    if (validSubjects.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please provide at least one subject to predict performance." },
        { status: 400 }
      );
    }

    // RUN PERFORMANCE PREDICTOR (Powered by Groq)
    const result = await predictPerformance({
      attendance: Number(attendance) || 75,
      internalMarks: Number(internalMarks) || 70,
      studyHours: Number(studyHours) || 4,
      syllabusCompletion: Number(syllabusCompletion) || 60,
      subjects: validSubjects,
    });

    return NextResponse.json({
      success: true,
      passProbability: result.passProbability,
      predictedMarks: result.predictedMarks,
      grade: result.grade,
      weakSubjects: result.weakSubjects,
      strengths: result.strengths,
      recommendations: result.recommendations,
      breakdown: result.breakdown,
      data: result,
    });
  } catch (error) {
    console.error("Performance prediction API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Performance prediction failed";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
