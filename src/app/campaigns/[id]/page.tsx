import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getInstantlyCampaigns } from "@/lib/instantly";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const isAdmin = session.user.role === "ADMIN";
    let campaignName = "";

    // ACCESS CONTROL
    if (isAdmin) {
        // Admins can see any campaign. Fetch name from Instantly.
        const allCampaigns = await getInstantlyCampaigns();
        const campaign = allCampaigns.find(c => c.id === id);
        if (!campaign) notFound();
        campaignName = campaign.name;
    } else {
        // CLIENTS: Verify user is assigned to this campaign
        const assignment = await prisma.campaignAccess.findUnique({
            where: {
                client_id_instantly_campaign_id: {
                    client_id: session.user.id,
                    instantly_campaign_id: id,
                },
            },
        });

        if (!assignment) {
            notFound();
        }
        campaignName = assignment.campaign_name || "Untitled Campaign";
    }

    // Fetch Stats for this specific campaign (aggregated for the client)
    // NOTE: Schema has stats per CLIENT, not per CAMPAIGN ID unfortunately in the prompt schema.
    // We will show stats from the Campaign_Stats table linked to this client.
    // Ideally, Campaign_Stats should have instantly_campaign_id. 
    // Assuming 'Activity_Log' logs events for specific campaigns we can filter logic there if we had the field.
    // For now, we show the aggregation or placeholder, as per schema limitations.

    // Let's assume for this view we fetch Activity Logs for this client which effectively show "Recent Activity" for their campaigns.
    const activities = await prisma.activity_Log.findMany({
        where: { client_id: session.user.id },
        orderBy: { timestamp: "desc" },
        take: 20,
    });

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <Link href="/campaigns" className="text-sm text-zinc-400 hover:text-white transition-colors">
                        ← Back to Campaigns
                    </Link>
                    <div className="mt-2 flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                        <h1 className="text-3xl font-bold">{campaignName}</h1>
                    </div>
                    <p className="text-mono text-zinc-500 text-sm mt-1">{id}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Chart Placeholder */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 h-64 flex items-center justify-center text-zinc-500">
                            [Analytics Chart Component Placeholder]
                        </div>

                        {/* Activity Feed */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                            <div className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
                                <h3 className="font-semibold">Recent Activity</h3>
                            </div>
                            <div className="divide-y divide-zinc-800">
                                {activities.length === 0 ? (
                                    <div className="p-6 text-center text-zinc-500">No activity recorded yet.</div>
                                ) : (
                                    activities.map(log => (
                                        <div key={log.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                                            <div>
                                                <div className="font-medium text-zinc-200 capitalize">{log.event_type.replace('_', ' ')}</div>
                                                <div className="text-sm text-zinc-500">{log.lead_email}</div>
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                            <h3 className="font-semibold mb-4">Configuration</h3>
                            <div className="space-y-3 text-sm text-zinc-400">
                                <div className="flex justify-between">
                                    <span>Status</span>
                                    <span className="text-green-400">Active</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Daily Limit</span>
                                    <span>--</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
