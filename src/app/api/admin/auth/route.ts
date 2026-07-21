// API route: vérification admin
// POST /api/admin/auth
// Body: { password: string }

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD non configuré côté serveur" },
      { status: 500 }
    );
  }

  if (password === adminPassword) {
    return NextResponse.json({ success: true, token: adminPassword });
  }

  return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
}
