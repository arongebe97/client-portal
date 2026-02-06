import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if admin already exists
    const existing = await prisma.client.findUnique({
      where: { email: "admin@instantly-crm.com" },
    });

    if (existing) {
      return NextResponse.json({ message: "Admin user already exists. You can log in." });
    }

    // Create admin user
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.client.create({
      data: {
        email: "admin@instantly-crm.com",
        password_hash: passwordHash,
        role: "ADMIN",
      },
    });

    return NextResponse.json({
      message: "Admin user created!",
      email: "admin@instantly-crm.com",
      password: "admin123",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
