# XAMPP MySQL Fix Script
# Run this script as Administrator to diagnose and fix MySQL issues

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "XAMPP MySQL Diagnostic & Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: Not running as Administrator!" -ForegroundColor Yellow
    Write-Host "   Some fixes may not work. Right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Check if port 3306 is in use
Write-Host "Step 1: Checking if port 3306 is in use..." -ForegroundColor Yellow
$port3306 = netstat -ano | findstr :3306
if ($port3306) {
    Write-Host "❌ Port 3306 is already in use!" -ForegroundColor Red
    Write-Host $port3306
    Write-Host ""
    
    # Extract PID
    $pidMatch = $port3306 | Select-String -Pattern '\s+(\d+)$'
    if ($pidMatch) {
        $pid = $pidMatch.Matches[0].Groups[1].Value
        Write-Host "   Process ID: $pid" -ForegroundColor Yellow
        
        # Check what process it is
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "   Process Name: $($process.ProcessName)" -ForegroundColor Yellow
            Write-Host "   Process Path: $($process.Path)" -ForegroundColor Yellow
        }
        
        Write-Host ""
        $stop = Read-Host "   Do you want to stop this process? (y/n)"
        if ($stop -eq 'y' -or $stop -eq 'Y') {
            try {
                Stop-Process -Id $pid -Force
                Write-Host "   ✅ Process stopped successfully" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Could not stop process. Try stopping it manually." -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "✅ Port 3306 is free" -ForegroundColor Green
}
Write-Host ""

# Step 2: Check for MySQL Windows Services
Write-Host "Step 2: Checking for MySQL Windows Services..." -ForegroundColor Yellow
$mysqlServices = Get-Service | Where-Object {$_.Name -like "*mysql*" -or $_.DisplayName -like "*MySQL*"}
if ($mysqlServices) {
    Write-Host "❌ Found MySQL Windows Services:" -ForegroundColor Red
    foreach ($service in $mysqlServices) {
        Write-Host "   - $($service.Name): $($service.Status) ($($service.DisplayName))" -ForegroundColor Yellow
    }
    Write-Host ""
    $stopServices = Read-Host "   Do you want to stop these services? (y/n)"
    if ($stopServices -eq 'y' -or $stopServices -eq 'Y') {
        foreach ($service in $mysqlServices) {
            try {
                if ($service.Status -eq 'Running') {
                    Stop-Service -Name $service.Name -Force
                    Write-Host "   ✅ Stopped: $($service.Name)" -ForegroundColor Green
                }
                # Set to Manual to prevent auto-start
                Set-Service -Name $service.Name -StartupType Manual
                Write-Host "   ✅ Set $($service.Name) to Manual startup" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Could not stop $($service.Name): $_" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "✅ No conflicting MySQL Windows Services found" -ForegroundColor Green
}
Write-Host ""

# Step 3: Check MySQL processes
Write-Host "Step 3: Checking for MySQL processes..." -ForegroundColor Yellow
$mysqlProcesses = Get-Process | Where-Object {$_.ProcessName -like "*mysql*"}
if ($mysqlProcesses) {
    Write-Host "⚠️  Found MySQL processes:" -ForegroundColor Yellow
    foreach ($proc in $mysqlProcesses) {
        Write-Host "   - $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ No MySQL processes running" -ForegroundColor Green
}
Write-Host ""

# Step 4: Check XAMPP MySQL data directory
Write-Host "Step 4: Checking XAMPP MySQL data directory..." -ForegroundColor Yellow
$xamppDataPath = "C:\xampp\mysql\data"
if (Test-Path $xamppDataPath) {
    Write-Host "✅ XAMPP MySQL data directory exists: $xamppDataPath" -ForegroundColor Green
    
    # Check permissions
    $acl = Get-Acl $xamppDataPath
    Write-Host "   Current permissions: OK" -ForegroundColor Green
} else {
    Write-Host "❌ XAMPP MySQL data directory not found: $xamppDataPath" -ForegroundColor Red
    Write-Host "   Make sure XAMPP is installed in C:\xampp" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Check disk space
Write-Host "Step 5: Checking disk space..." -ForegroundColor Yellow
$drive = Get-PSDrive C
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
if ($freeSpaceGB -lt 1) {
    Write-Host "⚠️  Low disk space: $freeSpaceGB GB free" -ForegroundColor Yellow
    Write-Host "   MySQL may fail if disk is full" -ForegroundColor Yellow
} else {
    Write-Host "✅ Disk space OK: $freeSpaceGB GB free" -ForegroundColor Green
}
Write-Host ""

# Summary and next steps
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Try starting MySQL from XAMPP Control Panel" -ForegroundColor White
Write-Host "2. If it still fails, check the MySQL error log:" -ForegroundColor White
Write-Host "   - Click 'Logs' button next to MySQL in XAMPP" -ForegroundColor White
Write-Host "3. Look for specific error messages in the log" -ForegroundColor White
Write-Host ""
Write-Host "Common fixes:" -ForegroundColor Yellow
Write-Host "- Port 3306 conflict: Stop Windows MySQL service" -ForegroundColor White
Write-Host "- InnoDB corruption: Delete ib_logfile0 and ib_logfile1" -ForegroundColor White
Write-Host "- Permission issues: Check folder permissions on C:\xampp\mysql\data" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see: FIX_MYSQL_XAMPP_ERROR.md" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to open XAMPP
$openXampp = Read-Host "Do you want to open XAMPP Control Panel now? (y/n)"
if ($openXampp -eq 'y' -or $openXampp -eq 'Y') {
    $xamppPath = "C:\xampp\xampp-control.exe"
    if (Test-Path $xamppPath) {
        Start-Process $xamppPath
        Write-Host "✅ Opened XAMPP Control Panel" -ForegroundColor Green
    } else {
        Write-Host "❌ XAMPP Control Panel not found at $xamppPath" -ForegroundColor Red
        Write-Host "   Please open it manually" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Script completed!" -ForegroundColor Green

