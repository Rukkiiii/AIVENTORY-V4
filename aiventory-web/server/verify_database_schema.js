// Database Schema Verification Script
// Run this to check and fix the product table structure

import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "aiventory"
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1);
  }
  
  console.log("✅ Connected to MySQL database");
  
  // Check product table structure
  db.query("DESCRIBE product", (err, columns) => {
    if (err) {
      console.error("❌ Error describing product table:", err.message);
      console.error("   The 'product' table may not exist. Run setup_database.sql first.");
      process.exit(1);
    }
    
    console.log("\n📋 Current product table columns:");
    const columnNames = columns.map(col => col.Field);
    console.log("   ", columnNames.join(", "));
    
    // Check if Product_stock exists
    const hasProductStock = columnNames.includes('Product_stock');
    const hasStock = columnNames.includes('stock');
    
    if (!hasProductStock && !hasStock) {
      console.log("\n⚠️  Product_stock column not found!");
      console.log("   Adding Product_stock column...");
      
      db.query(`
        ALTER TABLE product 
        ADD COLUMN Product_stock INT DEFAULT 0 
        AFTER Product_price
      `, (alterErr) => {
        if (alterErr) {
          console.error("❌ Error adding Product_stock column:", alterErr.message);
          process.exit(1);
        }
        console.log("✅ Product_stock column added successfully");
        db.end();
      });
    } else if (hasStock && !hasProductStock) {
      console.log("\n⚠️  Found 'stock' column but not 'Product_stock'");
      console.log("   Renaming 'stock' to 'Product_stock'...");
      
      db.query(`
        ALTER TABLE product 
        CHANGE COLUMN stock Product_stock INT DEFAULT 0
      `, (renameErr) => {
        if (renameErr) {
          console.error("❌ Error renaming stock column:", renameErr.message);
          process.exit(1);
        }
        console.log("✅ Column renamed successfully");
        db.end();
      });
    } else {
      console.log("\n✅ Product_stock column exists");
      
      // Verify other required columns
      const requiredColumns = ['Product_id', 'Product_name', 'Product_sku', 'Product_price', 'Product_category', 'reorder_level'];
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log("\n⚠️  Missing columns:", missingColumns.join(", "));
        console.log("   Run setup_database.sql to fix the schema");
      } else {
        console.log("\n✅ All required columns exist");
      }
      
      db.end();
    }
  });
});

