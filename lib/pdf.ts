// lib/pdf.ts
import pdfParse from "pdf-parse";
import zlib from "zlib";

// Standard Adobe Glyph List mapping for PDF /Differences decoding
const ADOBE_GLYPH_LIST: Record<string, string> = {
  space: " ", exclam: "!", quotedbl: "\"", numbersign: "#", dollar: "$", percent: "%",
  ampersand: "&", quotesingle: "'", parenleft: "(", parenright: ")", asterisk: "*",
  plus: "+", comma: ",", hyphen: "-", period: ".", slash: "/",
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  colon: ":", semicolon: ";", less: "<", equal: "=", greater: ">", question: "?", at: "@",
  A: "A", B: "B", C: "C", D: "D", E: "E", F: "F", G: "G", H: "H", I: "I", J: "J", K: "K", L: "L", M: "M",
  N: "N", O: "O", P: "P", Q: "Q", R: "R", S: "S", T: "T", U: "U", V: "V", W: "W", X: "X", Y: "Y", Z: "Z",
  bracketleft: "[", backslash: "\\", bracketright: "]", asciicircum: "^", underscore: "_", grave: "`",
  a: "a", b: "b", c: "c", d: "d", e: "e", f: "f", g: "g", h: "h", i: "i", j: "j", k: "k", l: "l", m: "m",
  n: "n", o: "o", p: "p", q: "q", r: "r", s: "s", t: "t", u: "u", v: "v", w: "w", x: "x", y: "y", z: "z",
  braceleft: "{", bar: "|", braceright: "}", asciitilde: "~",
  bullet: "•", endash: "–", emdash: "—", fi: "fi", fl: "fl", ff: "ff", ffi: "ffi", ffl: "ffl",
  quotedblleft: "\"", quotedblright: "\"", quoteleft: "'", quoteright: "'",
  minus: "-", multiply: "×", divide: "÷", degree: "°", copyright: "©", registered: "®", trademark: "™"
};

/**
 * Standard WinAnsiEncoding byte-to-char mapping for PDF single-byte strings
 */
const WIN_ANSI_MAP = new Map<number, string>();
for (let i = 32; i <= 126; i++) {
  WIN_ANSI_MAP.set(i, String.fromCharCode(i));
}
const WIN_ANSI_EXT: Record<number, number> = {
  130: 0x201A, 131: 0x0192, 132: 0x201E, 133: 0x2026, 134: 0x2020, 135: 0x2021,
  136: 0x02C6, 137: 0x2030, 138: 0x0160, 139: 0x2039, 140: 0x0152, 142: 0x017D,
  145: 0x2018, 146: 0x2019, 147: 0x201C, 148: 0x201D, 149: 0x2022, 150: 0x2013,
  151: 0x2014, 152: 0x02DC, 153: 0x2122, 154: 0x0161, 155: 0x203A, 156: 0x0153,
  158: 0x017E, 159: 0x0178
};
for (const [code, unicode] of Object.entries(WIN_ANSI_EXT)) {
  WIN_ANSI_MAP.set(Number(code), String.fromCharCode(unicode));
}
for (let i = 160; i <= 255; i++) {
  WIN_ANSI_MAP.set(i, String.fromCharCode(i));
}

export interface FontMapping {
  toUnicodeMap: Map<number, string>;
  differencesMap: Map<number, string>;
}

/**
 * Parses a ToUnicode CMap stream content into a character code -> Unicode string map
 */
