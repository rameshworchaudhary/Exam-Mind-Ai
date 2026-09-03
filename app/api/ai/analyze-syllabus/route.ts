// app/api/ai/analyze-syllabus/route.ts
import { NextRequest, NextResponse } from "next/server";
import { analyzeSyllabus } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";
import { extractTextFromPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let text = "";
    let subject = "General";

    // 1. JSON REQUEST
    if (contentType.includes("application/json")) {
      const body = await req.json();
      text = body?.text || "";
      subject = body?.subject || "General";

      if (text.includes("%PDF") && text.length > 50) {
        try {
          const pdfIndex = text.indexOf("%PDF");
          const buffer = Buffer.from(text.slice(pdfIndex), "latin1");
          const extracted = await extractTextFromPdf(buffer);
          if (extracted && extracted.trim().length > 10) {
            text = extracted;
          }
        } catch {}
      }
    }
    // 2. FORM DATA REQUEST (PDF or TXT upload)
    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      subject = (formData.get("subject") as string) || "General";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file was uploaded. Please attach a syllabus file." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf") ||
        buffer.subarray(0, 16).toString("latin1").includes("%PDF");

      if (isPdf) {
        try {
          text = await extractTextFromPdf(buffer);
        } catch (pdfError) {
          console.error("PDF parsing error in analyze-syllabus:", pdfError);
          return NextResponse.json(
            {
              success: false,
              error: "Failed to extract text from PDF. Please ensure the file is not corrupted.",
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

    // Clean leading BOM or unprintable null bytes
    text = text.replace(/^\uFEFF/, "").replace(/\0/g, "").replace(/\r\n/g, "\n").trim();

    // Strictly authenticate using Firebase Bearer ID Token
    const uid = await getVerifiedUid(req);
    if (!uid) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please sign in to analyze your syllabus." },
        { status: 401 }
      );
    }

    // 3. CHECK DAILY USAGE LIMIT (5 PDF/Syllabus analyses per day)
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

    // 4. VALIDATE EXTRACTED TEXT
    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "No readable syllabus text found in document. Please ensure the file contains selectable text.",
        },
        { status: 400 }
      );
    }

    // 5. RUN AI ANALYSIS (PRIMARY: NVIDIA Nemotron -> FALLBACK: Groq)
    const result = await analyzeSyllabus(text.slice(0, 6000), subject);

    // Ensure AI result is valid before consuming usage quota
    if (!result || !result.units || !Array.isArray(result.units) || result.units.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to parse and structure syllabus topics. Please try again." },
        { status: 500 }
      );
    }

    // 6. ATOMICALLY INCREMENT USAGE ONLY AFTER SUCCESSFUL AI RESPONSE
    const usageInfo = await incrementServerDailyUsage(uid, "pdf");

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
    const rawMsg = error instanceof Error ? error.message : "Failed to analyze syllabus";
    const isRateLimit =
      rawMsg.toLowerCase().includes("rate limit") ||
      rawMsg.toLowerCase().includes("tokens per day") ||
      rawMsg.toLowerCase().includes("429");
    const errorMessage = isRateLimit
      ? "AI service is temporarily busy with high request volume. Please try again in a moment."
      : rawMsg;

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
