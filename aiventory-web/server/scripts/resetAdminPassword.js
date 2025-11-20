import mysql from "mysql2";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const email = process.argv[2] || "redjohn@gmail.com";
const newPassword = process.argv[3] || "redjohn";

if (!newPassword || newPassword.length < 4) {
  console.error("❌ Please provide a password with at least 4 characters.");
  process.exit(1);
}

console.log(`🔐 Resetting admin password for ${email} ...`);

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "aiventory",
});

db.connect(async (err) => {
  if (err) {
    console.error("❌ Unable to connect to MySQL:", err.message);
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query(
      "UPDATE admin SET admin_password = ? WHERE admin_email = ?",
      [hashedPassword, email],
      (updateErr, result) => {
        if (updateErr) {
          console.error("❌ Failed to update password:", updateErr.message);
          db.end();
          process.exit(1);
        }

        if (result.affectedRows === 0) {
          console.warn("⚠️ No admin record matched that email.");
        } else {
          console.log("✅ Password reset successfully.");
        }

        db.end();
      }
    );
  } catch (hashErr) {
    console.error("❌ Failed to generate password hash:", hashErr.message);
    db.end();
    process.exit(1);
  }
});


