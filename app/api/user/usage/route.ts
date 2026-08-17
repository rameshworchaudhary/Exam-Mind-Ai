// app/api/user/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerDailyUsage, getVerifiedUid } from "@/services/usage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paramUid = searchParams.get("uid");

    const verifiedUid = await getVerifiedUid(req, paramUid || undefined);
    const targetUid = verifiedUid || paramUid || "anonymous";

    const usage = await getServerDailyUsage(targetUid);
    return NextResponse.json({
      success: true,
      ...usage,
      data: usage,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch daily usage" },
      { status: 500 }
    );
  }
}

