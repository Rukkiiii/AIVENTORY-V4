# Fix XAMPP MySQL "Shutdown Unexpectedly" Error

## Quick Fix Steps (Try in Order)

### Step 1: Check if Port 3306 is Already in Use

The most common cause is another MySQL service running on port 3306.

1. **Open Command Prompt as Administrator**
2. **Check what's using port 3306:**
   ```powershell
   netstat -ano | findstr :3306
   ```
3. **If you see a PID (Process ID), check what it is:**
   ```powershell
   tasklist | findstr [PID_NUMBER]
   ```
4. **Stop the conflicting service:**
   - If it's a Windows MySQL service:
     ```powershell
     net stop MySQL80
     # or
     net stop MySQL
     ```
   - Or use Services (Win+R → `services.msc`) and stop "MySQL" service

### Step 2: Check MySQL Error Logs

1. In XAMPP Control Panel, click **"Logs"** button next to MySQL
2. Look for the actual error message (usually shows the root cause)
3. Common errors:
   - **Port already in use** → Follow Step 1
   - **InnoDB corruption** → Follow Step 4
   - **Access denied** → Follow Step 5
   - **Missing files** → Follow Step 6

### Step 3: Stop All MySQL Services

1. Open **Services** (Win+R → `services.msc`)
2. Find any **MySQL** services
3. Right-click → **Stop**
4. Set Startup Type to **Manual** (to prevent auto-start)
5. Try starting MySQL from XAMPP again

### Step 4: Fix InnoDB Corruption (If Logs Show InnoDB Errors)

If error logs mention "InnoDB" or "corruption":

1. **Stop MySQL** in XAMPP (if running)
2. **Backup your data** (copy `C:\xampp\mysql\data\aiventory` folder)
3. **Delete InnoDB log files:**
   ```powershell
   # Navigate to MySQL data directory
   cd C:\xampp\mysql\data
   
   # Delete these files (if they exist):
   del ib_logfile0
   del ib_logfile1
   del ibdata1
   ```
4. **Start MySQL** from XAMPP
5. If it still fails, you may need to restore from backup

### Step 5: Check File Permissions

1. **Right-click** on `C:\xampp\mysql\data` folder
2. **Properties** → **Security** tab
3. Ensure your user has **Full Control**
4. If not, click **Edit** → Add your user → Check **Full Control** → **Apply**

### Step 6: Reinstall MySQL in XAMPP (Last Resort)

**⚠️ WARNING: This will delete all your databases! Backup first!**

1. **Export your databases:**
   - Use phpMyAdmin (if accessible)
   - Or copy `C:\xampp\mysql\data\aiventory` folder
2. **Stop MySQL** in XAMPP
3. **Rename the data folder:**
   ```powershell
   ren C:\xampp\mysql\data C:\xampp\mysql\data_backup
   ```
4. **Create new data folder:**
   ```powershell
   mkdir C:\xampp\mysql\data
   ```
5. **Copy default MySQL files:**
   - Copy `ibdata1`, `ib_logfile0`, `ib_logfile1` from backup (if needed)
   - Or let MySQL recreate them
6. **Start MySQL** from XAMPP
7. **Restore your databases** from backup

### Step 7: Check Windows Event Viewer

1. Press **Win+R** → Type `eventvwr.msc` → Enter
2. Go to **Windows Logs** → **Application**
3. Look for **MySQL** or **MariaDB** errors
4. Read the error details for more clues

### Step 8: Use Alternative MySQL Port

If port 3306 is permanently blocked:

1. **Edit MySQL configuration:**
   - Open `C:\xampp\mysql\bin\my.ini` (or `my.cnf`)
   - Find `port=3306`
   - Change to `port=3307` (or any unused port)
2. **Update your backend `.env` file:**
   ```env
   DB_HOST=localhost
   DB_PORT=3307
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=aiventory
   ```
3. **Restart MySQL** from XAMPP

## Quick Diagnostic Commands

Run these in PowerShell (as Administrator) to diagnose:

```powershell
# Check if port 3306 is in use
netstat -ano | findstr :3306

# Check MySQL services
Get-Service | Where-Object {$_.Name -like "*mysql*"}

# Check if MySQL process is running
Get-Process | Where-Object {$_.ProcessName -like "*mysql*"}

# Check XAMPP MySQL data directory exists
Test-Path C:\xampp\mysql\data
```

## Most Common Solution

**90% of the time, the fix is:**

1. Stop Windows MySQL service:
   ```powershell
   net stop MySQL80
   ```
2. Set it to Manual in Services
3. Start MySQL from XAMPP

## After Fixing

Once MySQL starts successfully:

1. **Verify connection:**
   ```powershell
   mysql -u root -p
   # Press Enter (empty password)
   ```

2. **Check your database exists:**
   ```sql
   SHOW DATABASES;
   USE aiventory;
   SHOW TABLES;
   ```

3. **Start your backend server:**
   ```powershell
   cd aiventory-web/server
   npm start
   ```

You should see: `✅ Connected to MySQL database`

## Still Not Working?

If none of these work, the issue might be:
- **Antivirus blocking MySQL** → Add XAMPP to exclusions
- **Windows Firewall blocking** → Allow MySQL through firewall
- **Corrupted XAMPP installation** → Reinstall XAMPP
- **Insufficient disk space** → Free up space on C: drive

Check the MySQL error log (Logs button in XAMPP) for the specific error message and search for that exact error online.

