import { NextResponse, type NextRequest } from "next/server";
import { processPendingDeliveries } from "@/lib/webhooks/process";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-internal-token");

  if (!process.env.INTERNAL_API_TOKEN || token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await processPendingDeliveries();
  return NextResponse.json(result);
}
