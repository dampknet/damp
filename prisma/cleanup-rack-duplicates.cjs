/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // remove wrongly spelled subcategory assets
  await prisma.asset.deleteMany({
    where: { assetName: { in: ["Mikrotic router board", "Mikrotic Router Board"] } },
  });

  // if "Modem" duplicated in a bad way, keep just one by deleting extras where same site + category + name
  // (simple approach: delete assets named "Modem 2", "Modem 3" etc if they exist)
  await prisma.asset.deleteMany({
    where: { assetName: { in: ["Modem 2", "Modem 3", "Modem 4"] } },
  });

  console.log("Rack duplicates cleaned ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
