// app/api/ai/analyze-syllabus/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeSyllabus } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let text = "";
    let subject = "General";
    let uid = "";

    // 1. JSON REQUEST
    if (contentType.includes("application/json")) {
      const body = await req.json();
      text = body?.text || "";
      subject = body?.subject || "General";
      uid = body?.uid || "";
    }
    // 2. FORM DATA REQUEST (PDF or TXT upload)
    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      subject = (formData.get("subject") as string) || "General";
      uid = (formData.get("uid") as string) || "";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file was uploaded. Please attach a syllabus file." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        try {
          const pdfData = await pdfParse(buffer);
          text = pdfData?.text || "";

          const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
          const ratio = text.length > 0 ? nonAscii / text.length : 1;

          if (
            ratio > 0.45 ||
            (text.trim().length < 25 && (text.startsWith("%PDF") || text.includes("endobj")))
          ) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "This PDF appears to be an image-only scan or corrupted. Please upload a searchable/selectable text PDF or .txt file.",
              },
              { status: 400 }
            );
          }
        } catch (pdfError) {
          console.error("PDF parsing error in analyze-syllabus:", pdfError);
          return NextResponse.json(
            {
              success: false,
              error: "Failed to extract text from PDF. Please upload a valid text PDF or .txt file.",
            },
            { status: 400 }
          );
        }
      } else {
        text = buffer.toString("utf-8");
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported content type. Expected application/json or multipart/form-data." },
        { status: 400 }
      );
    }

    const verifiedUid = await getVerifiedUid(req, uid || undefined);
    uid = verifiedUid || uid;

    // 3. CHECK DAILY USAGE LIMIT (5 PDF/Syllabus analyses per day)
    if (uid) {
      const limitCheck = await checkServerDailyUsage(uid, "pdf");
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Daily limit reached! You have used all ${limitCheck.limit} PDF/Syllabus analysis uploads for today. Please try again tomorrow.`,
            limitReached: true,
            current: limitCheck.current,
            limit: limitCheck.limit,
            remaining: limitCheck.remaining,
          },
          { status: 429 }
        );
      }
    }

    // 4. VALIDATE EXTRACTED TEXT
    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "No readable syllabus text found. Please provide syllabus content." },
        { status: 400 }
      );
    }

    // 5. RUN AI ANALYSIS (Powered by NVIDIA Nemotron)
    const result = await analyzeSyllabus(text.slice(0, 5000), subject);

    // Ensure AI result is valid before consuming usage quota
    if (!result || !result.units || !Array.isArray(result.units) || result.units.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to parse and structure syllabus topics. Please try again." },
        { status: 500 }
      );
    }

    // 6. ATOMICALLY INCREMENT USAGE ONLY AFTER SUCCESSFUL AI RESPONSE
    let usageInfo = null;
    if (uid) {
      usageInfo = await incrementServerDailyUsage(uid, "pdf");
    }

    return NextResponse.json({
      success: true,
      units: result.units,
      summary: result.summary,
      importantTopics: result.importantTopics,
      totalTopics: result.totalTopics,
      data: result,
      usage: usageInfo,
    });
  } catch (error) {
    console.error("Syllabus analysis API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to analyze syllabus";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
