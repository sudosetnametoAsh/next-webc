import OpenRouterAI from "@/lib/open-ai/open-router";
import { NextResponse } from "next/server";

export async function GET() {
  const task = "send xray copy";
  const response = await OpenRouterAI({ task });

  return NextResponse.json({ message: response });
}
