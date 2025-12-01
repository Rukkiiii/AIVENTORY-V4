import fs from "fs";
import path from "path";
import mysql from "mysql2";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

// Resolve ESM __dirname correctly on Windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the original monthly CSVs (project-root/machine-learning/notebooks)
const NOTEBOOKS_DIR = path.resolve(__dirname, "../../..", "machine-learning", "notebooks");
const CSV_PATTERN = /^Motorparts Sales - .*\.csv$/i;

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "aiventory",
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const parseCsvLine = (line) => line.split(",").map((v) => v.trim());

const normalizeHeaders = (headers) => headers.map((h) => h.trim().toLowerCase());

const parseNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
};

const main = async () => {
  console.log("📥 Importing Motorparts products and invoices from CSV...");
  console.log(`   Looking in: ${NOTEBOOKS_DIR}`);

  // Find CSV files
  const files = fs
    .readdirSync(NOTEBOOKS_DIR)
    .filter((f) => CSV_PATTERN.test(f))
    .sort();

  if (!files.length) {
    console.error("❌ No 'Motorparts Sales - *.csv' files found.");
    process.exit(1);
  }

  files.forEach((f) => console.log(`   - ${f}`));

  db.connect(async (err) => {
    if (err) {
      console.error("❌ Unable to connect to MySQL:", err.message);
      process.exit(1);
    }

    try {
      // Load existing products
      const [rows] = await db
        .promise()
        .query("SELECT Product_id, Product_name FROM product");
      const existingByName = new Map(
        rows.map((r) => [String(r.Product_name).toUpperCase().trim(), r.Product_id])
      );

      console.log(`🔍 Existing products in DB: ${rows.length}`);

      const productIds = new Map(existingByName);

      const ensureProduct = async (name, unitPrice) => {
        const key = String(name).toUpperCase().trim();
        if (!key) return null;
        if (productIds.has(key)) return productIds.get(key);

        const price = Number(unitPrice) || 0;
        const stock = Math.floor(Math.random() * 7) + 8; // 8-14
        const skuBase = key
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 12);
        const sku = `MP-${skuBase || "ITEM"}`;

        // Use supplier_id = 1 as a default fallback supplier
        const defaultSupplierId = 1;
        const [result] = await db
          .promise()
          .query(
            `INSERT INTO product 
              (Product_name, Product_sku, Product_description, Product_price, 
               Product_stock, Product_status, Product_category, reorder_level, 
               supplier_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'Active', 'Motorparts', 5, ?, NOW(), NOW())`,
            [name, sku, "", price, stock, defaultSupplierId]
          );

        const newId = result.insertId;
        productIds.set(key, newId);
        return newId;
      };

      let invoiceCount = 0;
      let itemCount = 0;
      let skippedLines = 0;

      for (const file of files) {
        const fullPath = path.join(NOTEBOOKS_DIR, file);
        console.log(`\n📄 Processing ${file} ...`);

        const content = fs.readFileSync(fullPath, "utf8");
        const lines = content.split(/\r?\n/).filter((l) => l.trim().length);
        if (lines.length < 2) {
          console.warn("   ⚠️  File has no data rows, skipping.");
          continue;
        }

        const headers = normalizeHeaders(parseCsvLine(lines[0]));
        const idxDate = headers.indexOf("date");
        const idxQty =
          headers.indexOf("quantity") >= 0
            ? headers.indexOf("quantity")
            : headers.indexOf("qty");
        const idxName = headers.indexOf("product name");
        const idxPrice = headers.indexOf("price per unit");
        const idxTotal = headers.indexOf("total");

        if (idxDate === -1 || idxQty === -1 || idxName === -1 || idxPrice === -1) {
          console.warn("   ⚠️  Missing required columns, skipping file.");
          continue;
        }

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const dateStr = cols[idxDate] || "";
          const qty = parseNumber(cols[idxQty]);
          const name = cols[idxName] || "";
          const unitPrice = parseNumber(cols[idxPrice]);
          const totalRaw = idxTotal >= 0 ? parseNumber(cols[idxTotal]) : qty * unitPrice;
          const total = Number.isNaN(totalRaw) ? qty * unitPrice : totalRaw;

          if (!dateStr || !name || qty <= 0 || unitPrice < 0) {
            skippedLines++;
            continue;
          }

          const productId = await ensureProduct(name, unitPrice);
          if (!productId) {
            skippedLines++;
            continue;
          }

          const [invoiceResult] = await db
            .promise()
            .query(
              `INSERT INTO invoices 
                (invoice_number, customer_name, customer_email, customer_phone, 
                 customer_address, invoice_date, due_date, status, subtotal, tax, total, notes)
               VALUES (?, ?, NULL, NULL, NULL, ?, ?, 'Paid', ?, 0, ?, ?)`,
              [
                `INV-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`,
                "Walk-in Customer",
                new Date(dateStr),
                new Date(dateStr),
                total,
                total,
                `Imported from ${file}`,
              ]
            );

          const invoiceId = invoiceResult.insertId;

          await db
            .promise()
            .query(
              `INSERT INTO invoice_items 
                (invoice_id, description, quantity, unit_price, product_id)
               VALUES (?, ?, ?, ?, ?)`,
              [invoiceId, name, qty, unitPrice, productId]
            );

          invoiceCount++;
          itemCount++;

          if (invoiceCount % 200 === 0) {
            console.log(`   ... created ${invoiceCount} invoices so far`);
            await sleep(50);
          }
        }
      }

      console.log("\n✅ Import completed.");
      console.log(`   Products in DB now: ${productIds.size}`);
      console.log(`   New invoices created: ${invoiceCount}`);
      console.log(`   Invoice items created: ${itemCount}`);
      console.log(`   Skipped CSV rows: ${skippedLines}`);
    } catch (e) {
      console.error("❌ Import failed:", e);
    } finally {
      db.end();
    }
  });
};

main();


