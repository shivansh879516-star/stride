import { prisma } from './utils/prisma';

async function main() {
  const d = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: 'alex@stride.fit' },
        { username: 'alex_runner' },
      ],
    },
  });
  console.log('✅ Deleted demo user Alex:', d);

  const r = await prisma.route.deleteMany({});
  console.log('✅ Cleared hardcoded routes:', r);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
