# Mobile App Backend Connection Setup

## Quick Fix for "Network error. Please make sure your backend is running"

### Step 1: Start Your Backend Server

1. **Open PowerShell/Terminal** and navigate to the server directory:
   ```bash
   cd "C:\Users\roque\AIVENTORY MOBILE\AIVENTORYMOB\aiventory-web\server"
   ```

2. **Start the backend:**
   ```bash
   npm start
   ```

3. **Verify it's running:**
   You should see:
   ```
   ✅ Connected to MySQL database
   🚀 Backend running on http://0.0.0.0:5001
   ```

### Step 2: Configure Mobile App Connection

The mobile app automatically detects the backend URL, but you can override it:

#### Option A: Android Emulator (Easiest)
- The app automatically uses `http://10.0.2.2:5001/api` for Android emulator
- **No configuration needed!** Just start the backend and run the app

#### Option B: Physical Device or iOS Simulator
1. **Find your PC's IP address:**
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter (usually `192.168.x.x`)

2. **Set environment variable before starting Expo:**
   ```powershell
   $env:EXPO_PUBLIC_API_URL = "http://192.168.1.XXX:5001/api"
   cd "C:\Users\roque\AIVENTORY MOBILE\AIVENTORYMOB\AIVENTORYMOBILEV2"
   npx expo start
   ```
   Replace `192.168.1.XXX` with your actual IP address

#### Option C: Create `.env` file (Permanent)
1. Create `AIVENTORYMOBILEV2/.env`:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.XXX:5001/api
   ```
   Replace with your PC's IP address

2. Restart Expo:
   ```bash
   npx expo start --clear
   ```

### Step 3: Verify Connection

1. **Check the console** when the app starts - you should see:
   ```
   🔗 API Base URL: http://10.0.2.2:5001/api
   ```
   (or your configured URL)

2. **Try logging in** - if you see the error, check:
   - Backend is running (Step 1)
   - IP address is correct
   - Both devices are on the same network (for physical device)

## Troubleshooting

### Error: "Network error. Please make sure your backend is running"

**Checklist:**
- ✅ Backend server is running on port 5001
- ✅ MySQL database is connected
- ✅ For physical device: PC and phone on same Wi-Fi network
- ✅ For Android emulator: Using `10.0.2.2` (automatic)
- ✅ Firewall isn't blocking port 5001

**Test backend manually:**
```bash
# In browser or Postman
http://localhost:5001/api/suppliers
```
Should return JSON data (or empty array `[]`)

### Error: "ECONNREFUSED" or "Network request failed"

**Solutions:**
1. **Check backend is running:**
   ```bash
   # Should show process on port 5001
   netstat -ano | findstr :5001
   ```

2. **Check Windows Firewall:**
   - Allow Node.js through firewall
   - Or temporarily disable firewall to test

3. **For physical device:**
   - Make sure PC and phone are on the same Wi-Fi
   - Try accessing `http://YOUR_IP:5001/api/suppliers` from phone's browser

### Error: "Timeout"

**Solutions:**
1. Increase timeout in `services/api.js` (currently 15000ms)
2. Check network speed
3. Verify backend is responding (test in browser)

## Quick Test Commands

### Test Backend Connection:
```bash
# PowerShell
curl http://localhost:5001/api/suppliers
```

### Find Your IP Address:
```powershell
ipconfig | findstr IPv4
```

### Check if Port 5001 is Open:
```powershell
netstat -ano | findstr :5001
```

## Default Configuration

The mobile app uses these defaults:
- **Android Emulator:** `http://10.0.2.2:5001/api` (automatic)
- **iOS Simulator:** Uses `localhost` (automatic)
- **Physical Device:** Requires your PC's IP address

## Next Steps

Once connected:
1. ✅ Login with existing account
2. ✅ View dashboard data
3. ✅ Test inventory features
4. ✅ Verify database sync

## Need Help?

Check the console logs:
- Mobile app: Look for `🔗 API Base URL:` message
- Backend: Check for connection errors in server console
- Network: Use browser to test `http://localhost:5001/api/suppliers`

