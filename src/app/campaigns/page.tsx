import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CampaignsListPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    // Fetch assigned campaigns with their stats logic would normally go here
    // For now, we list the assignments and fetch their *latest* stats from our database

    const assignments = await prisma.campaignAccess.findMany({
        where: { client_id: session.user.id },
    });

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
                        ← Back to Dashboard
                    </Link>
                    <h1 className="mt-2 text-3xl font-bold">Your Campaigns</h1>
                </div>

                <div className="grid gap-4">
                    {assignments.map((campaign) => (
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

                    {assignments.length === 0 && (
                        <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                            No campaigns assigned yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
