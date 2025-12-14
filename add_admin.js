require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'aron@tomorrowlab.digital';
    const password = 'Bogyi6666';

    console.log(`Creating admin user: ${email}...`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.client.upsert({
        where: { email },
        update: {},
        create: {
            email,
            password_hash: hashedPassword,
            role: 'ADMIN',
        },
    });

    console.log('Admin created:', user);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
