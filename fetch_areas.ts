import { prisma } from "../src/lib/db";

async function main() {
  const areas = await prisma.preschoolDevArea.findMany();
  console.log(JSON.stringify(areas, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
