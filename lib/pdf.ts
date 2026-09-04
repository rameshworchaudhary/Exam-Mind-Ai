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
  isKrutiDev?: boolean;
}

/**
 * Helper to convert hex string from CMap into Unicode string
 */
function hexToUnicode(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  if (!clean) return "";
  if (clean.length <= 2) {
    const code = parseInt(clean, 16);
    return isNaN(code) ? "" : String.fromCodePoint(code);
  }
  let result = "";
  for (let i = 0; i < clean.length; i += 4) {
    const chunk = clean.slice(i, i + 4);
    const code = parseInt(chunk, 16);
    if (!isNaN(code)) {
      result += String.fromCodePoint(code);
    }
  }
  return result;
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
    const lineRegex = /<([0-9a-fA-F]+)>\s+<([0-9a-fA-F\s]+)>/g;
    let lineMatch: RegExpExecArray | null;
    while ((lineMatch = lineRegex.exec(block)) !== null) {
      const srcCode = parseInt(lineMatch[1], 16);
      const destStr = hexToUnicode(lineMatch[2]);
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

      const directMatch = line.match(/<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>\s+<([0-9a-fA-F\s]+)>/);
      if (directMatch) {
        const start = parseInt(directMatch[1], 16);
        const end = parseInt(directMatch[2], 16);
        const destClean = directMatch[3].replace(/\s+/g, "");
        let destStart = parseInt(destClean, 16);
        for (let code = start; code <= end; code++) {
          map.set(code, String.fromCodePoint(destStart++));
        }
        continue;
      }

      const arrayMatch = line.match(/<([0-9a-fA-F]+)>\s+<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/);
      if (arrayMatch) {
        const start = parseInt(arrayMatch[1], 16);
        const hexList = arrayMatch[3].match(/<([0-9a-fA-F\s]+)>/g) || [];
        let curr = start;
        for (const item of hexList) {
          const clean = item.replace(/[<>]/g, "");
          const destStr = hexToUnicode(clean);
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
 * Extracts font mappings (ToUnicode and Differences) from a PDF buffer,
 * correctly associating font resource keys (/F1, /TT0, etc.) with their CMaps.
 */
export function extractFontMappings(pdfContent: string): Map<string, FontMapping> {
  const fontMap = new Map<string, FontMapping>();
  const objRegex = /(\d+)\s+\d+\s+obj([\s\S]*?)endobj/g;
  const objects = new Map<number, string>();
  let objMatch: RegExpExecArray | null;

  while ((objMatch = objRegex.exec(pdfContent)) !== null) {
    const num = parseInt(objMatch[1], 10);
    objects.set(num, objMatch[2]);
  }

  // Discover all font resource aliases across all /Resources and /Font dictionaries
  // Example: /Font << /F1 12 0 R /TT0 14 0 R /C2_0 18 0 R >>
  const resourceToObjId = new Map<string, number>();
  const fontDictRegex = /\/Font\s*<<([\s\S]*?)>>/g;
  let fdMatch: RegExpExecArray | null;
  while ((fdMatch = fontDictRegex.exec(pdfContent)) !== null) {
    const inner = fdMatch[1];
    const itemRegex = /\/([A-Za-z0-9_]+)\s+(\d+)\s+\d+\s+R/g;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRegex.exec(inner)) !== null) {
      resourceToObjId.set(itemMatch[1], parseInt(itemMatch[2], 10));
    }
  }

  // Also check direct font references
  const directRefRegex = /\/([Ff]\d+|[Tt][Tt]\d+|[Cc]\d+_\d+|[A-Za-z0-9_]+Font\w*)\s+(\d+)\s+\d+\s+R/g;
  let drMatch: RegExpExecArray | null;
  while ((drMatch = directRefRegex.exec(pdfContent)) !== null) {
    if (!resourceToObjId.has(drMatch[1])) {
      resourceToObjId.set(drMatch[1], parseInt(drMatch[2], 10));
    }
  }

  for (const [objNum, body] of objects.entries()) {
    if (body.includes("/Type /Font") || body.includes("/Type/Font") || body.includes("/Subtype")) {
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
              const buf = zlib.inflateSync(Buffer.from(streamMatch[1], "latin1"));
              cmapText = buf.toString("utf-8");
            } catch {
              try {
                const buf = zlib.inflateRawSync(Buffer.from(streamMatch[1], "latin1"));
                cmapText = buf.toString("utf-8");
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

      const baseFontMatch = body.match(/\/BaseFont\s*\/([^\s/>]+)/);
      const nameMatch = body.match(/\/Name\s*\/([^\s/>]+)/);
      const rawBaseFont = baseFontMatch ? baseFontMatch[1] : "";
      const fontName = nameMatch ? nameMatch[1] : "";
      const cleanBaseFont = rawBaseFont.replace(/^[A-Z]{6}\+/, "");

      const isKrutiDev = /kruti|devlys|chanakya|walkman|shusha/i.test(rawBaseFont) || /kruti|devlys|chanakya|walkman|shusha/i.test(fontName);

      const mapping: FontMapping = { toUnicodeMap, differencesMap, isKrutiDev };

      // Map by object number
      fontMap.set(String(objNum), mapping);

      // Map by BaseFont and clean BaseFont
      if (rawBaseFont) fontMap.set(rawBaseFont, mapping);
      if (cleanBaseFont) fontMap.set(cleanBaseFont, mapping);
      if (fontName) fontMap.set(fontName, mapping);

      // Map by all resource names pointing to this object
      for (const [resName, targetId] of resourceToObjId.entries()) {
        if (targetId === objNum) {
          fontMap.set(resName, mapping);
        }
      }

      // Also map font_<idx> as fallback
      fontMap.set(`font_${fontMap.size}`, mapping);
    }
  }

  return fontMap;
}

/**
 * Decodes standard PDF literal escape sequences into raw bytes,
 * then accurately decodes UTF-16BE (with \xFE\xFF BOM) or valid UTF-8.
 */
export function cleanPdfLiteralString(str: string): string {
  // 1. Unescape octal and standard PDF escape sequences into raw bytes
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\" && i + 1 < str.length) {
      const next = str[i + 1];
      if (next >= "0" && next <= "7") {
        let oct = next;
        let j = i + 2;
        while (j < str.length && str[j] >= "0" && str[j] <= "7" && j - (i + 1) < 3) {
          oct += str[j];
          j++;
        }
        bytes.push(parseInt(oct, 8) & 0xff);
        i = j - 1;
      } else if (next === "n") {
        bytes.push(0x0a);
        i++;
      } else if (next === "r") {
        bytes.push(0x0d);
        i++;
      } else if (next === "t") {
        bytes.push(0x09);
        i++;
      } else if (next === "b") {
        bytes.push(0x08);
        i++;
      } else if (next === "f") {
        bytes.push(0x0c);
        i++;
      } else if (next === "(") {
        bytes.push(0x28);
        i++;
      } else if (next === ")") {
        bytes.push(0x29);
        i++;
      } else if (next === "\\") {
        bytes.push(0x5c);
        i++;
      } else {
        bytes.push(str.charCodeAt(i + 1) & 0xff);
        i++;
      }
    } else {
      bytes.push(str.charCodeAt(i) & 0xff);
    }
  }

  const rawBuf = Buffer.from(bytes);

  // 2. Check for UTF-16BE BOM (\xFE\xFF)
  if (rawBuf.length >= 2 && rawBuf[0] === 0xfe && rawBuf[1] === 0xff) {
    const payload = rawBuf.subarray(2);
    if (payload.length % 2 === 0) {
      return Buffer.from(payload).swap16().toString("utf16le");
    }
  }

  // 3. Check for valid UTF-8 string
  const utf8Candidate = rawBuf.toString("utf-8");
  if (!utf8Candidate.includes("\uFFFD")) {
    return utf8Candidate;
  }

  // 4. Return as latin1 byte-string for font character code lookup
  return rawBuf.toString("latin1");
}

/**
 * Surgically detects and repairs multi-byte UTF-8 sequences (Hindi/Devanagari, Greek, math, degree symbols)
 * that were mistakenly decoded or interpreted through single-byte Latin-1 (ISO-8859-1) or Windows-1252.
 */
export function repairUtf8MojibakeSurgically(str: string): string {
  if (!str) return "";
  const utf8SequenceRegex =
    /(?:[\u00C2-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3})+/g;
  return str.replace(utf8SequenceRegex, (match) => {
    try {
      const buf = Buffer.from(match, "latin1");
      const decoded = buf.toString("utf-8");
      return decoded.includes("\uFFFD") ? match : decoded;
    } catch {
      return match;
    }
  });
}

/**
 * Maps legacy Kruti Dev 010 / DevLys / Chanakya character codes and ligatures
 * commonly found in Indian state board and competitive exam question papers.
 */
export function repairKrutiDevMojibake(text: string): string {
  if (!text) return "";
  if (!/[ßÜÕôîìèí«»±]/.test(text)) {
    return text;
  }

  let s = text;
  s = s.replace(/ß/g, "द्ब");
  s = s.replace(/Ü/g, "द्ध");
  s = s.replace(/Õ/g, "'");
  s = s.replace(/ô/g, "ू");
  s = s.replace(/î/g, "ी");
  s = s.replace(/ì/g, "ै");
  s = s.replace(/è/g, "ो");
  s = s.replace(/í/g, "ौ");
  s = s.replace(/«/g, "‘");
  s = s.replace(/»/g, "’");
  s = s.replace(/±/g, "±");
  return s;
}

/**
 * Decodes string bytes using active font CMap or Differences map
 */
export function decodeStringWithFont(rawStr: string, activeFont?: FontMapping): string {
  if (!rawStr) return "";

  // If font is Kruti Dev, convert Kruti Dev characters
  if (activeFont?.isKrutiDev) {
    return repairKrutiDevMojibake(rawStr);
  }

  if (!activeFont || (activeFont.toUnicodeMap.size === 0 && activeFont.differencesMap.size === 0)) {
    return repairUtf8MojibakeSurgically(rawStr);
  }

  let result = "";
  for (let i = 0; i < rawStr.length; i++) {
    const code = rawStr.charCodeAt(i);

    // If character is already Unicode (e.g. Devanagari or Greek > 255), preserve it
    if (code > 255) {
      result += rawStr[i];
      continue;
    }

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

  return repairUtf8MojibakeSurgically(result);
}

/**
 * Decodes PDF hex-encoded strings with CMap support, UTF-16BE detection, and UTF-8 recovery
 */
export function decodePdfHexString(hex: string, activeFont?: FontMapping): string {
  try {
    let cleanHex = hex.replace(/\s+/g, "");
    if (cleanHex.length === 0) return "";
    if (cleanHex.length % 2 !== 0) {
      cleanHex += "0";
    }

    // 1. If active font has toUnicodeMap, map character codes
    if (activeFont && activeFont.toUnicodeMap.size > 0) {
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

      let decoded = "";
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
      return repairUtf8MojibakeSurgically(decoded);
    }

    const buf = Buffer.from(cleanHex, "hex");

    // 2. Check for UTF-16BE BOM (FEFF)
    if (cleanHex.toLowerCase().startsWith("feff")) {
      if (buf.length % 2 === 0) {
        return Buffer.from(buf.subarray(2)).swap16().toString("utf16le");
      }
    }

    // 3. Check for UTF-16BE without BOM (even length with valid Unicode codepoints)
    if (buf.length >= 2 && buf.length % 2 === 0) {
      const candidateUtf16 = Buffer.from(buf).swap16().toString("utf16le");
      if (!candidateUtf16.includes("\uFFFD") && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(candidateUtf16)) {
        const readableRatio =
          (candidateUtf16.match(/[\p{L}\p{M}\p{N}\p{P}\p{S}\s]/gu) || []).length / candidateUtf16.length;
        if (readableRatio > 0.8) {
          return candidateUtf16;
        }
      }
    }

    // 4. Try UTF-8
    const utf8Str = buf.toString("utf-8");
    if (!utf8Str.includes("\uFFFD")) {
      return utf8Str;
    }

    return buf.toString("latin1");
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

  // Pick default font with the richest ToUnicode CMap
  let defaultFont: FontMapping | undefined;
  let maxMapSize = 0;
  for (const mapping of fontMappings.values()) {
    const size = mapping.toUnicodeMap.size + mapping.differencesMap.size;
    if (size > maxMapSize) {
      maxMapSize = size;
      defaultFont = mapping;
    }
  }
  if (!defaultFont) {
    defaultFont = fontMappings.values().next().value as FontMapping | undefined;
  }

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(content)) !== null) {
    const rawStream = Buffer.from(match[1], "latin1");
    let decompressed = "";
    try {
      const inflated = zlib.inflateSync(rawStream);
      // Try UTF-8 first to avoid Latin-1 corruption of streams containing Unicode/Hindi
      decompressed = inflated.toString("utf-8");
    } catch {
      try {
        const inflated = zlib.inflateRawSync(rawStream);
        decompressed = inflated.toString("utf-8");
      } catch {
        decompressed = rawStream.toString("utf-8");
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
 * Calculates a text readability score supporting English, Hindi (Devanagari),
 * Hinglish, and scientific/mathematical notation while penalizing corruption.
 */
export function calculateTextReadabilityScore(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  // Match any Unicode letters (English, Devanagari, etc.), combining marks/matras, numbers, punctuation, symbols, and whitespace
  const readableChars = text.match(/[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Z}\s]/gu) || [];
  // Penalize replacement character \uFFFD and binary control characters
  const badChars = text.match(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/g) || [];
  const validCount = Math.max(0, readableChars.length - badChars.length * 2);
  return validCount / text.length;
}

/**
 * Helper to identify Devanagari matras, vowel signs, and general combining marks
 * so spatial reconstruction does NOT break words by prepending spaces before them.
 */
function isCombiningOrVowelSign(str: string): boolean {
  if (!str) return false;
  const code = str.codePointAt(0);
  if (!code) return false;
  // Devanagari combining marks / signs / matras / halant / virama:
  // 0x0901-0x0903 (chandrabindu, anusvara, visarga)
  // 0x093A-0x094F (nukta, vowel signs AA, I, II, U, UU, R, RR, E, AI, O, AU, virama/halant)
  // 0x0951-0x0957 (udatta, anudatta, grave, acute)
  // 0x0962-0x0963 (vocalic L, LL vowel signs)
  if (
    (code >= 0x0901 && code <= 0x0903) ||
    (code >= 0x093a && code <= 0x094f) ||
    (code >= 0x0951 && code <= 0x0957) ||
    (code >= 0x0962 && code <= 0x0963)
  ) {
    return true;
  }
  // General Unicode combining mark (\p{M})
  try {
    return /^\p{M}/u.test(str);
  } catch {
    return false;
  }
}

/**
 * Custom pagerender for pdf-parse that ensures proper word spacing and line structure
 * while preserving multi-byte scripts and vowel marks.
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
          const shouldPrependSpace =
            lastRight > 0 &&
            itemX - lastRight > 2 &&
            !lineStr.endsWith(" ") &&
            !item.str.startsWith(" ") &&
            !lineStr.endsWith("\u094D") && // Do not break Devanagari halant conjunct
            !isCombiningOrVowelSign(item.str);

          if (shouldPrependSpace) {
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
  // First repair any Latin-1 / UTF-8 mojibake (e.g. Hindi, Greek, math, °C) and Kruti Dev symbols
  const repaired = repairKrutiDevMojibake(repairUtf8MojibakeSurgically(text));

  return repaired
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
    .replace(/\uFFFD/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .normalize("NFC")
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

  // Strategy 2: Standard pdf-parse default render fallback (high-fidelity PDF.js text extraction)
  if (bestScore < 0.70 || bestText.trim().length < 15) {
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

  // Strategy 3: Direct PostScript stream extraction with full CMap and Font Differences decoding
  if (bestScore < 0.60 || bestText.trim().length < 15) {
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

  // Strategy 4: Raw text scan if buffer contains uncompressed text
  if (bestScore < 0.50 || bestText.trim().length < 15) {
    const rawString = buffer.toString("utf-8");
    if (!rawString.startsWith("%PDF") && rawString.trim().length > 10) {
      bestText = cleanExtractedSyllabusText(rawString);
    }
  }

  return bestText;
}
