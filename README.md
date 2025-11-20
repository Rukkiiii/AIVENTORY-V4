## AIVENTORY - Local Run Guide (ML, Backend, Mobile)

This guide helps you launch the backend API, optional ML service, and the React Native mobile app on your local machine.

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (for ML scripts)
- MySQL/MariaDB server (local)
- Git (optional)
- Android Studio (emulator) or a physical Android device with Expo Go

### 1) Database Setup
1. Start your MySQL/MariaDB server.
2. Create the database and tables by importing the SQL dump:
   - File: `aiventory-web/db/aiventory-1.sql`
   - You can import via phpMyAdmin or CLI:
     - mysql -u root -p < aiventory-web/db/aiventory-1.sql

3. Note your DB credentials. Default used by the backend if not set:
   - host: `localhost`
   - user: `root`
   - password: `` (empty)
   - database: `aiventory`

### 2) Backend API
Path: `aiventory-web/server`

1. Create a `.env` (optional but recommended):
   - DB_HOST=localhost
   - DB_USER=root
   - DB_PASSWORD=
   - DB_NAME=aiventory
   - JWT_SECRET=change_me
   - PORT=5001

2. Install and run:
   - cd aiventory-web/server
   - npm install
   - npm start

The server binds to `0.0.0.0` and logs:
"Backend running on http://0.0.0.0:5001"

Key endpoints used by the mobile app:
- POST `/api/register`
- POST `/api/login`
- GET `/api/products`
- POST `/api/products`
- PUT `/api/products/:id`
- PATCH `/api/products/:id/stock` (add/remove quantity)

### 3) ML Service (optional)
The backend has two ML integration paths:
- Fire-and-forget call to `GET http://localhost:5000/api/predictions/:id` if an ML service is running
- A local ARIMA fallback invoked via `GET /api/predict/:productId` which runs `python predict_arima.py` if present

If you have an ML API (Flask/FastAPI) listening on port 5000, start it now. Otherwise, the backend will gracefully fall back to calculated predictions.

Example (if you have a venv already in `aiventory-web/ml`):
- cd aiventory-web/ml
- Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass 
- (Windows) venv\Scripts\activate
- (Linux/macOS) source venv/bin/activate
- python app.py  # or your ML server entrypoint that binds to port 5000

Note: If you only want core inventory features, you can skip this section.

### 4) Mobile App (Expo)
Path: `AIVENTORYMOBILEV2`

1. Configure API base URL to point to your PC’s IPv4 and backend port:
   - File: `AIVENTORYMOBILEV2/services/api.js`
   - baseURL: `http://YOUR_IPV4:5001/api`
   - Find your IPv4 using `ipconfig` (Windows) or `ifconfig`/`ip addr` (Linux/macOS).

2. Install and run the app:
   - cd AIVENTORYMOBILEV2
   - npm install
   - npx expo start --tunnel

3. Open in device/emulator:
   - Android: Scan the QR with Expo Go or launch an Android emulator.
   - iOS (on macOS): Press `i` to open in iOS Simulator.

### 5) Quick Validation
- Register a user in the app (Create Account). You should see activity in the server logs and a new row in `admin`/`staff` tables.
- Add a product from the Scan flow (supply name and price) → verify it appears in inventory.
- Adjust stock:
  - Add: scan an existing item to increment by 1.
  - Remove: use Sell or Remove modals to decrement via `/api/products/:id/stock`.
- Check `notifications` table for any low-stock alerts when thresholds are crossed.

### Troubleshooting
- Mobile can’t reach backend: ensure both are on the same network and Windows Defender Firewall allows Node (port 5001). Use `--tunnel` in Expo to simplify networking.
- DB errors: verify DB credentials and that `aiventory` schema exists with `admin`, `staff`, `product`, etc.
- ML unavailable: backend falls back to calculated predictions; it’s safe to ignore ML if you don’t need forecasts.

### Useful Paths
- Backend server: `aiventory-web/server/index.js`
- DB schema: `aiventory-web/db/aiventory-1.sql`
- Mobile screens: `AIVENTORYMOBILEV2/app`
- Mobile inventory actions: `AIVENTORYMOBILEV2/app/(tabs)/inventory.tsx`


