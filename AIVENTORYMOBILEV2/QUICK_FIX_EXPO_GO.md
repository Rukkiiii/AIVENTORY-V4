# 🚀 Quick Fix: Expo Go on Physical Device

## 🎯 The Problem
Your app is trying to use `http://10.0.2.2:5001/api` (emulator address), but you're using **Expo Go on a physical device**. You need your **PC's IP address** instead!

---

## ✅ **IMMEDIATE FIX (3 Steps)**

### **Step 1: Set Your PC's IP Address**

**Your PC's IP is:** `192.168.100.27`

**Before starting Expo, run this in PowerShell:**

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.100.27:5001/api"
cd "C:\Users\roque\AIVENTORY MOBILE\AIVENTORYMOB\AIVENTORYMOBILEV2"
npx expo start --clear
```

---

### **Step 2: Make Sure Backend is Running**

**In another PowerShell window:**

```powershell
cd "C:\Users\roque\AIVENTORY MOBILE\AIVENTORYMOB\aiventory-web\server"
npm start
```

**Should see:**
```
✅ Connected to MySQL database
🚀 Backend running on http://0.0.0.0:5001
```

**Keep this window open!**

---

### **Step 3: Verify Connection**

**When Expo starts, check console:**
```
🔗 API Base URL: http://192.168.100.27:5001/api
```

**If you see `10.0.2.2` or `localhost` → Environment variable not set!**

---

## 🎯 **EASIEST WAY: Use the Batch File**

I created `START_EXPO_WITH_IP.bat` for you!

**Just double-click it** - it will:
1. Set the correct IP address
2. Start Expo
3. You just scan the QR code!

**If your IP changes, edit the .bat file and update the IP.**

---

## 📋 **Checklist**

Before trying to login:

- [ ] **PC and phone on same Wi-Fi network**
- [ ] Backend is running (`🚀 Backend running on http://0.0.0.0:5001`)
- [ ] Environment variable set: `EXPO_PUBLIC_API_URL=http://192.168.100.27:5001/api`
- [ ] Expo shows: `🔗 API Base URL: http://192.168.100.27:5001/api`
- [ ] Phone browser can access: `http://192.168.100.27:5001/api/suppliers`

---

## 🧪 **Test Connection**

### **From Phone Browser:**
1. Open browser on your phone
2. Go to: `http://192.168.100.27:5001/api/suppliers`
3. Should return JSON ✅

**If this doesn't work:**
- PC and phone not on same Wi-Fi
- Windows Firewall blocking
- Backend not running

---

## 🔥 **Fix Windows Firewall (If Needed)**

**Allow Node.js through firewall:**

1. Press `Win + R` → Type `firewall.cpl` → Enter
2. Click **"Allow an app or feature through Windows Defender Firewall"**
3. Click **"Change settings"**
4. Click **"Allow another app..."** → **"Browse..."**
5. Navigate to: `C:\Program Files\nodejs\node.exe`
6. Click **"Add"** → Check **Private** and **Public** → **OK**

---

## 💡 **Permanent Fix: Create .env File**

**To avoid setting environment variable every time:**

1. **Create file:** `AIVENTORYMOBILEV2/.env`
2. **Add this line:**
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.100.27:5001/api
   ```
3. **Restart Expo:**
   ```powershell
   npx expo start --clear
   ```

**Note:** If your IP changes (different Wi-Fi), update the .env file.

---

## 🚨 **If IP Changes**

**If you connect to different Wi-Fi:**

1. **Find new IP:**
   ```powershell
   ipconfig | findstr IPv4
   ```

2. **Update environment variable or .env file**

3. **Restart Expo**

---

## ✅ **Success!**

When working:
- ✅ Console shows: `🔗 API Base URL: http://192.168.100.27:5001/api`
- ✅ Login works
- ✅ No ERR_NETWORK error
- ✅ Data loads from database

---

## 🎯 **Quick Start (Copy & Paste)**

```powershell
# 1. Start backend (keep this window open)
cd "C:\Users\roque\AIVENTORY MOBILE\AIVENTORYMOB\aiventory-web\server"
npm start

# 2. In NEW window, set IP and start Expo
$env:EXPO_PUBLIC_API_URL = "http://192.168.100.27:5001/api"
cd "C:\Users\roque\AIVENTORY MOBILE\AIVENTORYMOB\AIVENTORYMOBILEV2"
npx expo start --clear
```

**Then scan QR code with Expo Go!**

---

**The key is: Use your PC's IP (`192.168.100.27`) instead of `10.0.2.2` for Expo Go on physical device!**

