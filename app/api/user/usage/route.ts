// app/api/user/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerDailyUsage, getVerifiedUid } from "@/services/usage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paramUid = searchParams.get("uid");

    let verifiedUid: string | null = null;
    try {
      verifiedUid = await getVerifiedUid(req, paramUid || undefined);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Authentication error";
      const status = message.includes("UID_MISMATCH") ? 403 : 401;
      console.warn("[Usage API] Token verification notice:", message);
      return NextResponse.json(
        { success: false, error: message },
        { status }
      );
    }

    const targetUid = verifiedUid || "anonymous";
    const usage = await getServerDailyUsage(targetUid);

    return NextResponse.json({
      success: true,
      ...usage,
      data: usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch daily usage";
    console.error("[Usage API] Error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
