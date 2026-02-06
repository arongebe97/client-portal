import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import CrmLayout from "@/components/CrmLayout";
import { getCampaignAnalytics } from "@/lib/instantly";

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const analytics = await getCampaignAnalytics();

  return (
    <CrmLayout userEmail={session.user.email || ""} isAdmin={isAdmin}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-zinc-400 mt-1">
            All your Instantly.ai campaigns with live analytics
          </p>
        </div>

        {/* Summary bar */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat label="Total" value={analytics.length} />
          <MiniStat label="Active" value={analytics.filter(c => c.campaign_status === 1).length} />
          <MiniStat label="Paused" value={analytics.filter(c => c.campaign_status === 2).length} />
          <MiniStat label="Completed" value={analytics.filter(c => c.campaign_status === 3).length} />
        </div>

        {/* Campaign cards */}
        <div className="grid gap-4">
          {analytics.map((campaign) => {
            const openRate = campaign.emails_sent_count > 0
              ? ((campaign.open_count_unique / campaign.emails_sent_count) * 100).toFixed(1)
              : "0.0";
            const replyRate = campaign.emails_sent_count > 0
              ? ((campaign.reply_count_unique / campaign.emails_sent_count) * 100).toFixed(1)
              : "0.0";

            return (
              <Link
                key={campaign.campaign_id}
                href={`/campaigns/${campaign.campaign_id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold group-hover:text-white transition-colors">
                        {campaign.campaign_name}
                      </h2>
                      <StatusBadge status={campaign.campaign_status} />
                    </div>
                    <p className="text-xs text-zinc-500 font-mono mt-1">{campaign.campaign_id}</p>
                  </div>
                  <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors text-sm">
                    View &rarr;
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500">Leads</p>
                    <p className="font-semibold text-zinc-200">{(campaign.leads_count || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Sent</p>
                    <p className="font-semibold text-zinc-200">{(campaign.emails_sent_count || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Open Rate</p>
                    <p className="font-semibold text-zinc-200">{openRate}%</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Reply Rate</p>
                    <p className="font-semibold text-zinc-200">{replyRate}%</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Bounced</p>
                    <p className="font-semibold text-zinc-200">{(campaign.bounced_count || 0).toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            );
          })}

          {analytics.length === 0 && (
            <div className="text-center py-16 text-zinc-500 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
              <svg className="mx-auto h-12 w-12 text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
              </svg>
              <p className="text-lg font-medium">No campaigns found</p>
              <p className="mt-1 text-sm">Create campaigns in Instantly.ai to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </CrmLayout>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: number }) {
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
