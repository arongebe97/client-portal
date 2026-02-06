import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import CrmLayout from "@/components/CrmLayout";
import {
  getCampaignAnalytics,
  getInstantlyCampaign,
  getInstantlyLeads,
  getInstantlyEmails,
} from "@/lib/instantly";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  // Fetch campaign details and analytics in parallel
  const [campaign, analyticsArr, leadsData, emails] = await Promise.all([
    getInstantlyCampaign(id),
    getCampaignAnalytics(id),
    getInstantlyLeads({ campaign_id: id, limit: 20 }),
    getInstantlyEmails({ campaign_id: id, email_type: "received", limit: 20 }),
  ]);

  const analytics = analyticsArr[0] || null;

  // Use campaign name from analytics if direct fetch failed
  const campaignName = campaign?.name || analytics?.campaign_name || "Campaign";

  return (
    <CrmLayout userEmail={session.user.email || ""} isAdmin={isAdmin}>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/campaigns" className="text-sm text-zinc-400 hover:text-white transition-colors">
            &larr; Back to Campaigns
          </Link>
          <div className="mt-2 flex items-center gap-3">
            {analytics && <StatusDot status={analytics.campaign_status} />}
            <h1 className="text-3xl font-bold">{campaignName}</h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">{id}</p>
        </div>

        {/* Analytics Grid */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Stat label="Leads" value={(analytics.leads_count || 0).toLocaleString()} />
            <Stat label="Contacted" value={(analytics.contacted_count || 0).toLocaleString()} />
            <Stat label="Emails Sent" value={(analytics.emails_sent_count || 0).toLocaleString()} />
            <Stat label="Opens" value={(analytics.open_count_unique || 0).toLocaleString()} />
            <Stat label="Replies" value={(analytics.reply_count_unique || 0).toLocaleString()} />
            <Stat label="Bounced" value={(analytics.bounced_count || 0).toLocaleString()} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Leads */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold">Recent Leads</h3>
              <Link href={`/leads?campaign=${id}`} className="text-xs text-orange-400 hover:text-orange-300">
                View all &rarr;
              </Link>
            </div>
            <div className="divide-y divide-zinc-800">
              {leadsData.items.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-sm">No leads found for this campaign.</div>
              ) : (
                leadsData.items.map((lead) => (
                  <div key={lead.id} className="px-6 py-3 flex items-center justify-between hover:bg-zinc-900/80 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-200 text-sm truncate">
                        {lead.first_name || lead.last_name
                          ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
                          : lead.email}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{lead.email}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 shrink-0 ml-4">
                      {lead.company_name && <span>{lead.company_name}</span>}
                      <InterestBadge status={lead.lt_interest_status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Incoming Emails */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold">Incoming Emails</h3>
              <Link href={`/inbox?campaign=${id}`} className="text-xs text-orange-400 hover:text-orange-300">
                View all &rarr;
              </Link>
            </div>
            <div className="divide-y divide-zinc-800">
              {emails.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-sm">No incoming emails yet.</div>
              ) : (
                emails.map((email) => (
                  <Link
                    key={email.id}
                    href={`/inbox/${email.id}`}
                    className="block px-6 py-3 hover:bg-zinc-900/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {email.is_unread === 1 && (
                            <span className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
                          )}
                          <p className="font-medium text-zinc-200 text-sm truncate">{email.from_address_email}</p>
                        </div>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{email.subject}</p>
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0 ml-4">
                        {new Date(email.timestamp_email).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </CrmLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function StatusDot({ status }: { status: number }) {
  const colors: Record<number, string> = {
    0: "bg-zinc-500",
    1: "bg-green-500 animate-pulse",
    2: "bg-yellow-500",
    3: "bg-blue-500",
  };
  return <div className={`h-3 w-3 rounded-full ${colors[status] || colors[0]}`} />;
}

function InterestBadge({ status }: { status?: string }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    interested: "text-green-400 bg-green-400/10",
    "not interested": "text-red-400 bg-red-400/10",
    "meeting booked": "text-blue-400 bg-blue-400/10",
    "out of office": "text-yellow-400 bg-yellow-400/10",
  };
  const color = colors[status.toLowerCase()] || "text-zinc-400 bg-zinc-400/10";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
