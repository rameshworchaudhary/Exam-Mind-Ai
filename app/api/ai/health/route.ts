// app/api/ai/health/route.ts
import { NextResponse } from "next/server";
import { checkAiProvidersHealth } from "@/services/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await checkAiProvidersHealth();
    const isHealthy = health.nvidia.success || health.groq.success;
    return NextResponse.json(
      {
        status: isHealthy ? "operational" : "degraded",
        providers: health,
        timestamp: new Date().toISOString(),
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      {
        status: "error",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
