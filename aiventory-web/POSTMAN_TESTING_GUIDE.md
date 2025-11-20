# Postman Testing Guide for AIVENTORY Backend

## 🚀 Quick Start

1. **Start the backend server:**
   ```bash
   cd aiventory-web/server
   npm start
   ```
   Server should run on `http://localhost:5001`

2. **Import Postman Collection:** Import `AIVENTORY_API.postman_collection.json` into Postman

3. **Set Environment Variables:**
   - `base_url`: `http://localhost:5001`
   - `token`: (will be set after login)

---

## 📋 Available Endpoints

### 🔐 Authentication Endpoints

#### 1. **Login** (POST)
```
POST http://localhost:5001/api/login
```

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "admin@aiventory.com",
  "password": "password123",
  "role": "Admin"
}
```

**OR with username:**
```json
{
  "username": "admin",
  "password": "password123",
  "role": "Admin"
}
```

**Expected Response (200):**
```json
{
  "message": "Login success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "Admin",
  "user": {
    "id": 1,
    "name": "Administrator",
    "email": "admin@aiventory.com"
  }
}
```

**Save the token** for authenticated requests!

---

#### 2. **Register** (POST)
```
POST http://localhost:5001/api/register
```

**Body (JSON):**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "password123",
  "role": "Staff"
}
```

**Expected Response (200):**
```json
{
  "message": "Staff account created successfully!",
  "user": {
    "id": 2,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### 👤 Profile Endpoints

#### 3. **Get User Profile** (GET)
```
GET http://localhost:5001/api/profile/{role}/{id}
```

**Example:**
```
GET http://localhost:5001/api/profile/Admin/1
```

**Headers:**
```
Authorization: Bearer {token}
```

---

#### 4. **Update Profile** (PUT)
```
PUT http://localhost:5001/api/profile/{role}/{id}
```

**Body (JSON):**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "username": "newusername"
}
```

---

#### 5. **Change Password** (PUT)
```
PUT http://localhost:5001/api/profile/{role}/{id}/password
```

**Body (JSON):**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

### 📦 Product Endpoints

#### 6. **Get All Products** (GET)
```
GET http://localhost:5001/api/products
```

**Expected Response:**
```json
[
  {
    "Product_id": 1,
    "Product_name": "Laptop Computer",
    "Product_sku": "LAP001",
    "Product_price": 899.99,
    "Product_stock": 25,
    "Product_category": "Electronics",
    "Product_status": "Active"
  }
]
```

---

#### 7. **Get Single Product** (GET)
```
GET http://localhost:5001/api/products/{id}
```

**Example:**
```
GET http://localhost:5001/api/products/1
```

---

#### 8. **Create Product** (POST)
```
POST http://localhost:5001/api/products
```

**Body (JSON):**
```json
{
  "Product_name": "New Product",
  "Product_sku": "SKU001",
  "Product_price": 99.99,
  "Product_category": "Electronics",
  "Product_stock": 10,
  "reorder_level": 5,
  "supplier_id": 1,
  "Product_status": "Active"
}
```

---

#### 9. **Update Product** (PUT)
```
PUT http://localhost:5001/api/products/{id}
```

**Body (JSON):**
```json
{
  "Product_name": "Updated Product",
  "Product_sku": "SKU001",
  "Product_price": 109.99,
  "Product_category": "Electronics",
  "Product_stock": 15,
  "reorder_level": 5,
  "supplier_id": 1,
  "Product_status": "Active"
}
```

---

#### 10. **Delete Product** (DELETE)
```
DELETE http://localhost:5001/api/products/{id}
```

---

### 🏢 Supplier Endpoints

#### 11. **Get All Suppliers** (GET)
```
GET http://localhost:5001/api/suppliers
```

---

#### 12. **Create Supplier** (POST)
```
POST http://localhost:5001/api/suppliers
```

**Body (JSON):**
```json
{
  "supplier_name": "New Supplier Co.",
  "supplier_contactnum": "+1234567890",
  "supplier_email": "contact@newsupplier.com",
  "supplier_address": "123 Main St",
  "supplier_rating": 4.5
}
```

---

#### 13. **Update Supplier** (PUT)
```
PUT http://localhost:5001/api/suppliers/{id}
```

**Body (JSON):** Same as create

---

#### 14. **Delete Supplier** (DELETE)
```
DELETE http://localhost:5001/api/suppliers/{id}
```

---

### 📋 Order Endpoints

#### 15. **Get All Orders** (GET)
```
GET http://localhost:5001/api/orders
```

---

#### 16. **Create Order** (POST)
```
POST http://localhost:5001/api/orders
```

