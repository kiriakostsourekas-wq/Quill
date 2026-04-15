import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await requireRequestUser(request);
  if (user instanceof NextResponse) {
    return user;
  }

  return NextResponse.json(
    {
      betaAccess: true,
      error: "Billing is disabled during beta. There is no billing portal right now.",
    },
    { status: 403 }
  );
}
