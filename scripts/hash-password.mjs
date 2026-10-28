import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Usage: npm run hash-password -- "your-password"   (min 8 characters)');
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
console.log("\nADMIN_PASSWORD_HASH for Vercel (paste as-is):\n" + hash);
console.log("\nADMIN_PASSWORD_HASH for .env.local (dollar signs escaped):\n" + hash.replace(/\$/g, "\\$") + "\n");
