import { prisma } from "@/lib/prisma";
import { getInstantlyCampaigns } from "@/lib/instantly";
import { updateClientCampaigns } from "./actions";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ManageClientPage({ params }: Props) {
    const { id } = await params;
    const client = await prisma.client.findUnique({
        where: { id },
        include: { campaigns: true },
    });

    if (!client) {
        notFound();
    }

    const allCampaigns = await getInstantlyCampaigns();

    // Create a Set of assigned campaign IDs for O(1) lookup
    const assignedCampaignIds = new Set(client.campaigns.map((c) => c.instantly_campaign_id));

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <Link href="/admin" className="text-sm text-zinc-400 hover:text-white transition-colors">
                    ← Back to Clients
                </Link>
                <h1 className="mt-2 text-2xl font-bold">Manage Client: {client.email}</h1>
                <p className="text-zinc-400">Assign Instantly.ai campaigns to this user.</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="text-xl font-semibold mb-4">Campaign Assignments</h2>

                {allCampaigns.length === 0 ? (
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                        Warning: No campaigns found from Instantly API. Check API Key or create a campaign in Instantly.
                    </div>
                ) : (
                    <form action={updateClientCampaigns}>
                        <input type="hidden" name="clientId" value={client.id} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                            {allCampaigns.map((campaign) => {
                                const isAssigned = assignedCampaignIds.has(campaign.id);
                                return (
                                    <label
                                        key={campaign.id}
                                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${isAssigned
                                            ? "bg-blue-500/10 border-blue-500/50"
                                            : "bg-zinc-800/30 border-zinc-800 hover:border-zinc-700"
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            name="campaignIds"
                                            value={JSON.stringify({ id: campaign.id, name: campaign.name })}
                                            defaultChecked={isAssigned}
                                            className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                                        />
                                        <div>
                                            <div className="font-medium text-zinc-200">{campaign.name}</div>
                                            <div className="text-xs text-zinc-500 font-mono mt-1">{campaign.id}</div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                type="submit"
                                className="rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-zinc-900 shadow-sm hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
