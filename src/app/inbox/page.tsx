import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import CrmLayout from "@/components/CrmLayout";
import { getInstantlyEmails, getInstantlyCampaigns } from "@/lib/instantly";

interface Props {
  searchParams: Promise<{ campaign?: string; lead?: string; filter?: string }>;
}

export default async function InboxPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const { campaign, lead, filter } = await searchParams;

  const isUnread = filter === "unread" ? true : undefined;

  const [emails, campaigns] = await Promise.all([
    getInstantlyEmails({
      campaign_id: campaign,
      lead: lead,
      email_type: "received",
      is_unread: isUnread,
      limit: 50,
      sort_order: "desc",
    }),
    getInstantlyCampaigns(),
  ]);

  const unreadCount = emails.filter(e => e.is_unread === 1).length;

  return (
    <CrmLayout userEmail={session.user.email || ""} isAdmin={isAdmin}>
      <div className="p-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inbox</h1>
            <p className="text-zinc-400 mt-1">
              {lead
                ? `Emails from: ${lead}`
                : "All incoming emails from your campaigns"}
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-sm font-medium text-orange-400 ring-1 ring-inset ring-orange-400/20">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Filter bar */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <Link
            href="/inbox"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              !filter && !campaign
                ? "bg-orange-500/10 text-orange-400 ring-1 ring-orange-400/20"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
          >
            All
          </Link>
          <Link
            href="/inbox?filter=unread"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-orange-500/10 text-orange-400 ring-1 ring-orange-400/20"
                : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            }`}
          >
            Unread
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          {campaigns.map(c => (
            <Link
              key={c.id}
              href={`/inbox?campaign=${c.id}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                campaign === c.id
                  ? "bg-orange-500/10 text-orange-400 ring-1 ring-orange-400/20"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {/* Email list */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden divide-y divide-zinc-800">
          {emails.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="mx-auto h-12 w-12 text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <p className="text-lg font-medium text-zinc-500">No emails found</p>
              <p className="mt-1 text-sm text-zinc-600">Incoming emails from leads will appear here.</p>
            </div>
          ) : (
            emails.map((email) => (
              <Link
                key={email.id}
                href={`/inbox/${email.id}`}
                className="block px-6 py-4 hover:bg-zinc-900/80 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Unread indicator */}
                  <div className="pt-1.5 shrink-0">
                    {email.is_unread === 1 ? (
                      <span className="block h-2.5 w-2.5 rounded-full bg-orange-400" />
                    ) : (
                      <span className="block h-2.5 w-2.5 rounded-full bg-transparent" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className={`text-sm truncate ${email.is_unread === 1 ? "font-semibold text-white" : "text-zinc-300"}`}>
                        {email.from_address_email}
                      </p>
                      <span className="text-xs text-zinc-500 shrink-0">
                        {formatDate(email.timestamp_email)}
                      </span>
                    </div>
                    <p className={`text-sm truncate mt-0.5 ${email.is_unread === 1 ? "text-zinc-200" : "text-zinc-400"}`}>
                      {email.subject || "(no subject)"}
                    </p>
                    <p className="text-xs text-zinc-500 truncate mt-1">
                      {email.body?.text?.substring(0, 120) || "(no preview)"}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {email.is_auto_reply === 1 && (
                      <span className="rounded px-1.5 py-0.5 text-xs bg-yellow-400/10 text-yellow-400">Auto</span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {emails.length > 0 && (
          <p className="mt-4 text-xs text-zinc-500">Showing {emails.length} emails</p>
        )}
      </div>
    </CrmLayout>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (diffHours < 168) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
