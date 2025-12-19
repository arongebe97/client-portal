import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

async function getData(userId: string, isAdmin: boolean) {
  let campaignIds: string[] = [];

  if (isAdmin) {
    const allAssignments = await prisma.campaignAccess.findMany({
      select: { instantly_campaign_id: true }
    });
    campaignIds = allAssignments.map(a => a.instantly_campaign_id);
  } else {
    const assignments = await prisma.campaignAccess.findMany({
      where: { client_id: userId },
      select: { instantly_campaign_id: true }
    });
    campaignIds = assignments.map(a => a.instantly_campaign_id);
  }

  if (campaignIds.length === 0) {
    return { stats: { sent: 0, openRate: 0, replyRate: 0, totalCampaigns: 0 } };
  }

  const queryOptions: any = isAdmin ? {} : { where: { client_id: userId } };
  const stats = await prisma.campaign_Stats.aggregate({
    ...queryOptions,
    _sum: {
      emails_sent: true,
      opens: true,
      replies: true,
    }
  });

  const aggregate = stats._sum || { emails_sent: 0, opens: 0, replies: 0 };
  const openRate = aggregate.emails_sent ? (aggregate.opens! / aggregate.emails_sent) * 100 : 0;
  const replyRate = aggregate.emails_sent ? (aggregate.replies! / aggregate.emails_sent) * 100 : 0;

  return {
    stats: {
      sent: aggregate.emails_sent || 0,
      openRate: openRate,
      replyRate: replyRate,
      totalCampaigns: new Set(campaignIds).size
    }
  };
}

export default async function ClientDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";

  const { stats } = await getData(session.user.id, isAdmin);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500"></div>
            <span className="font-bold">Client Portal</span>
          </div>
          <div className="flex items-center gap-6">
            {session.user.role === "ADMIN" && (
              <Link href="/admin" className="text-sm font-medium text-blue-400 hover:text-blue-300">
                Admin Area
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Overview</h1>
          <p className="text-zinc-400 mt-2">Welcome back, {session.user.email}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Stat Card 1 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <dt className="text-sm font-medium text-zinc-400">Total Emails Sent</dt>
            <dd className="mt-2 text-3xl font-bold text-white tracking-tight">{stats.sent.toLocaleString()}</dd>
          </div>
          {/* Stat Card 2 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <dt className="text-sm font-medium text-zinc-400">Open Rate</dt>
            <dd className="mt-2 text-3xl font-bold text-white tracking-tight">{stats.openRate.toFixed(1)}%</dd>
          </div>
          {/* Stat Card 3 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <dt className="text-sm font-medium text-zinc-400">Reply Rate</dt>
            <dd className="mt-2 text-3xl font-bold text-white tracking-tight">{stats.replyRate.toFixed(1)}%</dd>
          </div>
          {/* Stat Card 4 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <dt className="text-sm font-medium text-zinc-400">Active Campaigns</dt>
            <dd className="mt-2 text-3xl font-bold text-white tracking-tight">{stats.totalCampaigns}</dd>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6">Assigned Campaigns</h2>
          {/* We will implement the list here in next step, placeholder for now */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
            <Link href="/campaigns" className="text-blue-400 hover:underline">View All Campaigns →</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
