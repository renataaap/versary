import { NextResponse } from "next/server";
import { getLatestImportedTable } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ data: await getLatestImportedTable() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível consultar os dados.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
