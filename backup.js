const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const backupDir = path.join(process.cwd(), "backups");

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const now = new Date();
const date = now.toISOString().slice(0, 10);
const time = now.toTimeString().slice(0, 8).replace(/:/g, "-");
const filename = `backup-${date}_${time}.dump`;
const outputPath = path.join(backupDir, filename);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is missing in .env");
  process.exit(1);
}

const command = `pg_dump -Fc "${databaseUrl}" -f "${outputPath}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error("Backup failed:");
    console.error(stderr || error.message);
    process.exit(1);
  }

  console.log(`Backup created: ${outputPath}`);
});