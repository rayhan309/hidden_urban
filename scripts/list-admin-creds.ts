import { config } from "dotenv";
import dns from "node:dns";
import { resolve } from "node:path";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { dbConnect } = await import("../src/lib/dbConnect");
  const { AdminUser } = await import("../src/models/AdminUser");

  await dbConnect();
  const users = await AdminUser.find({}).select("+passwordHash").lean();

  console.log("=== Admin users in DB ===");
  if (!users.length) {
    console.log("(none found)");
  } else {
    for (const u of users) {
      console.log(`email: ${u.email}`);
      console.log(`name:  ${u.name}`);
      console.log(`role:  ${u.role}`);
      console.log(`hash:  ${u.passwordHash ? "yes (bcrypt)" : "no"}`);
      console.log("---");
    }
  }

  console.log("=== From .env (plain password source) ===");
  console.log(`SUPER_ADMIN_EMAIL=${process.env.SUPER_ADMIN_EMAIL ?? "(not set)"}`);
  console.log(`SUPER_ADMIN_PASSWORD=${process.env.SUPER_ADMIN_PASSWORD ?? "(not set)"}`);
  console.log(`SUPER_ADMIN_NAME=${process.env.SUPER_ADMIN_NAME ?? "(not set)"}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
