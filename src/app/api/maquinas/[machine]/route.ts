import { NextResponse } from "next/server";
import { getMachineStopDetails } from "@/lib/sqlite";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ machine: string }> },
) {
  try {
    const { machine } = await params;
    return NextResponse.json({
      machine,
      records: await getMachineStopDetails(machine),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível consultar os detalhes da máquina.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
