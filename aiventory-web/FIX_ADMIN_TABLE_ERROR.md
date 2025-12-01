# Fix phpMyAdmin `#1932 - Table 'aiventory.admin' doesn't exist in engine`

This happens when the InnoDB metadata says the `admin` table exists but the
underlying `.ibd`/`.frm` files are missing or corrupted (often after moving or
restoring `C:\xampp\mysql\data` without the InnoDB system files).

## Quick Fix
1. Open **phpMyAdmin** → select the `aiventory` database.
2. Go to the **SQL** tab (or use the **Import** tab and upload the script).
3. Run the script at `aiventory-web/fix_admin_table.sql`.
   - The script drops the orphaned `admin` table entry.
   - Recreates the table with the expected schema.
   - Seeds a default admin user (`admin` / `admin123`).
4. Refresh the tables list — the error notice should disappear.

## Verify
```sql
USE aiventory;
SHOW TABLES LIKE 'admin';
SELECT admin_id, admin_username, admin_email FROM admin;
```

You should see the `admin` table and the seeded account. You can now log in
using the default credentials (or update the password via the backend reset
script in `server/scripts/resetAdminPassword.js`).

If other tables show the same `#1932` error, restore them using their matching
`fix_*.sql` scripts or re-run `setup_database.sql`.

