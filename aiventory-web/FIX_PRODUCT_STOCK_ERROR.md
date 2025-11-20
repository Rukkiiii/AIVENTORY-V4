# 🔧 Fix: "Unknown column Product_stock in where clause"

## ❌ **Error**
```
Error: unknown column Product_stock in where clause
```

## 🔍 **Cause**
The `product` table in your database is missing the `Product_stock` column, or it has a different name (like `stock`).

## ✅ **Solution**

### **Option 1: Run SQL Fix Script (Recommended)**

1. **Open phpMyAdmin** or MySQL command line
2. **Select the `aiventory` database**
3. **Run this SQL script:**

```sql
USE aiventory;

-- Add Product_stock column if it doesn't exist
ALTER TABLE product 
ADD COLUMN IF NOT EXISTS Product_stock INT DEFAULT 0 
AFTER Product_price;
```

**OR** if your MySQL version doesn't support `IF NOT EXISTS`:

```sql
USE aiventory;

-- Check and add column (safe to run multiple times)
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'aiventory' 
    AND TABLE_NAME = 'product' 
    AND COLUMN_NAME = 'Product_stock'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE product ADD COLUMN Product_stock INT DEFAULT 0 AFTER Product_price',
    'SELECT "Column already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

### **Option 2: Use the Fix Script**

Run the provided SQL file:

1. Open `fix_product_stock_column.sql` in phpMyAdmin
2. Execute it

### **Option 3: Use Node.js Verification Script**

```bash
cd aiventory-web/server
node verify_database_schema.js
```

This script will:
- ✅ Check if `Product_stock` column exists
- ✅ Add it if missing
- ✅ Rename `stock` to `Product_stock` if needed

### **Option 4: Recreate Database (Last Resort)**

If the table structure is completely wrong:

1. **Backup your data** (if any)
2. **Run the setup script:**
   ```sql
   -- In phpMyAdmin, select aiventory database
   -- Then import: setup_database.sql
   ```

## 🧪 **Verify Fix**

After running the fix, verify the column exists:

```sql
DESCRIBE product;
```

You should see `Product_stock` in the column list.

Or check in phpMyAdmin:
1. Click on `aiventory` database
2. Click on `product` table
3. Click "Structure" tab
4. Look for `Product_stock` column

## 📋 **Expected Table Structure**

The `product` table should have these columns:
- `Product_id` (INT, PRIMARY KEY)
- `Product_name` (VARCHAR)
- `Product_description` (TEXT)
- `Product_sku` (VARCHAR)
- `Product_price` (DECIMAL)
- **`Product_stock` (INT)** ← This is the missing one!
- `Product_category` (VARCHAR)
- `reorder_level` (INT)
- `supplier_id` (INT)
- `Product_status` (ENUM)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## 🚀 **After Fix**

1. **Restart your backend server:**
   ```bash
   cd aiventory-web/server
   npm start
   ```

2. **Test the API:**
   - Dashboard should load without errors
   - Low stock report should work
   - Product queries should work

## ⚠️ **If Error Persists**

1. Check backend console for the exact SQL query causing the error
2. Verify the database name is `aiventory`
3. Verify you're connected to the correct database
4. Check if there are multiple `product` tables in different databases

---

**The fix script is located at:** `aiventory-web/fix_product_stock_column.sql`

