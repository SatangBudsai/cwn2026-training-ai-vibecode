export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { migrateAndSeed } = await import("./lib/seed");
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await migrateAndSeed();
      return;
    } catch (err) {
      console.error(`[seed] attempt ${attempt} failed: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
