import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import CrmLayout from "@/components/CrmLayout";
import { getCampaignAnalytics } from "@/lib/instantly";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  // Fetch real analytics from Instantly
  const analytics = await getCampaignAnalytics();

  // Aggregate stats across all campaigns
  const totals = analytics.reduce(
    (acc, c) => ({
      emailsSent: acc.emailsSent + (c.emails_sent_count || 0),
      opens: acc.opens + (c.open_count_unique || 0),
      replies: acc.replies + (c.reply_count_unique || 0),
      leads: acc.leads + (c.leads_count || 0),
      bounces: acc.bounces + (c.bounced_count || 0),
      opportunities: acc.opportunities + (c.total_opportunities || 0),
    }),
    { emailsSent: 0, opens: 0, replies: 0, leads: 0, bounces: 0, opportunities: 0 }
  );

  const openRate = totals.emailsSent > 0 ? (totals.opens / totals.emailsSent) * 100 : 0;
  const replyRate = totals.emailsSent > 0 ? (totals.replies / totals.emailsSent) * 100 : 0;

  // Top campaigns by replies
  const topCampaigns = [...analytics]
    .sort((a, b) => (b.reply_count_unique || 0) - (a.reply_count_unique || 0))
    .slice(0, 5);

  return (
    <CrmLayout userEmail={session.user.email || ""} isAdmin={isAdmin}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-zinc-400 mt-1">
            Welcome back, {session.user.email}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Emails Sent" value={totals.emailsSent.toLocaleString()} />
          <StatCard label="Open Rate" value={`${openRate.toFixed(1)}%`} sub={`${totals.opens.toLocaleString()} unique opens`} />
          <StatCard label="Reply Rate" value={`${replyRate.toFixed(1)}%`} sub={`${totals.replies.toLocaleString()} unique replies`} />
          <StatCard label="Total Leads" value={totals.leads.toLocaleString()} />
          <StatCard label="Active Campaigns" value={String(analytics.filter(c => c.campaign_status === 1).length)} />
          <StatCard label="Bounced" value={totals.bounces.toLocaleString()} />
          <StatCard label="Opportunities" value={totals.opportunities.toLocaleString()} />
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex items-center justify-center">
            <Link href="/inbox" className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors">
              View Inbox &rarr;
            </Link>
          </div>
        </div>

        {/* Top Campaigns */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Top Campaigns by Replies</h2>
            <Link href="/campaigns" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
              View all &rarr;
            </Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-6 py-3 font-medium">Campaign</th>
                  <th className="px-6 py-3 font-medium text-right">Sent</th>
                  <th className="px-6 py-3 font-medium text-right">Opens</th>
                  <th className="px-6 py-3 font-medium text-right">Replies</th>
                  <th className="px-6 py-3 font-medium text-right">Leads</th>
                  <th className="px-6 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {topCampaigns.map((c) => (
                  <tr key={c.campaign_id} className="hover:bg-zinc-900/80 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/campaigns/${c.campaign_id}`} className="font-medium text-zinc-200 hover:text-white transition-colors">
                        {c.campaign_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-400">{(c.emails_sent_count || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-zinc-400">{(c.open_count_unique || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-zinc-400">{(c.reply_count_unique || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-zinc-400">{(c.leads_count || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <CampaignStatusBadge status={c.campaign_status} />
                    </td>
                  </tr>
                ))}
                {topCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No campaign data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CrmLayout>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <dt className="text-sm font-medium text-zinc-400">{label}</dt>
      <dd className="mt-2 text-3xl font-bold text-white tracking-tight">{value}</dd>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: number }) {
  const config: Record<number, { label: string; color: string }> = {
    0: { label: "Draft", color: "text-zinc-400 bg-zinc-400/10 ring-zinc-400/20" },
    1: { label: "Active", color: "text-green-400 bg-green-400/10 ring-green-400/20" },
    2: { label: "Paused", color: "text-yellow-400 bg-yellow-400/10 ring-yellow-400/20" },
    3: { label: "Completed", color: "text-blue-400 bg-blue-400/10 ring-blue-400/20" },
  };
  const c = config[status] || config[0];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${c.color}`}>
      {c.label}
    </span>
  );
}
