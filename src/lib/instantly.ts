const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

function getApiKey(): string | null {
  return process.env.INSTANTLY_API_KEY || null;
}

function authHeaders(): Record<string, string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("INSTANTLY_API_KEY is not defined");
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

// ─── Types ───────────────────────────────────────────────────────────

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: number;
  email_gap?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CampaignAnalytics {
  campaign_name: string;
  campaign_id: string;
  campaign_status: number;
  leads_count: number;
  contacted_count: number;
  emails_sent_count: number;
  new_leads_contacted_count: number;
  open_count: number;
  open_count_unique: number;
  reply_count: number;
  reply_count_unique: number;
  bounced_count: number;
  unsubscribed_count: number;
  completed_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
  link_click_count: number;
  link_click_count_unique: number;
  campaign_is_evergreen: boolean;
}

export interface InstantlyLead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  website?: string;
  status?: string;
  interest_status?: string;
  campaign?: string;
  campaign_name?: string;
  email_open_count?: number;
  email_reply_count?: number;
  email_click_count?: number;
  timestamp_created?: string;
  timestamp_updated?: string;
  lt_interest_status?: string;
}

export interface InstantlyEmail {
  id: string;
  timestamp_created: string;
  timestamp_email: string;
  message_id: string;
  subject: string;
  from_address_email: string;
  to_address_email_list: string[];
  cc_address_email_list?: string[];
  body: {
    text?: string;
    html?: string;
  };
  campaign_id: string;
  eaccount: string;
  lead?: string;
  lead_id?: string;
  is_unread: number;
  is_auto_reply: number;
  ai_interest_value?: number;
  thread_id?: string;
  email_type?: string;
  i_status?: string;
}

// ─── Campaigns ───────────────────────────────────────────────────────

export async function getInstantlyCampaigns(): Promise<InstantlyCampaign[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("INSTANTLY_API_KEY is not defined");
    return [];
  }

  try {
    const response = await fetch(`${INSTANTLY_API_URL}/campaigns?limit=100`, {
      headers: authHeaders(),
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`Failed to fetch campaigns: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    // API may return { items: [...] } or directly an array
    return data.items || data || [];
  } catch (error) {
    console.error("Error fetching Instantly campaigns:", error);
    return [];
  }
}

export async function getInstantlyCampaign(id: string): Promise<InstantlyCampaign | null> {
  try {
    const response = await fetch(`${INSTANTLY_API_URL}/campaigns/${id}`, {
      headers: authHeaders(),
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return null;
  }
}

// ─── Campaign Analytics ──────────────────────────────────────────────

export async function getCampaignAnalytics(campaignId?: string): Promise<CampaignAnalytics[]> {
  try {
    const params = new URLSearchParams();
    if (campaignId) params.set("id", campaignId);

    const response = await fetch(
      `${INSTANTLY_API_URL}/campaigns/analytics?${params.toString()}`,
      {
        headers: authHeaders(),
        next: { revalidate: 120 },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch analytics: ${response.status}`);
      return [];
    }

    const data = await response.json();
    // Response could be array directly, or wrapped in { data: [...] } or { items: [...] }
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  } catch (error) {
    console.error("Error fetching campaign analytics:", error);
    return [];
  }
}

// ─── Leads ───────────────────────────────────────────────────────────

export async function getInstantlyLeads(params: {
  campaign_id?: string;
  limit?: number;
  starting_after?: string;
  interest_status?: string;
}): Promise<{ items: InstantlyLead[]; next_starting_after?: string }> {
  try {
    const body: Record<string, unknown> = {
      limit: params.limit || 50,
    };
    if (params.campaign_id) body.campaign_id = params.campaign_id;
    if (params.starting_after) body.starting_after = params.starting_after;
    if (params.interest_status) body.interest_status = params.interest_status;

    const response = await fetch(`${INSTANTLY_API_URL}/leads/list`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`Failed to fetch leads: ${response.status}`);
      return { items: [] };
    }

    const data = await response.json();
    return {
      items: data.items || data || [],
      next_starting_after: data.next_starting_after,
    };
  } catch (error) {
    console.error("Error fetching leads:", error);
    return { items: [] };
  }
}

// ─── Emails ──────────────────────────────────────────────────────────

export async function getInstantlyEmails(params: {
  campaign_id?: string;
  email_type?: string;
  is_unread?: boolean;
  lead?: string;
  limit?: number;
  sort_order?: "asc" | "desc";
}): Promise<InstantlyEmail[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.campaign_id) searchParams.set("campaign_id", params.campaign_id);
    if (params.email_type) searchParams.set("email_type", params.email_type);
    if (params.is_unread !== undefined) searchParams.set("is_unread", String(params.is_unread));
    if (params.lead) searchParams.set("lead", params.lead);
    searchParams.set("limit", String(params.limit || 50));
    if (params.sort_order) searchParams.set("sort_order", params.sort_order);

    const response = await fetch(
      `${INSTANTLY_API_URL}/emails?${searchParams.toString()}`,
      {
        headers: authHeaders(),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch emails: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.items || data || [];
  } catch (error) {
    console.error("Error fetching emails:", error);
    return [];
  }
}

export async function getInstantlyEmail(id: string): Promise<InstantlyEmail | null> {
  try {
    const response = await fetch(`${INSTANTLY_API_URL}/emails/${id}`, {
      headers: authHeaders(),
      cache: "no-store",
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error fetching email:", error);
    return null;
  }
}

// ─── Reply to Email ──────────────────────────────────────────────────

export async function replyToEmail(params: {
  reply_to_uuid: string;
  eaccount: string;
  body: { text?: string; html?: string };
  subject?: string;
}): Promise<InstantlyEmail | null> {
  try {
    const response = await fetch(`${INSTANTLY_API_URL}/emails/reply`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Failed to reply: ${response.status} ${text}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error replying to email:", error);
    return null;
  }
}
