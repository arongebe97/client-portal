require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const connectionString = process.env.DATABASE_URL

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    const email = 'admin@example.com'
    const password = 'password'

    console.log(`Seeding admin user: ${email}...`)

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.client.upsert({
        where: { email },
        update: {},
        create: {
            email,
            password_hash: hashedPassword,
            role: 'ADMIN',
        },
    })
    console.log('Admin created:', user)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
