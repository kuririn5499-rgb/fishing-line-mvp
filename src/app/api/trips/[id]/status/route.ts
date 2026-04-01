/**
 * PATCH /api/trips/:id/status
 * 便のステータスを更新する（captain / admin のみ）
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { TripStatusUpdateSchema } from "@/lib/schemas";
import { updateTripStatus } from "@/lib/repositories/trips";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await requireSession("captain");
    const { id } = await params;

    const body = await req.json();
    const parsed = TripStatusUpdateSchema.safeParse({ ...body, trip_id: id });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message },
        { status: 400 }
      );
    }

    await updateTripStatus(id, session.accountId, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "エラー";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
