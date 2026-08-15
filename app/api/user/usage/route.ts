// app/api/user/usage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerDailyUsage } from "@/services/usage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid") || "anonymous";

    const usage = await getServerDailyUsage(uid);
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