export function parseToUnicodeCMap(cmapStr: string): Map<number, string> {
  const map = new Map<number, string>();

  const bfCharRegex = /(\d+)\s+beginbfchar([\s\S]*?)endbfchar/g;
  let bfCharMatch: RegExpExecArray | null;
  while ((bfCharMatch = bfCharRegex.exec(cmapStr)) !== null) {
    const block = bfCharMatch[2];
    const lineRegex = /<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>/g;
    let lineMatch: RegExpExecArray | null;
    while ((lineMatch = lineRegex.exec(block)) !== null) {
      const srcCode = parseInt(lineMatch[1], 16);
      const destHex = lineMatch[2];
      let destStr = "";
      for (let i = 0; i < destHex.length; i += 4) {
        const code = parseInt(destHex.slice(i, i + 4), 16);
        destStr += String.fromCharCode(code);
      }
      if (destStr) {
        map.set(srcCode, destStr);
      }
    }
  }

  const bfRangeRegex = /(\d+)\s+beginbfrange([\s\S]*?)endbfrange/g;
  let bfRangeMatch: RegExpExecArray | null;
  while ((bfRangeMatch = bfRangeRegex.exec(cmapStr)) !== null) {
    const block = bfRangeMatch[2];
    const lines = block.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const directMatch = line.match(/<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>/);
      if (directMatch) {
        const start = parseInt(directMatch[1], 16);
        const end = parseInt(directMatch[2], 16);
        let destStart = parseInt(directMatch[3], 16);
        for (let code = start; code <= end; code++) {
          map.set(code, String.fromCharCode(destStart++));
        }
        continue;
      }

      const arrayMatch = line.match(/<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/);
      if (arrayMatch) {
        const start = parseInt(arrayMatch[1], 16);
        const hexList = arrayMatch[3].match(/<([0-9a-fA-F]+)>/g) || [];
        let curr = start;
        for (const item of hexList) {
          const clean = item.replace(/[<>]/g, "");
          let destStr = "";
          for (let i = 0; i < clean.length; i += 4) {
            destStr += String.fromCharCode(parseInt(clean.slice(i, i + 4), 16));
          }
          if (destStr) {
            map.set(curr, destStr);
          }
          curr++;
        }
      }
    }
  }

  return map;
}

/**
 * Extracts font mappings (ToUnicode and Differences) from a PDF buffer
 */
export function extractFontMappings(pdfContent: string): Map<string, FontMapping> {
  const fontMap = new Map<string, FontMapping>();
  const objRegex = /(\d+\s+\d+\s+obj)([\s\S]*?)endobj/g;
  const objects = new Map<number, string>();
  let objMatch: RegExpExecArray | null;

  while ((objMatch = objRegex.exec(pdfContent)) !== null) {
    const num = parseInt(objMatch[1], 10);
    objects.set(num, objMatch[2]);
  }

  for (const [, body] of objects.entries()) {
    if (body.includes("/Type /Font") || body.includes("/Type/Font")) {
      const toUnicodeMatch = body.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
      let toUnicodeMap = new Map<number, string>();

      if (toUnicodeMatch) {
        const targetObjNum = parseInt(toUnicodeMatch[1], 10);
        const targetObj = objects.get(targetObjNum);
        if (targetObj) {
          const streamMatch = targetObj.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
          if (streamMatch) {
            let cmapText = "";
            try {
              cmapText = zlib.inflateSync(Buffer.from(streamMatch[1], "latin1")).toString("latin1");
            } catch {
              try {
                cmapText = zlib.inflateRawSync(Buffer.from(streamMatch[1], "latin1")).toString("latin1");
              } catch {
                cmapText = streamMatch[1];
              }
            }
            if (cmapText) {
              toUnicodeMap = parseToUnicodeCMap(cmapText);
            }
          }
        }
      }

      const differencesMap = new Map<number, string>();
      const diffMatch = body.match(/\/Differences\s*\[([\s\S]*?)\]/);
      if (diffMatch) {
        const tokens = diffMatch[1].trim().split(/\s+/);
        let currCode = 0;
        for (const token of tokens) {
          if (/^\d+$/.test(token)) {
            currCode = parseInt(token, 10);
          } else if (token.startsWith("/")) {
            const glyphName = token.slice(1);
            const char = ADOBE_GLYPH_LIST[glyphName] || glyphName;
            differencesMap.set(currCode, char);
            currCode++;
          }
        }
      }

      const fontNameMatch = body.match(/\/BaseFont\s*\/([^\s/>]+)/) || body.match(/\/Name\s*\/([^\s/>]+)/);
      const fontKey = fontNameMatch ? fontNameMatch[1] : `font_${fontMap.size}`;
      fontMap.set(fontKey, { toUnicodeMap, differencesMap });
    }
  }

  return fontMap;
}

/**
 * Decodes standard PDF literal escape sequences
 */
