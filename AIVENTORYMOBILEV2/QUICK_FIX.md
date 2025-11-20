# Quick Fix: "Backend is running on port 5001" Error

## 🚨 Immediate Steps

### 1. Check if Backend is Running

**Open PowerShell and run:**
```powershell
netstat -ano | findstr :5001
```

**If you see output** → Backend is running ✅  
**If you see nothing** → Backend is NOT running ❌

---

### 2. Start Backend (if not running)

**Open a NEW PowerShell window:**
```powershell
cd "C:\Users\roque\AIVENTORY MOBILE\AIVENTORYMOB\aiventory-web\server"
npm start
```

**Wait for these messages:**
```
✅ Connected to MySQL database
🚀 Backend running on http://0.0.0.0:5001
```

**Keep this window open!** Don't close it.

---

### 3. Test Backend in Browser

**Open your browser and go to:**
```
http://localhost:5001/api/suppliers
```

**Expected:** Should show JSON (even if empty `[]`)  
**If error:** Backend is not running or MySQL issue

---

### 4. Check Mobile App Console

**When you start Expo, look for:**
```
🔗 API Base URL: http://10.0.2.2:5001/api
```

**If you see a different URL or `localhost` on physical device:**
- Android Emulator should show: `http://10.0.2.2:5001/api` ✅
- Physical Device should show: `http://YOUR_IP:5001/api` (not localhost!)

---

### 5. Fix URL for Physical Device

**If using physical device (not emulator):**

1. **Get your PC's IP:**
   ```powershell
   ipconfig | findstr IPv4
   ```
   Example output: `192.168.1.100`

2. **Set environment variable:**
   ```powershell
   $env:EXPO_PUBLIC_API_URL = "http://192.168.1.100:5001/api"
   ```
   ⚠️ Replace `192.168.1.100` with YOUR actual IP!

3. **Restart Expo:**
   ```powershell
   cd "C:\Users\roque\AIVENTORY MOBILE\AIVENTORYMOB\AIVENTORYMOBILEV2"
   npx expo start --clear
   ```

4. **Verify in console:**
   Should now show: `🔗 API Base URL: http://192.168.1.100:5001/api`

---

## ✅ Verification Checklist

Before trying to login, verify:

- [ ] Backend shows: `✅ Connected to MySQL database`
- [ ] Backend shows: `🚀 Backend running on http://0.0.0.0:5001`
- [ ] Browser test: `http://localhost:5001/api/suppliers` works
- [ ] Mobile console shows correct API URL
- [ ] For physical device: PC and phone on same Wi-Fi
- [ ] Windows Firewall allows Node.js (or temporarily disabled)

---

## 🎯 Most Common Issues

### Issue: Backend not running
**Solution:** Start it (Step 2)

### Issue: Wrong URL on physical device
**Solution:** Set EXPO_PUBLIC_API_URL (Step 5)

### Issue: Firewall blocking
**Solution:** Allow Node.js through Windows Firewall

### Issue: Different networks
**Solution:** Ensure PC and phone on same Wi-Fi

---

## 📞 Still Not Working?

**Run these commands and share the output:**

```powershell
# 1. Check backend
netstat -ano | findstr :5001

# 2. Test backend
curl http://localhost:5001/api/suppliers

# 3. Get your IP
ipconfig | findstr IPv4
```

**Also check:**
- What does the mobile app console show for `🔗 API Base URL:`?
- What does the backend console show when you try to login?
- Are you using emulator or physical device?

