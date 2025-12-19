import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getInstantlyCampaigns } from "@/lib/instantly";

export default async function CampaignsListPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const isAdmin = session.user.role === "ADMIN";
    let campaigns = [];

    if (isAdmin) {
        // Admins see everything from Instantly
        const instantlyCampaigns = await getInstantlyCampaigns();
        campaigns = instantlyCampaigns.map(c => ({
            id: c.id,
            instantly_campaign_id: c.id,
            campaign_name: c.name
        }));
    } else {
        // Clients see only assigned campaigns
        campaigns = await prisma.campaignAccess.findMany({
            where: { client_id: session.user.id },
        });
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="mt-2 text-3xl font-bold">{isAdmin ? "All Campaigns" : "Your Campaigns"}</h1>
                    {isAdmin && <p className="text-zinc-500 mt-2">Manage and view all campaigns directly from Instantly.ai</p>}
                </div>

                <div className="grid gap-4">
                    {campaigns.map((campaign) => (
                        <Link
                            key={campaign.id}
                            href={`/campaigns/${campaign.instantly_campaign_id}`}
                            className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:bg-zinc-900 hover:border-zinc-700 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold">{campaign.campaign_name}</h2>
                                    <p className="text-sm text-zinc-500 font-mono mt-1">{campaign.instantly_campaign_id}</p>
                                </div>
                                <div className="text-right text-zinc-400">
                                    View Details →
                                </div>
                            </div>
                        </Link>
                    ))}

                    {campaigns.length === 0 && (
                        <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                            No campaigns found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
