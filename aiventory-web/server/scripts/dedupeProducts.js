import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "aiventory",
});

const main = async () => {
  console.log("🧹 Deduplicating products so each Product_name is unique...");

  db.connect(async (err) => {
    if (err) {
      console.error("❌ Unable to connect to MySQL:", err.message);
      process.exit(1);
    }

    try {
      const [products] = await db
        .promise()
        .query(
          "SELECT Product_id, Product_name FROM product ORDER BY Product_name ASC, Product_id ASC"
        );

      console.log(`🔍 Loaded ${products.length} products from database.`);

      // Group by exact Product_name (already normalized to full names)
      const groups = new Map();
      for (const row of products) {
        const nameKey = String(row.Product_name || "").trim();
        if (!nameKey) continue;
        if (!groups.has(nameKey)) groups.set(nameKey, []);
        groups.get(nameKey).push(row);
      }

      const dupGroups = [];
      for (const [name, items] of groups.entries()) {
        if (items.length > 1) {
          dupGroups.push({ name, items });
        }
      }

      if (!dupGroups.length) {
        console.log("✅ No duplicate product names found. Nothing to do.");
        db.end();
        return;
      }

      console.log(`⚠️ Found ${dupGroups.length} name groups with duplicates.`);

      let totalDeleted = 0;
      let totalRepointed = 0;

      for (const group of dupGroups) {
        const { name, items } = group;
        // Keep the product with the smallest Product_id as canonical
        const sorted = [...items].sort(
          (a, b) => Number(a.Product_id) - Number(b.Product_id)
        );
        const canonical = sorted[0];
        const duplicates = sorted.slice(1);

        if (!duplicates.length) continue;

        const dupIds = duplicates.map((p) => p.Product_id);
        console.log(
          `➡️  "${name}": keeping Product_id=${canonical.Product_id}, removing duplicates: ${dupIds.join(
            ", "
          )}`
        );

        // Repoint foreign keys in inventory, invoice_items, order_item
        const tablesToUpdate = [
          { table: "inventory", column: "product_id" },
          { table: "invoice_items", column: "product_id" },
          { table: "order_item", column: "product_id" },
        ];

        for (const { table, column } of tablesToUpdate) {
          const [result] = await db
            .promise()
            .query(
              `UPDATE ${table} SET ${column} = ? WHERE ${column} IN (${dupIds
                .map(() => "?")
                .join(",")})`,
              [canonical.Product_id, ...dupIds]
            )
            .catch((e) => {
              // Table might not exist in this schema; log and continue
              console.warn(
                `   ⚠️  Skipping update for table "${table}": ${e.message}`
              );
              return [{ affectedRows: 0 }];
            });

          totalRepointed += result.affectedRows || 0;
        }

        // Delete duplicate product rows
        const [delResult] = await db
          .promise()
          .query(
            `DELETE FROM product WHERE Product_id IN (${dupIds
              .map(() => "?")
              .join(",")})`,
            dupIds
          );

        totalDeleted += delResult.affectedRows || 0;
      }

      console.log("");
      console.log("✅ Product deduplication complete.");
      console.log(`   Products deleted (duplicates): ${totalDeleted}`);
      console.log(
        `   Foreign key references repointed to canonical products: ${totalRepointed}`
      );
    } catch (e) {
      console.error("❌ Deduplication failed:", e);
    } finally {
      db.end();
    }
  });
};

main();


