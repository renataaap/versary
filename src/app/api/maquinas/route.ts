import { NextResponse } from "next/server";
import { getUniqueMachines } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ machines: await getUniqueMachines() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível consultar as máquinas.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
