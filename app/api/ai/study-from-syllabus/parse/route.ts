// app/api/ai/study-from-syllabus/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { extractDetailedStudySyllabus } from "@/services/ai";
import { checkServerDailyUsage, incrementServerDailyUsage, getVerifiedUid } from "@/services/usage";
import pdfParse from "pdf-parse";
import zlib from "zlib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Decodes standard PDF literal escape sequences: \n, \r, \t, \f, \b, \(, \), \\ and octal \ddd
 */
function cleanPdfLiteralString(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\f/g, "\f")
    .replace(/\\b/g, "\b")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

/**
 * Decodes PDF hex-encoded strings e.g. <48656c6c6f> or UTF-16BE <FEFF...>
 */
function decodePdfHexString(hex: string): string {
  try {
    const cleanHex = hex.replace(/\s+/g, "");
    if (cleanHex.length % 2 !== 0) return "";
    const buf = Buffer.from(cleanHex, "hex");
    if (cleanHex.toLowerCase().startsWith("feff")) {
      return buf.swap16().toString("utf16le").slice(1);
    }
    return buf.toString("utf-8");
  } catch {
    return "";
  }
}

/**
 * Robust stream-level PostScript text extractor for PDFs when standard xref parsing fails
 */
function extractTextFromPdfStreams(buffer: Buffer): string {
  let fullText = "";
  const content = buffer.toString("latin1");
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(content)) !== null) {
    const rawStream = Buffer.from(match[1], "latin1");
    let decompressed = "";
    try {
      decompressed = zlib.inflateSync(rawStream).toString("latin1");
    } catch {
      try {
        decompressed = zlib.inflateRawSync(rawStream).toString("latin1");
      } catch {
        decompressed = rawStream.toString("latin1");
      }
    }

    if (
      decompressed &&
      (decompressed.includes("BT") || decompressed.includes("Tj") || decompressed.includes("TJ"))
    ) {
      const btBlocks = decompressed.match(/BT[\s\S]*?ET/g) || [decompressed];
      for (const block of btBlocks) {
        // 1. Literal strings: (text) Tj or ' or "
        const tjRegex = /\(((?:[^\\)]|\\.)*)\)\s*(?:Tj|'|")/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          fullText += cleanPdfLiteralString(tjMatch[1]) + "\n";
        }

        // 2. Hex strings: <48656c6c6f> Tj
        const hexRegex = /<([0-9a-fA-F\s]+)>\s*(?:Tj|'|")/g;
        let hexMatch: RegExpExecArray | null;
        while ((hexMatch = hexRegex.exec(block)) !== null) {
          fullText += decodePdfHexString(hexMatch[1]) + "\n";
        }

        // 3. Array of strings: [ (str1) 12 (str2) <hex> ] TJ
        const arrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
        let arrayMatch: RegExpExecArray | null;
        while ((arrayMatch = arrayRegex.exec(block)) !== null) {
          let line = "";
          const partRegex = /(?:\(((?:[^\\)]|\\.)*)\)|<([0-9a-fA-F\s]+)>)/g;
          let partMatch: RegExpExecArray | null;
          while ((partMatch = partRegex.exec(arrayMatch[1])) !== null) {
            if (partMatch[1] !== undefined) {
              line += cleanPdfLiteralString(partMatch[1]) + " ";
            } else if (partMatch[2] !== undefined) {
              line += decodePdfHexString(partMatch[2]) + " ";
            }
          }
          if (line.trim()) {
            fullText += line.trim() + "\n";
          }
        }
      }
    }
  }
  return fullText;
}

/**
 * Extracts normalized text from a PDF buffer using multiple resilient strategies
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  let text = "";

  // Strategy 1: Standard pdf-parse
  try {
    const pdfData = await pdfParse(buffer);
    if (pdfData?.text && pdfData.text.trim().length > 10) {
      text = pdfData.text;
    }
  } catch (parseErr) {
    console.warn("pdfParse failed, falling back to stream extractor:", parseErr);
  }

  // Strategy 2: Direct PostScript stream extraction (handles bad XRef, modern jsPDF, stream objects)
  if (!text || text.trim().length < 10) {
    const streamExtracted = extractTextFromPdfStreams(buffer);
    if (streamExtracted && streamExtracted.trim().length > 10) {
      text = streamExtracted;
    }
  }

  // Strategy 3: Raw text scan if buffer contains uncompressed text
  if (!text || text.trim().length < 10) {
    const rawString = buffer.toString("utf-8");
    if (!rawString.startsWith("%PDF") && rawString.trim().length > 10) {
      text = rawString;
    }
  }

  // Normalize extracted text without destroying syllabus line structure
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let text = "";
    let subject = "General";
    let uid = "";

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
      uid = body?.uid || "";
    }
    // 2. Form Data Request (PDF / TXT File Upload)
    else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      subject = (formData.get("subject") as string) || "General";
      uid = (formData.get("uid") as string) || "";

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
        buffer.slice(0, 4).toString() === "%PDF";

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
        // Plain text file
        text = buffer
          .toString("utf-8")
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

    const verifiedUid = await getVerifiedUid(req, uid || undefined);
    uid = verifiedUid || uid;

    // Check daily usage quota (shares PDF/syllabus quota)
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

    // Run AI structured extraction
    const parsedSyllabus = await extractDetailedStudySyllabus(text.slice(0, 10000), subject);

    if (!parsedSyllabus || !parsedSyllabus.units || parsedSyllabus.units.length === 0) {
      return NextResponse.json(
        { success: false, error: "Unable to identify units and topics in the uploaded syllabus. Please verify the document format." },
        { status: 500 }
      );
    }

    // Increment usage quota ONLY upon success
    let usageInfo = null;
    if (uid) {
      usageInfo = await incrementServerDailyUsage(uid, "pdf");
    }

    return NextResponse.json({
      success: true,
      data: parsedSyllabus,
      rawTextSample: text.slice(0, 500),
      usage: usageInfo,
    });
  } catch (error) {
    console.error("Study syllabus parse API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to parse syllabus";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
