import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { replyToEmail } from "@/lib/instantly";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { reply_to_uuid, eaccount, subject, body: emailBody } = body;

    if (!reply_to_uuid || !eaccount || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: reply_to_uuid, eaccount, body" },
        { status: 400 }
      );
    }

    const result = await replyToEmail({
      reply_to_uuid,
      eaccount,
      subject,
      body: emailBody,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to send reply via Instantly API" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, email: result });
  } catch (error) {
    console.error("Reply error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
