// app/api/ai/study-from-syllabus/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractDetailedStudySyllabus } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";
import { extractTextFromPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let text = "";
    let subject = "General";

    // 1. JSON Request
    if (contentType.includes("application/json")) {
      const body = await req.json();
      text = (body?.text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u0000/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim();
      subject = body?.subject || "General";

      if (text.startsWith("%PDF")) {
        try {
          const buffer = Buffer.from(text, "latin1");
          const extracted = await extractTextFromPdf(buffer);
          if (extracted && extracted.trim().length > 10) {
            text = extracted;
          }
        } catch {}
      }
    }
    // 2. Form Data Request (PDF / TXT File Upload)
    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      subject = (formData.get("subject") as string) || "General";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No syllabus file was provided. Please upload a PDF or text file." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const isPdf =
        file.type === "application/pdf" ||
        file.type.includes("pdf") ||
        file.name.toLowerCase().endsWith(".pdf") ||
        buffer.subarray(0, 8).toString("latin1").includes("%PDF");

      if (isPdf) {
        try {
          text = await extractTextFromPdf(buffer);
        } catch (pdfErr) {
          console.error("PDF parsing error in study-from-syllabus:", pdfErr);
          return NextResponse.json(
            {
              success: false,
              error: "Failed to read text from syllabus PDF. Please ensure the file is not corrupted.",
            },
            { status: 400 }
          );
        }
      } else {
        // Plain text file (strips UTF-8 BOM if present)
        text = buffer
          .toString("utf-8")
          .replace(/^\uFEFF/, "")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/\u0000/g, "")
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
          .replace(/[ \t]+/g, " ")
          .trim();
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported content type. Expected application/json or multipart/form-data." },
        { status: 400 }
      );
    }

    // Strictly authenticate using Firebase Bearer ID Token
    const uid = await getVerifiedUid(req);
    if (!uid) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please sign in to parse your syllabus." },
        { status: 401 }
      );
    }

    // Check daily usage quota (shares PDF/syllabus quota)
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

    if (!text || text.trim().length < 15) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No readable syllabus text found in file. This PDF may be a scanned image or non-selectable file. Please ensure the syllabus contains selectable text.",
        },
        { status: 400 }
      );
    }

    // Run AI structured extraction (PRIMARY: NVIDIA Nemotron -> FALLBACK: Groq -> Deterministic parser fallback)
    const parsedSyllabus = await extractDetailedStudySyllabus(text.slice(0, 10000), subject);

    if (!parsedSyllabus || !parsedSyllabus.units || parsedSyllabus.units.length === 0) {
      return NextResponse.json(
        { success: false, error: "Unable to identify units and topics in the uploaded syllabus. Please verify the document format." },
        { status: 500 }
      );
    }

    // Increment usage quota ONLY upon success
    const usageInfo = await incrementServerDailyUsage(uid, "pdf");

    return NextResponse.json({
      success: true,
      data: parsedSyllabus,
      rawTextSample: text.slice(0, 500),
      usage: usageInfo,
    });
  } catch (error) {
    console.error("Study syllabus parse API error:", error);
    const rawMsg = error instanceof Error ? error.message : "Failed to parse syllabus";
    const isRateLimit =
      rawMsg.toLowerCase().includes("rate limit") ||
      rawMsg.toLowerCase().includes("tokens per day") ||
      rawMsg.toLowerCase().includes("429");
    const errorMessage = isRateLimit
      ? "AI service is temporarily busy with high request volume. Please try again in a moment."
      : rawMsg;

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
