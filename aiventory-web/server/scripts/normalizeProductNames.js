import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "aiventory",
});

const normalizeKey = (name) => {
  if (!name) return "";
  return String(name)
    .toUpperCase()
    .replace(/[\s\-_/]+/g, "") // remove spaces and separators
    .replace(/[\(\)\[\]\{\}]/g, "") // remove brackets
    .replace(/[^A-Z0-9]/g, ""); // keep only letters/numbers
};

const main = async () => {
  console.log("🧹 Normalizing product names to full names (longest variant)...");

  db.connect(async (err) => {
    if (err) {
      console.error("❌ Unable to connect to MySQL:", err.message);
      process.exit(1);
    }

    try {
      const [rows] = await db
        .promise()
        .query("SELECT Product_id, Product_name FROM product");

      console.log(`🔍 Loaded ${rows.length} products from database.`);

      // Group by normalized key
      const groups = new Map();
      for (const row of rows) {
        const name = row.Product_name || "";
        const key = normalizeKey(name);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
      }

      let updateCount = 0;
      let groupCount = 0;

      for (const [key, items] of groups.entries()) {
        if (items.length < 2) continue; // only care about duplicates
        groupCount++;

        // Choose the longest non-empty name as the "full name"
        const canonical = items.reduce((best, current) => {
          const currentName = String(current.Product_name || "").trim();
          const bestName = String(best.Product_name || "").trim();
          return currentName.length > bestName.length ? current : best;
        });

        const fullName = String(canonical.Product_name || "").trim();
        if (!fullName) continue;

        // Update all other products in the group to use the full name
        const toUpdate = items.filter(
          (p) => String(p.Product_name || "").trim() !== fullName
        );

        if (!toUpdate.length) continue;

        const ids = toUpdate.map((p) => p.Product_id);
        console.log(
          `➡️  Group ${groupCount}: setting ${ids.length} product(s) to "${fullName}"`
        );

        const [result] = await db
          .promise()
          .query(
            `UPDATE product SET Product_name = ? WHERE Product_id IN (${ids
              .map(() => "?")
              .join(",")})`,
            [fullName, ...ids]
          );

        updateCount += result.affectedRows || 0;
      }

      console.log("");
      console.log("✅ Product name normalization complete.");
      console.log(`   Groups with duplicates: ${groupCount}`);
      console.log(`   Products renamed to full names: ${updateCount}`);
    } catch (e) {
      console.error("❌ Normalization failed:", e);
    } finally {
      db.end();
    }
  });
};

main();