**Body (JSON):**
```json
{
  "order_date": "2025-01-15",
  "order_status": "Pending",
  "total_amount": 999.99,
  "supplier_id": 1
}
```

---

#### 17. **Update Order** (PUT)
```
PUT http://localhost:5001/api/orders/{id}
```

**Body (JSON):**
```json
{
  "order_status": "Completed",
  "total_amount": 1099.99
}
```

---

#### 18. **Delete Order** (DELETE)
```
DELETE http://localhost:5001/api/orders/{id}
```

---

#### 19. **Get Order Items** (GET)
```
GET http://localhost:5001/api/orders/{id}/items
```

---

#### 20. **Add Order Item** (POST)
```
POST http://localhost:5001/api/orders/{id}/items
```

**Body (JSON):**
```json
{
  "product_id": 1,
  "quantity": 5,
  "price": 99.99,
  "received_date": "2025-01-20"
}
```

---

#### 21. **Update Order Item** (PUT)
```
PUT http://localhost:5001/api/order-items/{itemId}
```

**Body (JSON):**
```json
{
  "quantity": 10,
  "price": 89.99,
  "received_date": "2025-01-25"
}
```

---

#### 22. **Delete Order Item** (DELETE)
```
DELETE http://localhost:5001/api/order-items/{itemId}
```

---

### 📊 Reports Endpoints

#### 23. **Low Stock Report** (GET)
```
GET http://localhost:5001/api/reports/low-stock
```

---

#### 24. **Stock by Category** (GET)
```
GET http://localhost:5001/api/reports/stock-by-category
```

---

#### 25. **Supplier Performance** (GET)
```
GET http://localhost:5001/api/reports/supplier-performance
```

---

#### 26. **Monthly Orders** (GET)
```
GET http://localhost:5001/api/reports/monthly-orders
```

---

### ⚙️ Settings Endpoints

#### 27. **Get Settings** (GET)
```
GET http://localhost:5001/api/settings/{staff_id}
```

---

#### 28. **Save Settings** (POST)
```
POST http://localhost:5001/api/settings
```

**Body (JSON):**
```json
{
  "notification_threshold": 10,
  "reorder_rule": "default",
  "staff_id": 1
}
```

---

### 🤖 ML Prediction Endpoint

#### 29. **Predict Stock** (GET)
```
GET http://localhost:5001/api/predict/{productId}
```

**Example:**
```
GET http://localhost:5001/api/predict/1
```

---

## 🔧 Testing Workflow

### Step 1: Test Database Connection
1. Start server - should see: `✅ Connected to MySQL database`
2. If error: Check MySQL is running and database exists

### Step 2: Register a Test User
1. Use **Register** endpoint
2. Create an Admin or Staff account
3. Note the response

### Step 3: Login
1. Use **Login** endpoint with registered credentials
2. **Copy the token** from response
3. Save token for other requests

### Step 4: Test Authenticated Endpoints
1. Add token to Headers: `Authorization: Bearer {token}`
2. Test GET endpoints (Products, Suppliers, Orders, etc.)
3. Test POST/PUT/DELETE endpoints

### Step 5: Test CRUD Operations
1. **Create** a supplier
2. **Create** a product (using supplier_id)
3. **Create** an order
4. **Read** all data
5. **Update** a product
6. **Delete** test data

---

## ⚠️ Common Issues

### Issue: "MySQL connection failed"
**Solution:** 
- Check MySQL is running
- Verify database `aiventory` exists
- Check credentials in `.env` or defaults

### Issue: "User not found" or "Invalid password"
**Solution:**
- Register a new user first
- Passwords must match exactly
- Check role matches (Admin/Staff)

### Issue: "Missing required fields"
**Solution:**
- Check JSON body has all required fields
- Verify field names match exactly (case-sensitive)

### Issue: CORS Error
**Solution:**
- Server has CORS enabled, should work
- If issues, check server is running on port 5001

---

## 📝 Test Data Examples

### Test Admin Login:
```json
{
  "email": "admin@aiventory.com",
  "password": "password",
  "role": "Admin"
}
```

### Test Product Creation:
```json
{
  "Product_name": "Test Product",
  "Product_sku": "TEST001",
  "Product_price": 49.99,
  "Product_category": "Test Category",
  "Product_stock": 100,
  "reorder_level": 20,
  "supplier_id": 1,
  "Product_status": "Active"
}
```

---

## 🎯 Quick Test Checklist

- [ ] Server starts without errors
- [ ] Database connection successful
- [ ] Register endpoint works
- [ ] Login endpoint returns token
- [ ] Get products works
- [ ] Create product works
- [ ] Get suppliers works
- [ ] Create supplier works
- [ ] Reports endpoints work

---

**Happy Testing! 🚀**

