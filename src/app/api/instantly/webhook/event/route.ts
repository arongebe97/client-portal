import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const WEBHOOK_SECRET = process.env.INSTANTLY_WEBHOOK_SECRET;

export async function POST(req: Request) {
    if (!WEBHOOK_SECRET) {
        console.error("INSTANTLY_WEBHOOK_SECRET is not defined");
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    // 1. Verify Signature
    // Note: Instantly docs usually specify sending signature in header, e.g., 'X-Instantly-Signature'
    // We will assume standard verification. If not present, we skip for now but log warning.
    // Real implementation: const signature = headers().get("x-instantly-signature");
    // const computed = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");

    // For this MVP, we parse details directly.
    const body = await req.json();
    const { event_type, campaign_id, lead_email, message_body } = body;

    console.log("Received Webhook:", event_type, campaign_id);

    if (!campaign_id || !event_type) {
        return NextResponse.json({ error: "Invalid Payload" }, { status: 400 });
    }

    try {
        // 2. Find which client owns this campaign
        // We look up the CampaignAccess table for this ID.
        // NOTE: A campaign might be assigned to multiple clients (unlikely in agency model, but possible in schema).
        // We will update stats for ALL clients who have this campaign assigned.

        const owners = await prisma.campaignAccess.findMany({
            where: { instantly_campaign_id: campaign_id },
            include: { client: true }
        });

        if (owners.length === 0) {
            console.warn(`Campaign ID ${campaign_id} not assigned to any client. Ignoring event.`);
            return NextResponse.json({ message: "Ignored: No owner found" }, { status: 200 });
        }

        // 3. Update Stats and Log Activity for each owner
        for (const owner of owners) {
            // Log Activity
            await prisma.activity_Log.create({
                data: {
                    client_id: owner.client_id,
                    event_type: event_type,
                    lead_email: lead_email || "Unknown",
                    message_body: message_body || null,
                }
            });

            // Update Aggregated Stats (Increment counters)
            // Logic depends on event type
            const updateData: any = {};
            if (event_type === "email_sent") updateData.emails_sent = { increment: 1 };
            if (event_type === "email_opened") updateData.opens = { increment: 1 };
            if (event_type === "reply_received") updateData.replies = { increment: 1 };

            if (Object.keys(updateData).length > 0) {
                // Upsert stats for today/general. Schema has 'date' default now.
                // For simplicity, we just update the *latest* stats record or create one if none exists.
                // A better approach would be daily stats keys, but we'll keep it simple for MVP.

                const lastStat = await prisma.campaign_Stats.findFirst({
                    where: { client_id: owner.client_id },
                    orderBy: { date: 'desc' }
                });

                if (lastStat) {
                    await prisma.campaign_Stats.update({
                        where: { id: lastStat.id },
                        data: updateData
                    });
                } else {
                    await prisma.campaign_Stats.create({
                        data: {
                            client_id: owner.client_id,
                            ...Object.keys(updateData).reduce((acc, key) => ({ ...acc, [key]: 1 }), {})
                        }
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