export function cleanPdfLiteralString(str: string): string {
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
 * Decodes string bytes using active font CMap or Differences map
 */
export function decodeStringWithFont(rawStr: string, activeFont?: FontMapping): string {
  if (!activeFont || (activeFont.toUnicodeMap.size === 0 && activeFont.differencesMap.size === 0)) {
    return rawStr;
  }

  let result = "";
  for (let i = 0; i < rawStr.length; i++) {
    const code = rawStr.charCodeAt(i);

    if (i + 1 < rawStr.length) {
      const code2 = (code << 8) | rawStr.charCodeAt(i + 1);
      if (activeFont.toUnicodeMap.has(code2)) {
        result += activeFont.toUnicodeMap.get(code2);
        i++;
        continue;
      }
    }

    if (activeFont.toUnicodeMap.has(code)) {
      result += activeFont.toUnicodeMap.get(code);
      continue;
    }

    if (activeFont.differencesMap.has(code)) {
      result += activeFont.differencesMap.get(code);
      continue;
    }

    result += WIN_ANSI_MAP.get(code) || rawStr[i];
  }

  return result;
}

/**
 * Decodes PDF hex-encoded strings with CMap support
 */
export function decodePdfHexString(hex: string, activeFont?: FontMapping): string {
  try {
    const cleanHex = hex.replace(/\s+/g, "");
    if (cleanHex.length % 2 !== 0) return "";

    if (activeFont && activeFont.toUnicodeMap.size > 0) {
      let decoded = "";
      if (cleanHex.length % 4 === 0) {
        let allFound = true;
        let temp = "";
        for (let i = 0; i < cleanHex.length; i += 4) {
          const code = parseInt(cleanHex.slice(i, i + 4), 16);
          if (activeFont.toUnicodeMap.has(code)) {
            temp += activeFont.toUnicodeMap.get(code);
          } else {
            allFound = false;
            break;
          }
        }
        if (allFound && temp.length > 0) return temp;
      }

      for (let i = 0; i < cleanHex.length; i += 2) {
        const code = parseInt(cleanHex.slice(i, i + 2), 16);
        if (activeFont.toUnicodeMap.has(code)) {
          decoded += activeFont.toUnicodeMap.get(code);
        } else if (activeFont.differencesMap.has(code)) {
          decoded += activeFont.differencesMap.get(code);
        } else {
          decoded += String.fromCharCode(code);
        }
      }
      return decoded;
    }

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
 * Robust stream-level PostScript text extractor for PDFs with font CMap & Differences decoding
 */
export function extractTextFromPdfStreams(buffer: Buffer): string {
  let fullText = "";
  const content = buffer.toString("latin1");
  const fontMappings = extractFontMappings(content);
  const defaultFont = fontMappings.values().next().value as FontMapping | undefined;

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
        let activeFont = defaultFont;
        const fontMatch = block.match(/\/([A-Za-z0-9_]+)\s+\d+(?:\.\d+)?\s+Tf/);
        if (fontMatch && fontMappings.has(fontMatch[1])) {
          activeFont = fontMappings.get(fontMatch[1]);
        }

        const tjRegex = /\(((?:[^\\)]|\\.)*)\)\s*(?:Tj|'|")/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          const raw = cleanPdfLiteralString(tjMatch[1]);
          const decoded = decodeStringWithFont(raw, activeFont);
          fullText += decoded + "\n";
        }

        const hexRegex = /<([0-9a-fA-F\s]+)>\s*(?:Tj|'|")/g;
        let hexMatch: RegExpExecArray | null;
        while ((hexMatch = hexRegex.exec(block)) !== null) {
          const decoded = decodePdfHexString(hexMatch[1], activeFont);
          fullText += decoded + "\n";
        }

        const arrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
        let arrayMatch: RegExpExecArray | null;
        while ((arrayMatch = arrayRegex.exec(block)) !== null) {
          let line = "";
          const partRegex = /(?:\(((?:[^\\)]|\\.)*)\)|<([0-9a-fA-F\s]+)>|(-?\d+(?:\.\d+)?))/g;
          let partMatch: RegExpExecArray | null;
          while ((partMatch = partRegex.exec(arrayMatch[1])) !== null) {
            if (partMatch[1] !== undefined) {
              const raw = cleanPdfLiteralString(partMatch[1]);
              line += decodeStringWithFont(raw, activeFont);
            } else if (partMatch[2] !== undefined) {
              line += decodePdfHexString(partMatch[2], activeFont);
            } else if (partMatch[3] !== undefined) {
              const kerning = parseFloat(partMatch[3]);
              if (kerning < -120 && !line.endsWith(" ")) {
                line += " ";
              }
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
 * Calculates a text readability score
 */
export function calculateTextReadabilityScore(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const printableChars = text.match(/[A-Za-z0-9\s.,:;!?()[\]{}"'\-_/\\+=%#@]/g) || [];
  return printableChars.length / text.length;
}

/**
 * Custom pagerender for pdf-parse that ensures proper word spacing and line structure
 */
export function customPdfPageRender(pageData: any): Promise<string> {
  return pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
    .then((textContent: any) => {
      if (!textContent || !Array.isArray(textContent.items)) return "";

      const items = textContent.items as Array<{
        str: string;
        transform: number[];
        width: number;
        height: number;
      }>;

      const lines: Array<{ y: number; items: typeof items }> = [];
      for (const item of items) {
        if (!item.str) continue;
        const y = item.transform[5];
        const existingLine = lines.find((l) => Math.abs(l.y - y) <= 3);
        if (existingLine) {
          existingLine.items.push(item);
        } else {
          lines.push({ y, items: [item] });
        }
      }

      lines.sort((a, b) => b.y - a.y);

      let pageText = "";
      for (const line of lines) {
        line.items.sort((a, b) => a.transform[4] - b.transform[4]);

        let lineStr = "";
        let lastRight = 0;

        for (const item of line.items) {
          const itemX = item.transform[4];
          if (lastRight > 0 && itemX - lastRight > 2 && !lineStr.endsWith(" ") && !item.str.startsWith(" ")) {
            lineStr += " ";
          }
          lineStr += item.str;
          lastRight = itemX + (item.width || 0);
        }

        if (lineStr.trim()) {
          pageText += lineStr.trim() + "\n";
        }
      }

      return pageText;
    })
    .catch(() => "");
}

/**
 * Cleans, unescapes, and normalizes extracted syllabus text
 */
export function cleanExtractedSyllabusText(text: string): string {
  return text
    .replace(/\uFB00/g, "ff")
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/\uFB03/g, "ffi")
    .replace(/\uFB04/g, "ffl")
    .replace(/\uFB05/g, "ft")
    .replace(/\uFB06/g, "st")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, "\"")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/**
 * Extracts normalized text from a PDF buffer using multiple resilient strategies
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  let bestText = "";
  let bestScore = 0;

  // Strategy 1: Enhanced pdf-parse with custom pagerender and spatial reconstruction
  try {
    const pdfData = await pdfParse(buffer, {
      pagerender: customPdfPageRender,
      max: 0,
    });
    if (pdfData?.text && pdfData.text.trim().length > 10) {
      const cleaned = cleanExtractedSyllabusText(pdfData.text);
      const score = calculateTextReadabilityScore(cleaned);
      if (score > bestScore) {
        bestText = cleaned;
        bestScore = score;
      }
    }
  } catch (parseErr) {
    console.warn("Custom pdfParse failed, falling back:", parseErr);
  }

  // Strategy 2: Direct PostScript stream extraction with full CMap and Font Differences decoding
  if (bestScore < 0.75 || bestText.trim().length < 15) {
    try {
      const streamExtracted = extractTextFromPdfStreams(buffer);
      if (streamExtracted && streamExtracted.trim().length > 10) {
        const cleaned = cleanExtractedSyllabusText(streamExtracted);
        const score = calculateTextReadabilityScore(cleaned);
        if (score > bestScore) {
          bestText = cleaned;
          bestScore = score;
        }
      }
    } catch (streamErr) {
      console.warn("Stream CMap extractor error:", streamErr);
    }
  }

  // Strategy 3: Standard pdf-parse default render fallback
  if (bestScore < 0.60 || bestText.trim().length < 15) {
    try {
      const defaultPdfData = await pdfParse(buffer);
      if (defaultPdfData?.text && defaultPdfData.text.trim().length > 10) {
        const cleaned = cleanExtractedSyllabusText(defaultPdfData.text);
        const score = calculateTextReadabilityScore(cleaned);
        if (score > bestScore) {
          bestText = cleaned;
          bestScore = score;
        }
      }
    } catch {
      // ignore
    }
  }

  // Strategy 4: Raw text scan if buffer contains uncompressed text
  if (bestScore < 0.50 || bestText.trim().length < 15) {
    const rawString = buffer.toString("utf-8");
    if (!rawString.startsWith("%PDF") && rawString.trim().length > 10) {
      bestText = cleanExtractedSyllabusText(rawString);
    }
  }

  return bestText;
}
