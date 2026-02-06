import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import CrmLayout from "@/components/CrmLayout";
import { getInstantlyLeads, getInstantlyCampaigns } from "@/lib/instantly";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function LeadsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const { campaign: campaignFilter } = await searchParams;

  // Fetch leads (optionally filtered by campaign)
  const [leadsData, campaigns] = await Promise.all([
    getInstantlyLeads({ campaign_id: campaignFilter, limit: 100 }),
    getInstantlyCampaigns(),
  ]);

  const campaignName = campaignFilter
    ? campaigns.find(c => c.id === campaignFilter)?.name
    : null;

  return (
    <CrmLayout userEmail={session.user.email || ""} isAdmin={isAdmin}>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-zinc-400 mt-1">
            {campaignName
              ? `Showing leads from: ${campaignName}`
              : "All leads across your Instantly.ai campaigns"}
          </p>
        </div>

        {/* Filter bar */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <Link
            href="/leads"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              !campaignFilter
                ? "bg-orange-500/10 text-orange-400 ring-1 ring-orange-400/20"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
          >
            All Campaigns
          </Link>
          {campaigns.map(c => (
            <Link
              key={c.id}
              href={`/leads?campaign=${c.id}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                campaignFilter === c.id
                  ? "bg-orange-500/10 text-orange-400 ring-1 ring-orange-400/20"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {/* Leads table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium text-center">Opens</th>
                  <th className="px-6 py-3 font-medium text-center">Replies</th>
                  <th className="px-6 py-3 font-medium text-center">Clicks</th>
                  <th className="px-6 py-3 font-medium">Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {leadsData.items.map((lead) => (
                  <tr key={lead.id} className="hover:bg-zinc-900/80 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-200">
                      {lead.first_name || lead.last_name
                        ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300">{lead.email}</span>
                        {lead.email && (
                          <Link
                            href={`/inbox?lead=${encodeURIComponent(lead.email)}`}
                            className="text-orange-400 hover:text-orange-300 text-xs"
                            title="View emails"
                          >
                            Emails
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{lead.company_name || "-"}</td>
                    <td className="px-6 py-4 text-center text-zinc-400">{lead.email_open_count ?? 0}</td>
                    <td className="px-6 py-4 text-center text-zinc-400">{lead.email_reply_count ?? 0}</td>
                    <td className="px-6 py-4 text-center text-zinc-400">{lead.email_click_count ?? 0}</td>
                    <td className="px-6 py-4">
                      <InterestBadge status={lead.lt_interest_status} />
                    </td>
                  </tr>
                ))}
                {leadsData.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                      No leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {leadsData.items.length > 0 && (
          <p className="mt-4 text-xs text-zinc-500">
            Showing {leadsData.items.length} leads
          </p>
        )}
      </div>
    </CrmLayout>
  );
}

function InterestBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-zinc-600 text-xs">-</span>;
  const colors: Record<string, string> = {
    interested: "text-green-400 bg-green-400/10 ring-green-400/20",
    "not interested": "text-red-400 bg-red-400/10 ring-red-400/20",
    "meeting booked": "text-blue-400 bg-blue-400/10 ring-blue-400/20",
    "meeting completed": "text-purple-400 bg-purple-400/10 ring-purple-400/20",
    "out of office": "text-yellow-400 bg-yellow-400/10 ring-yellow-400/20",
    closed: "text-emerald-400 bg-emerald-400/10 ring-emerald-400/20",
  };
  const color = colors[status.toLowerCase()] || "text-zinc-400 bg-zinc-400/10 ring-zinc-400/20";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>
      {status}
    </span>
  );
}
