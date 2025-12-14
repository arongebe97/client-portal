import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const pool = connectionString ? new Pool({ connectionString }) : null
const adapter = pool ? new PrismaPg(pool) : null

export const prisma = globalForPrisma.prisma ||
    (adapter
        ? new PrismaClient({ adapter })
        : new PrismaClient() // Fallback for build time if env is missing, though connection will fail if used
    )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
