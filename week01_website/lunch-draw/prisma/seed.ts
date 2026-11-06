// Loads categories and data/restaurants.json into the database.
// Keeps edits made in the app: existing restaurants keep their baseWeight and categories.
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { CATEGORIES } from "../src/lib/categories";

type Row = {
  number: number;
  osmId: string;
  name: string;
  nameEn: string | null;
  lat: number;
  lon: number;
  cuisine: string;
  openingHours: string | null;
  distance: number;
  walkDistance: number | null;
  categories: string[];
};

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: { label: c.label, sort: i },
      create: { id: c.id, label: c.label, sort: i },
    });
  }

  const rows: Row[] = JSON.parse(readFileSync("data/restaurants.json", "utf8"));
  let created = 0;
  for (const r of rows) {
    const { categories, ...fields } = r;
    const existing = await prisma.restaurant.findUnique({ where: { osmId: r.osmId } });
    if (existing) {
      // keep the existing number, refresh everything else from OSM
      await prisma.restaurant.update({ where: { id: existing.id }, data: { ...fields, number: existing.number } });
    } else {
      // avoid number clashes if the data was re-fetched
      const taken = await prisma.restaurant.findUnique({ where: { number: r.number } });
      const number = taken ? ((await prisma.restaurant.aggregate({ _max: { number: true } }))._max.number ?? 0) + 1 : r.number;
      await prisma.restaurant.create({
        data: {
          ...fields,
          number,
          categories: { create: categories.map((categoryId) => ({ categoryId })) },
        },
      });
      created++;
    }
  }
  console.log(`seeded ${CATEGORIES.length} categories, ${rows.length} restaurants (${created} new)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
