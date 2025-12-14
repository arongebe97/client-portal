# Instantly.ai Client Portal - Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Authentication System](#authentication-system)
4. [Instantly.ai API Integration](#instantlyai-api-integration)
5. [Webhook Implementation](#webhook-implementation)
6. [API Endpoints](#api-endpoints)
7. [Data Flow](#data-flow)
8. [Environment Variables](#environment-variables)

---

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 5.22
- **Authentication**: NextAuth.js v4
- **Hosting**: Vercel
- **External API**: Instantly.ai V2 API

### Application Structure
```
src/
├── app/
│   ├── admin/                    # Admin dashboard routes
│   │   ├── layout.tsx           # Admin layout with role guard
│   │   ├── page.tsx             # Client list view
│   │   └── clients/
│   │       ├── new/             # Create new client
│   │       │   ├── page.tsx
│   │       │   └── actions.ts
│   │       └── [id]/            # Manage specific client
│   │           ├── page.tsx
│   │           └── actions.ts
│   ├── campaigns/               # Client-facing campaign views
│   │   ├── page.tsx            # Campaign list
│   │   └── [id]/               # Campaign detail
│   │       └── page.tsx
│   ├── login/                   # Authentication
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   │   └── route.ts
│   │   └── instantly/webhook/   # Webhook receiver
│   │       └── event/
│   │           └── route.ts
│   └── page.tsx                 # Client dashboard (root)
├── lib/
│   ├── authOptions.ts           # NextAuth configuration
│   ├── prisma.ts                # Prisma client singleton
│   └── instantly.ts             # Instantly.ai API wrapper
├── types/
│   └── next-auth.d.ts           # TypeScript type extensions
└── middleware.ts                # Route protection
```

---

## Database Schema

### Tables

#### `Client`
Stores user accounts (both ADMIN and CLIENT roles).

```prisma
model Client {
  id                    String   @id @default(uuid())
  email                 String   @unique
  password_hash         String
  role                  String   @default("CLIENT") // "ADMIN" or "CLIENT"
  instantly_campaign_id String?  // Legacy field (optional)
  created_at            DateTime @default(now())
  
  // Relations
  stats                 Campaign_Stats[]
  activityLogs          Activity_Log[]
  campaigns             CampaignAccess[]
}
```

**Key Points:**
- `role`: Determines access level (ADMIN can manage clients, CLIENT can only view assigned campaigns)
- `password_hash`: bcrypt-hashed password (salt rounds: 10)
- `email`: Used as unique identifier for login

#### `CampaignAccess`
Links clients to their assigned Instantly.ai campaigns.

```prisma
model CampaignAccess {
  id                    String @id @default(uuid())
  client_id             String
  instantly_campaign_id String 
  campaign_name         String?
  
  client                Client @relation(fields: [client_id], references: [id])
  
  @@unique([client_id, instantly_campaign_id])
}
```

**Key Points:**
- `instantly_campaign_id`: The campaign ID from Instantly.ai
- `campaign_name`: Cached name for display (synced from Instantly API)
- Composite unique constraint prevents duplicate assignments

#### `Campaign_Stats`
Aggregated statistics per client.

```prisma
model Campaign_Stats {
  id               String   @id @default(uuid())
  client_id        String
  date             DateTime @default(now())
  emails_sent      Int      @default(0)
  opens            Int      @default(0)
  replies          Int      @default(0)
  positive_replies Int      @default(0)
  bounces          Int      @default(0)
  
  client           Client @relation(fields: [client_id], references: [id])
}
```

**Key Points:**
- Stats are aggregated PER CLIENT (not per campaign)
- Updated via webhooks using increment operations
- `date` field allows for daily stat tracking (future enhancement)

#### `Activity_Log`
Event log for client-specific activities.

```prisma
model Activity_Log {
  id           String   @id @default(uuid())
  client_id    String
  event_type   String   // 'reply_received', 'email_opened', etc.
  lead_email   String
  message_body String?
  timestamp    DateTime @default(now())
  
  client       Client @relation(fields: [client_id], references: [id])
}
```

**Key Points:**
- Records individual events from webhooks
- Used to populate activity feeds in client dashboards
- `event_type`: Maps to Instantly.ai webhook event types

---

## Authentication System

### NextAuth.js Configuration

**File**: `src/lib/authOptions.ts`

#### Credentials Provider
Uses email/password authentication with bcrypt verification.

```typescript
CredentialsProvider({
  async authorize(credentials) {
    // 1. Find user by email
    const user = await prisma.client.findUnique({
      where: { email: credentials.email }
    });
    
    // 2. Verify password
    const isValid = await bcrypt.compare(
      credentials.password,
      user.password_hash
    );
    
    // 3. Return user object with role
    return {
      id: user.id,
      email: user.email,
      role: user.role
    };
  }
})
```

#### JWT Callbacks
Extends JWT token with custom fields.

```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.role = user.role;
      token.id = user.id;
    }
    return token;
  }
}
```

#### Session Callbacks
Makes role and ID available in session object.

```typescript
async session({ session, token }) {
  session.user.role = token.role;
  session.user.id = token.id;
  return session;
}
```

### Middleware Protection

**File**: `src/middleware.ts`

Protects routes based on authentication and role:

```typescript
export default withAuth(
  function middleware(req) {
    const isAdminPage = req.nextUrl.pathname.startsWith("/admin");
    
    // Redirect non-admins trying to access /admin
    if (isAdminPage && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
);

export const config = {
  matcher: ["/", "/admin/:path*", "/campaigns/:path*"]
};
```

---

## Instantly.ai API Integration

### API Wrapper

**File**: `src/lib/instantly.ts`

#### Base Configuration
```typescript
const INSTANTLY_API_URL = "https://api.instantly.ai/api/v2";
const apiKey = process.env.INSTANTLY_API_KEY;
```

#### Fetching Campaigns

```typescript
export async function getInstantlyCampaigns(): Promise<InstantlyCampaign[]> {
  const response = await fetch(
    `${INSTANTLY_API_URL}/campaigns/list?limit=100`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    }
  );
  
  const data = await response.json();
  return data; // Array of campaign objects
}
```

**Response Format:**
```typescript
interface InstantlyCampaign {
  id: string;
  name: string;
  status: number;
  email_gap: number;
  // Additional fields as needed
}
```

### Usage in Admin Interface

**File**: `src/app/admin/clients/[id]/page.tsx`

When an admin manages a client:
1. Fetch all campaigns from Instantly.ai
2. Load existing assignments from database
3. Display checkbox list
4. On save, sync selections to `CampaignAccess` table

```typescript
const allCampaigns = await getInstantlyCampaigns();
const assignedCampaignIds = new Set(
  client.campaigns.map(c => c.instantly_campaign_id)
);
```

---

## Webhook Implementation

### Endpoint

**File**: `src/app/api/instantly/webhook/event/route.ts`

**URL**: `POST /api/instantly/webhook/event`

### Security

#### Signature Verification (Recommended)
```typescript
const WEBHOOK_SECRET = process.env.INSTANTLY_WEBHOOK_SECRET;

// Note: Implement HMAC verification based on Instantly.ai docs
// const signature = headers().get("x-instantly-signature");
// const computed = crypto.createHmac("sha256", WEBHOOK_SECRET)
//   .update(rawBody).digest("hex");
```

### Event Processing

#### 1. Parse Webhook Payload
```typescript
const { event_type, campaign_id, lead_email, message_body } = body;
```

**Expected Event Types:**
- `email_sent`
- `email_opened`
- `reply_received`

#### 2. Find Campaign Owners
```typescript
const owners = await prisma.campaignAccess.findMany({
  where: { instantly_campaign_id: campaign_id },
  include: { client: true }
});
```

#### 3. Update Stats and Logs
For each owner:

**Log Activity:**
```typescript
await prisma.activity_Log.create({
  data: {
    client_id: owner.client_id,
    event_type,
    lead_email,
    message_body
  }
});
```

**Update Aggregated Stats:**
```typescript
const updateData = {};
if (event_type === "email_sent") updateData.emails_sent = { increment: 1 };
if (event_type === "email_opened") updateData.opens = { increment: 1 };
if (event_type === "reply_received") updateData.replies = { increment: 1 };

await prisma.campaign_Stats.update({
  where: { id: lastStat.id },
  data: updateData
});
```

### Webhook Setup in Instantly.ai

1. Navigate to Campaign Settings > Webhooks
2. Add webhook URL: `https://[your-domain].vercel.app/api/instantly/webhook/event`
3. Select events: `Email Sent`, `Email Opened`, `Reply Received`
4. (Optional) Configure signature secret

---

## API Endpoints

### Authentication

#### `POST /api/auth/callback/credentials`
NextAuth.js credential authentication endpoint.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ADMIN"
  }
}
```

### Admin Actions (Server Actions)

#### Create Client
**File**: `src/app/admin/clients/new/actions.ts`

```typescript
export async function createClient(formData: FormData)
```

**Input:**
- `email`: Client email
- `password`: Plain text password (will be hashed)

**Process:**
1. Validate input
2. Check for existing user
3. Hash password (bcrypt, 10 rounds)
4. Create `Client` record with role "CLIENT"
5. Revalidate `/admin` path

#### Update Campaign Assignments
**File**: `src/app/admin/clients/[id]/actions.ts`

```typescript
export async function updateClientCampaigns(formData: FormData)
```

**Input:**
- `clientId`: UUID of client
- `campaignIds`: Array of JSON strings `{id, name}`

**Process:**
1. Parse campaign data
2. Start transaction
3. Delete all existing `CampaignAccess` for client
4. Create new records for selected campaigns
5. Commit transaction
6. Revalidate paths

---

## Data Flow

### Admin Creates Client

```mermaid
sequenceDiagram
    Admin->>+Form: Enter email & password
    Form->>+Server Action: createClient()
    Server Action->>+bcrypt: Hash password
    bcrypt-->>-Server Action: hashed_password
    Server Action->>+Database: INSERT Client
    Database-->>-Server Action: Success
    Server Action->>+Cache: Revalidate /admin
    Server Action-->>-Form: {success: true}
    Form->>Admin: Redirect to /admin
```

### Admin Assigns Campaigns

```mermaid
sequenceDiagram
    Admin->>+Page: Navigate to /admin/clients/[id]
    Page->>+Instantly API: GET /campaigns/list
    Instantly API-->>-Page: Campaign list
    Page->>+Database: GET CampaignAccess for client
    Database-->>-Page: Assigned campaigns
    Page->>Admin: Display checkbox form
    Admin->>+Form: Select campaigns & submit
    Form->>+Server Action: updateClientCampaigns()
    Server Action->>+Database: DELETE old assignments
    Server Action->>Database: INSERT new assignments
    Database-->>-Server Action: Success
    Server Action-->>-Form: {success: true}
    Form->>Admin: Redirect to /admin
```

### Webhook Event Processing

```mermaid
sequenceDiagram
    Instantly.ai->>+Webhook: POST event
    Webhook->>Webhook: Verify signature (optional)
    Webhook->>+Database: Find campaign owners
    Database-->>-Webhook: Client IDs
    loop For each owner
        Webhook->>+Database: INSERT Activity_Log
        Webhook->>Database: UPDATE Campaign_Stats (increment)
    end
    Database-->>-Webhook: Success
    Webhook-->>-Instantly.ai: 200 OK
```

### Client Views Dashboard

```mermaid
sequenceDiagram
    Client->>+Auth: Login
    Auth->>+Database: Verify credentials
    Database-->>-Auth: User + Role
    Auth-->>-Client: Session with role="CLIENT"
    Client->>+Dashboard: Navigate to /
    Dashboard->>+Middleware: Check auth & role
    Middleware-->>-Dashboard: Authorized
    Dashboard->>+Database: GET CampaignAccess WHERE client_id
    Database-->>-Dashboard: Campaign IDs
    Dashboard->>+Database: GET Campaign_Stats WHERE client_id
    Database-->>-Dashboard: Aggregated stats
    Dashboard->>+Database: GET Activity_Log WHERE client_id
    Database-->>-Dashboard: Recent events
    Dashboard->>Client: Render stats & activity
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1` |
| `NEXTAUTH_SECRET` | Secret for encrypting session tokens | Random 32+ char string |
| `NEXTAUTH_URL` | Base URL of the application | `https://portal.yourdomain.com` |
| `INSTANTLY_API_KEY` | Instantly.ai V2 API key | From Instantly.ai dashboard |
| `INSTANTLY_WEBHOOK_SECRET` | Secret for webhook signature verification | Random string (shared with Instantly) |

### Local Development

Create `.env` file:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
INSTANTLY_API_KEY="your-api-key"
INSTANTLY_WEBHOOK_SECRET="your-webhook-secret"
```

### Production (Vercel)

Add all variables in:
**Vercel Dashboard > Project > Settings > Environment Variables**

**Important Notes:**
- Use Session/Transaction mode connection string for Supabase
- Add `?pgbouncer=true&connection_limit=1` to prevent prepared statement errors
- Ensure `NEXTAUTH_URL` matches your production domain

---

## Common Issues & Solutions

### Issue: "prepared statement already exists"
**Cause**: Using Supabase transaction pooler (port 6543) without pgbouncer flag  
**Solution**: Add `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`

### Issue: Cannot create clients
**Cause**: Database connection issue or missing permissions  
**Solution**: Check DATABASE_URL, verify Prisma client is generated (`npx prisma generate`)

### Issue: Webhooks not updating stats
**Cause**: Campaign not assigned to any client  
**Solution**: Ensure campaign is linked in `CampaignAccess` table before events arrive

### Issue: "Invalid credentials" on login
**Cause**: Typo in `authorize` function or user not in database  
**Solution**: Verify spelling of `authorize` (not `authorise`), check user exists in DB

---

## Deployment Checklist

- [ ] Push all code to GitHub
- [ ] Import repository to Vercel
- [ ] Add all environment variables
- [ ] Deploy (Vercel auto-builds)
- [ ] Run `npx prisma db push` locally to create tables
- [ ] Run `node seed_admin.js` to create admin user
- [ ] Configure webhooks in Instantly.ai dashboard
- [ ] Test login as admin
- [ ] Test creating client
- [ ] Test assigning campaigns
- [ ] Test webhook delivery (send test email in Instantly)

---

## Further Development

### Recommended Enhancements

1. **Password Reset Flow**
   - Add forgot password functionality
   - Email verification for new clients

2. **Enhanced Analytics**
   - Charts/graphs for campaign performance
   - Date range filters
   - Export to CSV

3. **Multi-tenancy**
   - Allow multiple agencies
   - Agency-level isolation

4. **Real-time Updates**
   - WebSocket integration for live stats
   - Push notifications for replies

5. **Audit Logging**
   - Track admin actions
   - Client login history

---

## Support & Resources

- **Instantly.ai API Docs**: https://developer.instantly.ai
- **NextAuth.js Docs**: https://next-auth.js.org
- **Prisma Docs**: https://www.prisma.io/docs
- **Supabase Docs**: https://supabase.com/docs

---

*Last Updated: December 14, 2024*
