const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";

export interface InstantlyCampaign {
    id: string;
    name: string;
    status: number;
    email_gap: number;
    // Add other fields if needed
}

export async function getInstantlyCampaigns(): Promise<InstantlyCampaign[]> {
    const apiKey = process.env.INSTANTLY_API_KEY;
    if (!apiKey) {
        console.error("INSTANTLY_API_KEY is not defined");
        return [];
    }

    try {
        const response = await fetch(`${INSTANTLY_API_URL}/campaigns/list?limit=100`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
            next: { revalidate: 300 }, // Cache for 5 minutes
        });

        if (!response.ok) {
            console.error(`Failed to fetch campaigns: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return [];
        }

        const data = await response.json();
        return data || []; // Adjust based on actual API response structure (sometimes it's data.data)
    } catch (error) {
        console.error("Error fetching Instantly campaigns:", error);
        return [];
    }
}
