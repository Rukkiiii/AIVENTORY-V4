# Fix `#1932` errors for `inventory`, `invoices`, `invoice_items`

If phpMyAdmin shows:
- `#1932 - Table 'aiventory.inventory' doesn't exist in engine`
- `#1932 - Table 'aiventory.invoices' doesn't exist in engine`
- `#1932 - Table 'aiventory.invoice_items' doesn't exist in engine`

the InnoDB metadata still lists the tables but their files were deleted or
corrupted. Recreate them using the repair script included in this repo.

## Steps
1. In phpMyAdmin, select the `aiventory` database.
2. Open the **SQL** tab (or Import the script).
3. Paste/run `aiventory-web/fix_inventory_invoices.sql`.
   - Drops the orphaned table definitions.
   - Recreates the tables with fresh schema and FK constraints.
   - Leaves optional sample data commented out—uncomment if you want demo
     invoices/items restored.
4. Refresh the tables list; the red banners should be gone.

## Verify
```sql
SHOW TABLES LIKE 'inventory';
SHOW TABLES LIKE 'invoices';
SHOW TABLES LIKE 'invoice_items';
DESCRIBE inventory;
```

If you need demo invoices, rerun the script with the sample INSERT block
uncommented or manually insert via your app/backend.

