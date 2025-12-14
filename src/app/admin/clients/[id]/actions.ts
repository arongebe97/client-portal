"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateClientCampaigns(formData: FormData) {
    const clientId = formData.get("clientId") as string;
    const campaignDataRaw = formData.getAll("campaignIds") as string[]; // Array of JSON strings

    if (!clientId) {
        return { error: "Client ID is required" };
    }

    // Parse JSON values
    const newCampaigns = campaignDataRaw.map(str => {
        try {
            return JSON.parse(str) as { id: string, name: string };
        } catch (e) {
            return null;
        }
    }).filter(c => c !== null);

    try {
        // Transaction to ensure atomic update
        await prisma.$transaction(async (tx) => {
            // 1. Remove all existing access for this client
            await tx.campaignAccess.deleteMany({
                where: { client_id: clientId },
            });

            // 2. Add selected campaigns
            if (newCampaigns.length > 0) {
                await tx.campaignAccess.createMany({
                    data: newCampaigns.map((c) => ({
                        client_id: clientId,
                        instantly_campaign_id: c!.id,
                        campaign_name: c!.name,
                    })),
                });
            }
        });

        revalidatePath(`/admin/clients/${clientId}`);
        revalidatePath("/admin");
        return { success: true };
    } catch (error) {
        console.error("Failed to update campaigns:", error);
        return { error: "Failed to update assignments" };
    }
}
