// index.js
import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bcrypt from "bcrypt";      // or bcryptjs
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { exec } from "child_process";
import axios from "axios";

// Load environment variables
dotenv.config();

const SECRET_KEY = process.env.JWT_SECRET || "aiventory_secret_fallback";
// Base URL of the Python ML forecasting service.
// LSTM Forecasting Service runs on port 5202
// You can override this with the ML_SERVICE_BASE_URL environment variable.
const ML_SERVICE_BASE_URL = process.env.ML_SERVICE_BASE_URL || "http://127.0.0.1:5202";

// ------------------ INIT ------------------
const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "aiventory"
});

// ✅ Test DB connection with retry logic
db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
    console.error("   Check: MySQL is running? Database 'aiventory' exists? Credentials correct?");
  } else {
    console.log("✅ Connected to MySQL database");
    
    // Verify tables exist and check Product_stock column
    db.query("SHOW TABLES LIKE 'product'", (err, results) => {
      if (err) {
        console.error("⚠️ Warning: Could not verify tables:", err.message);
      } else if (results.length === 0) {
        console.warn("⚠️ Warning: 'product' table not found. Run setup_database.sql to create tables.");
      } else {
        console.log("✅ Database tables verified");
        
        // Verify Product_stock column exists
        db.query("DESCRIBE product", (descErr, columns) => {
          if (!descErr) {
            const columnNames = columns.map(col => col.Field);
            const hasProductStock = columnNames.includes('Product_stock');
            const hasStock = columnNames.includes('stock');
            
            if (!hasProductStock && !hasStock) {
              console.warn("⚠️ Warning: 'Product_stock' column not found in product table!");
              console.warn("   Run: node verify_database_schema.js to fix this");
            } else if (hasStock && !hasProductStock) {
              console.warn("⚠️ Warning: Found 'stock' column but need 'Product_stock'");
              console.warn("   Run: node verify_database_schema.js to rename it");
            } else {
              console.log("✅ Product_stock column verified");
            }
          }
        });
      }
    });
  }
});

// Handle database connection errors
db.on('error', (err) => {
  console.error("❌ Database connection error:", err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error("   Database connection was closed. Reconnecting...");
    db.connect();
  } else if (err.code === 'ECONNREFUSED') {
    console.error("   Database connection refused. Check MySQL is running.");
  } else {
    throw err;
  }
});

// ------------------ DB INIT (create auxiliary tables if missing) ------------------
// Notifications table for dashboard notification center
db.query(
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(500) NOT NULL,
    item_name VARCHAR(255),
    action VARCHAR(255),
    user_name VARCHAR(255),
    user_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
);

// Invoices & invoice items tables
db.query(
  `CREATE TABLE IF NOT EXISTS invoices (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(150),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    invoice_date DATE NOT NULL,
    due_date DATE,
    status ENUM('Pending','Paid','Overdue') DEFAULT 'Pending',
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
);

db.query(
  `CREATE TABLE IF NOT EXISTS invoice_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    product_id INT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(Product_id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
);

// Ensure legacy tables gain product_id column if they predate it
db.query('ALTER TABLE invoice_items ADD COLUMN product_id INT NULL', (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') {
    console.error('⚠️ Unable to add product_id column to invoice_items:', err.message);
  }
});

db.query(
  'ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_product FOREIGN KEY (product_id) REFERENCES product(Product_id) ON DELETE SET NULL',
  (err) => {
    if (err && err.code !== 'ER_DUP_NAME') {
      // Ignore if constraint already exists
    }
  }
);

// Seed sample invoices if table is empty
const seedInvoices = () => {
  const sample = [
    {
      invoice: {
        invoice_number: 'INV-1001',
        customer_name: 'Atlas Moto Supply',
        customer_email: 'sales@atlasmoto.com',
        customer_phone: '+63 917 555 1234',
        customer_address: '123 M.C. Briones St, Cebu City, Philippines',
        invoice_date: '2025-11-05',
        due_date: '2025-11-20',
        status: 'Pending',
        subtotal: 32750,
        tax: 1638,
        total: 34388,
        notes: 'Thank you for your business! Please settle within 15 days.'
      },
      items: [
        { description: 'Brake Pads (BRK-PAD-004)', quantity: 30, unit_price: 250, product_sku: 'BRK-PAD-004' },
        { description: 'Motorcycle Battery (BAT-YTX-001)', quantity: 10, unit_price: 1850, product_sku: 'BAT-YTX-001' },
        { description: 'LED Headlight Bulb', quantity: 15, unit_price: 450, product_sku: 'MC-ELC-004' },
      ]
    },
    {
      invoice: {
        invoice_number: 'INV-0998',
        customer_name: 'RideSafe Motors',
        customer_email: 'support@ridesafe.ph',
        customer_phone: '+63 32 222 4488',
        customer_address: 'Unit 204, Oakridge Business Park, Mandaue City',
        invoice_date: '2025-10-24',
        due_date: '2025-11-08',
        status: 'Paid',
        subtotal: 20240,
        tax: 1012,
        total: 21252,
        notes: 'Paid via bank transfer on Nov 02, 2025.'
      },
      items: [
        { description: 'Engine Oil (10W-40)', quantity: 40, unit_price: 320, product_sku: 'OIL-10W40-002' },
        { description: 'Drive Chain (CHN-520-003)', quantity: 12, unit_price: 620, product_sku: 'CHN-520-003' }
      ]
    }
  ];

  db.query('SELECT COUNT(*) AS count FROM invoices', (err, rows) => {
    if (err) {
      console.error('⚠️ Unable to check invoices table:', err.message);
      return;
    }
    if (rows[0]?.count > 0) return;

    db.query('SELECT Product_id, Product_sku FROM product', (prodErr, productRows) => {
      if (prodErr) {
        console.error('⚠️ Unable to load products for invoice seed:', prodErr.message);
        return;
      }

      const productBySku = Array.isArray(productRows)
        ? productRows.reduce((acc, row) => {
            if (row.Product_sku) {
              acc[String(row.Product_sku).toUpperCase()] = row.Product_id;
            }
            return acc;
          }, {})
        : {};

      sample.forEach(entry => {
        db.query('INSERT INTO invoices SET ?', entry.invoice, (insertErr, result) => {
          if (insertErr) {
            console.error('⚠️ Invoice seed insert failed:', insertErr.message);
            return;
          }
          const invoiceId = result.insertId;
          const itemValues = entry.items.map(item => {
            const sku = item.product_sku ? String(item.product_sku).toUpperCase() : null;
            const productId = sku && productBySku[sku] ? productBySku[sku] : null;
            return [invoiceId, item.description, item.quantity, item.unit_price, productId];
          });
          if (itemValues.length > 0) {
            db.query(
              'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, product_id) VALUES ?',
              [itemValues],
              (itemErr) => {
                if (itemErr) {
                  console.error('⚠️ Invoice item seed insert failed:', itemErr.message);
                }
              }
            );
          }
        });
      });
    });
  });
};

seedInvoices();

// ------------------ Simple Event Stream (SSE) ------------------
const sseClients = [];
function sseBroadcast(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((res) => res.write(payload));
}

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write("\n");

  sseClients.push(res);
  req.on("close", () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// ------------------ ROUTES ------------------

// Login route
app.post("/api/login", (req, res) => {
  const { email, username, password, role } = req.body;
  console.log("📥 Login request:", { email, username, password, role });
  
  // Validate required fields
  if (!password || !role) {
    return res.status(400).json({ error: "Missing email/username, password, or role" });
  }
  
  // Accept either email or username from frontend
  const identifier = email || username;
  if (!identifier) {
    return res.status(400).json({ error: "Email or username is required" });
  }

  const table = role === 'Admin' ? 'admin' : 'staff';
  const id_field = role === 'Admin' ? 'admin_id' : 'staff_id';
  const email_field = role === 'Admin' ? 'admin_email' : 'staff_email';
  const password_field = role === 'Admin' ? 'admin_password' : 'staff_password';
  const name_field = role === 'Admin' ? 'admin_name' : 'staff_name';

  // Try to match by email or username
  const sql = role === 'Admin'
    ? `SELECT * FROM ${table} WHERE ${email_field} = ? OR admin_username = ?`
    : `SELECT * FROM ${table} WHERE ${email_field} = ? OR staff_username = ?`;

  db.query(sql, [identifier, identifier], async (err, results) => {
    if (err) {
      console.error("❌ MySQL Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (results.length === 0) {
      console.log("❌ User not found:", identifier);
      return res.status(401).json({ error: "User not found" });
    }

    const user = results[0];
    
    try {
      const passwordMatch = await bcrypt.compare(password, user[password_field]);
      
      if (!passwordMatch) {
        console.log("❌ Invalid password for user:", identifier);
        return res.status(401).json({ error: "Invalid password" });
      }

      // Update last login
      const updateSql = role === 'Admin'
        ? `UPDATE admin SET last_login = NOW() WHERE admin_id = ?`
        : `UPDATE staff SET last_login = NOW() WHERE staff_id = ?`;
      
      db.query(updateSql, [user[id_field]], (err) => {
        if (err) {
          console.error("❌ Update login time error:", err);
          // Don't fail login for this error
        }
      });

      const token = jwt.sign({ id: user[id_field], role: role }, SECRET_KEY, { expiresIn: "2h" });
      console.log("✅ Login successful for:", user[name_field]);
      
      // Return user info for frontend
      res.json({ 
        message: "Login success", 
        token, 
        role: role, 
        user: { 
          id: user[id_field], 
          name: user[name_field], 
          email: user[email_field] 
        } 
      });
    } catch (bcryptErr) {
      console.error("❌ Password comparison error:", bcryptErr);
      return res.status(500).json({ error: "Authentication error" });
    }
  });
});

// Register new user
app.post("/api/register", async (req, res) => {
  const { fullName, email, username, password, role } = req.body;
  console.log("📥 Registration request:", { fullName, email, username, password, role });
  
  // Validate required fields
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Accept username from frontend, fallback to email if not provided
  const userName = username || email;

  try {
    // Check if user already exists
    const checkSql = role === "Admin" 
      ? `SELECT admin_id FROM admin WHERE admin_email = ? OR admin_username = ?`
      : `SELECT staff_id FROM staff WHERE staff_email = ? OR staff_username = ?`;
    
    db.query(checkSql, [email, userName], async (err, results) => {
      if (err) {
        console.error("❌ Check user error:", err);
        return res.status(500).json({ error: "Database error" });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ error: "User already exists with this email or username" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      if (role === "Admin") {
        const sql = `INSERT INTO admin (admin_name, admin_username, admin_password, admin_email) VALUES (?, ?, ?, ?)`;
        db.query(sql, [fullName, userName, hashedPassword, email], (err, result) => {
          if (err) {
            console.error("❌ MySQL Error:", err);
            return res.status(500).json({ error: err.message });
          }
          console.log("✅ Admin account created:", result.insertId);
          res.json({ message: "Admin account created successfully!", user: { id: result.insertId, name: fullName, email } });
        });
      } else {
        const sql = `INSERT INTO staff (staff_name, staff_username, staff_password, staff_email, staff_role) VALUES (?, ?, ?, ?, ?)`;
        db.query(sql, [fullName, userName, hashedPassword, email, "Staff"], (err, result) => {
          if (err) {
            console.error("❌ MySQL Error:", err);
            return res.status(500).json({ error: err.message });
          }
          console.log("✅ Staff account created:", result.insertId);
          res.json({ message: "Staff account created successfully!", user: { id: result.insertId, name: fullName, email } });
        });
      }
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ===================== SUPPLIERS =========================

// Get all suppliers
app.get("/api/suppliers", (req, res) => {
  db.query("SELECT * FROM supplier", (err, results) => {
    if (err) {
      console.error("❌ Fetch Suppliers Error:", err);
      console.error("   Error code:", err.code);
      console.error("   Error message:", err.message);
      return res.status(500).json({ 
        error: "Database error", 
        message: err.message,
        code: err.code 
      });
    }
    res.json(results || []);
  });
});

// Add supplier
app.post("/api/suppliers", (req, res) => {
  console.log("📥 Incoming supplier body:", req.body); // 👀 Debug log

  const { supplier_name, supplier_contactnum, supplier_email, supplier_address, supplier_rating } = req.body;

  if (!supplier_name || !supplier_email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql =
    "INSERT INTO supplier (supplier_name, supplier_contactnum, supplier_email, supplier_address, supplier_rating) VALUES (?, ?, ?, ?, ?)";

  db.query(
    sql,
    [supplier_name, supplier_contactnum, supplier_email, supplier_address, supplier_rating],
    (err, result) => {
      if (err) {
        console.error("❌ MySQL Insert Error:", err);
        return res.status(500).json(err);
      }
      res.json({ supplier_id: result.insertId, ...req.body });
    }
  );
});

// Update supplier
app.put("/api/suppliers/:id", (req, res) => {
  const { id } = req.params;
  const { supplier_name, supplier_contactnum, supplier_email, supplier_address, supplier_rating } = req.body;

  const sql =
    "UPDATE supplier SET supplier_name=?, supplier_contactnum=?, supplier_email=?, supplier_address=?, supplier_rating=? WHERE supplier_id=?";

  db.query(
    sql,
    [supplier_name, supplier_contactnum, supplier_email, supplier_address, supplier_rating, id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ supplier_id: id, ...req.body });
    }
  );
});

// Delete supplier
app.delete("/api/suppliers/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM supplier WHERE supplier_id=?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// ===================== SUPPLIERS ===============================

// ===================== USER PROFILE =========================

// Get user profile
app.get("/api/profile/:role/:id", (req, res) => {
  const { role, id } = req.params;
  
  if (!role || !id) {
    return res.status(400).json({ error: "Role and ID are required" });
  }
  
  const table = role === 'Admin' ? 'admin' : 'staff';
  const id_field = role === 'Admin' ? 'admin_id' : 'staff_id';
  const email_field = role === 'Admin' ? 'admin_email' : 'staff_email';
  const name_field = role === 'Admin' ? 'admin_name' : 'staff_name';
  const username_field = role === 'Admin' ? 'admin_username' : 'staff_username';
  
  const sql = `SELECT ${id_field}, ${name_field}, ${email_field}, ${username_field} FROM ${table} WHERE ${id_field} = ?`;
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("❌ Fetch Profile Error:", err);
      return res.status(500).json(err);
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = results[0];
    res.json({
      id: user[id_field],
      name: user[name_field],
      email: user[email_field],
      username: user[username_field],
      role: role
    });
  });
});

// Update user profile
app.put("/api/profile/:role/:id", async (req, res) => {
  const { role, id } = req.params;
  const { name, email, username } = req.body;
  
  if (!role || !id) {
    return res.status(400).json({ error: "Role and ID are required" });
  }
  
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  
  const table = role === 'Admin' ? 'admin' : 'staff';
  const id_field = role === 'Admin' ? 'admin_id' : 'staff_id';
  const email_field = role === 'Admin' ? 'admin_email' : 'staff_email';
  const name_field = role === 'Admin' ? 'admin_name' : 'staff_name';
  const username_field = role === 'Admin' ? 'admin_username' : 'staff_username';
  
  // Check if email or username already exists for another user
  const checkSql = role === 'Admin'
    ? `SELECT admin_id FROM admin WHERE (admin_email = ? OR admin_username = ?) AND admin_id != ?`
    : `SELECT staff_id FROM staff WHERE (staff_email = ? OR staff_username = ?) AND staff_id != ?`;
    
  db.query(checkSql, [email, username || email, id], async (err, results) => {
    if (err) {
      console.error("❌ Check user error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ error: "Email or username already exists" });
    }
    
    const updateSql = role === 'Admin'
      ? `UPDATE admin SET ${name_field} = ?, ${email_field} = ?, ${username_field} = ? WHERE ${id_field} = ?`
      : `UPDATE staff SET ${name_field} = ?, ${email_field} = ?, ${username_field} = ? WHERE ${id_field} = ?`;
      
    const updateValues = [name, email, username || email, id];
    
    db.query(updateSql, updateValues, (err) => {
      if (err) {
        console.error("❌ Update Profile Error:", err);
        return res.status(500).json(err);
      }
      
      res.json({ 
        message: "Profile updated successfully",
        user: { id, name, email, username: username || email, role }
      });
    });
  });
});

// Change user password
app.put("/api/profile/:role/:id/password", async (req, res) => {
  const { role, id } = req.params;
  const { currentPassword, newPassword } = req.body;
  
  if (!role || !id) {
    return res.status(400).json({ error: "Role and ID are required" });
  }
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }
  
  const table = role === 'Admin' ? 'admin' : 'staff';
  const id_field = role === 'Admin' ? 'admin_id' : 'staff_id';
  const password_field = role === 'Admin' ? 'admin_password' : 'staff_password';
  
  // Get current password hash
  const sql = `SELECT ${password_field} FROM ${table} WHERE ${id_field} = ?`;
  
  db.query(sql, [id], async (err, results) => {
    if (err) {
      console.error("❌ Fetch User Error:", err);
      return res.status(500).json(err);
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const user = results[0];
    
    try {
      const passwordMatch = await bcrypt.compare(currentPassword, user[password_field]);
      
      if (!passwordMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const updateSql = `UPDATE ${table} SET ${password_field} = ? WHERE ${id_field} = ?`;
      
      db.query(updateSql, [hashedPassword, id], (err) => {
        if (err) {
          console.error("❌ Update Password Error:", err);
          return res.status(500).json(err);
        }
        
        res.json({ message: "Password updated successfully" });
      });
    } catch (bcryptErr) {
      console.error("❌ Password comparison error:", bcryptErr);
      return res.status(500).json({ error: "Password update failed" });
    }
  });
});

// ===================== USER PROFILE =========================

// ==================== ORDERS FROM SUPPLIERS ====================

// Get all orders (with supplier info)
app.get("/api/orders", (req, res) => {
  const sql = `
    SELECT o.*, s.supplier_name, s.supplier_contactnum
    FROM orders_from_supplier o
    JOIN supplier s ON o.supplier_id = s.supplier_id
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Fetch Orders Error:", err);
      return res.status(500).json(err);
    }
    res.json(results);
  });
});

// Add new order
app.post("/api/orders", (req, res) => {
  console.log("📥 Incoming order body:", req.body);

  const { order_date, order_status, total_amount, supplier_id } = req.body;

  if (!order_date || !order_status || !total_amount || !supplier_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql =
    "INSERT INTO orders_from_supplier (order_date, order_status, total_amount, supplier_id) VALUES (?, ?, ?, ?)";

  db.query(sql, [order_date, order_status, total_amount, supplier_id], (err, result) => {
    if (err) {
      console.error("❌ Insert Order Error:", err);
      return res.status(500).json(err);
    }
    res.json({ order_id: result.insertId, ...req.body });
  });
});

// Update order
app.put("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  const { order_status, total_amount } = req.body;

  if (!order_status || !total_amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql =
    "UPDATE orders_from_supplier SET order_status=?, total_amount=?, updated_at=NOW() WHERE order_id=?";

  db.query(sql, [order_status, total_amount, id], (err) => {
    if (err) {
      console.error("❌ Update Order Error:", err);
      return res.status(500).json(err);
    }
    res.json({ order_id: id, ...req.body });
  });
});

// Delete order
app.delete("/api/orders/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM orders_from_supplier WHERE order_id=?", [id], (err) => {
    if (err) {
      console.error("❌ Delete Order Error:", err);
      return res.status(500).json(err);
    }
    res.json({ success: true });
  });
});

// ==================== ORDERS FROM SUPPLIERS -====================
// ==================== ORDER ITEMS ===========================

// Get items of an order
app.get("/api/orders/:id/items", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT oi.*, p.Product_name 
    FROM order_item oi
    JOIN product p ON oi.product_id = p.Product_id
    WHERE oi.order_id=?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("❌ Fetch Order Items Error:", err);
      return res.status(500).json(err);
    }
    res.json(results);
  });
});

// Add item to order
app.post("/api/orders/:id/items", (req, res) => {
  console.log("📥 Incoming order item body:", req.body);

  const { id } = req.params;
  const { product_id, quantity, price, received_date } = req.body;

  if (!product_id || !quantity || !price) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql =
    "INSERT INTO order_item (order_id, product_id, quantity, price, received_date) VALUES (?, ?, ?, ?, ?)";

  db.query(sql, [id, product_id, quantity, price, received_date], (err, result) => {
    if (err) {
      console.error("❌ Insert Order Item Error:", err);
      return res.status(500).json(err);
    }
    res.json({ order_item_id: result.insertId, order_id: id, ...req.body });
  });
});

// Update order item
app.put("/api/order-items/:itemId", (req, res) => {
  const { itemId } = req.params;
  const { quantity, price, received_date } = req.body;

  if (!quantity || !price) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql =
    "UPDATE order_item SET quantity=?, price=?, received_date=? WHERE order_item_id=?";

  db.query(sql, [quantity, price, received_date, itemId], (err) => {
    if (err) {
      console.error("❌ Update Order Item Error:", err);
      return res.status(500).json(err);
    }
    res.json({ order_item_id: itemId, ...req.body });
  });
});

// Delete order item
app.delete("/api/order-items/:itemId", (req, res) => {
  const { itemId } = req.params;
  db.query("DELETE FROM order_item WHERE order_item_id=?", [itemId], (err) => {
    if (err) {
      console.error("❌ Delete Order Item Error:", err);
      return res.status(500).json(err);
    }
    res.json({ success: true });
  });
});
// =================== ORDER ITEMS ==========================
// ===================== PRODUCTS CRUD =========================

// Get all products
app.get("/api/products", (req, res) => {
  db.query("SELECT * FROM product", (err, results) => {
    if (err) {
      console.error("❌ Fetch Products Error:", err);
      console.error("   Error code:", err.code);
      console.error("   Error message:", err.message);
      return res.status(500).json({ 
        error: "Database error", 
        message: err.message,
        code: err.code 
      });
    }
    res.json(results || []);
  });
});

// Get single product with supplier info
app.get("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT p.*, s.supplier_name, s.supplier_email, s.supplier_contactnum
    FROM product p
    LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
    WHERE p.Product_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("❌ Fetch Product Error:", err);
      return res.status(500).json(err);
    }
    if (results.length === 0) {
      console.warn(`⚠️ Product not found: ID ${id}`);
      return res.status(404).json({ 
        error: "Product not found",
        message: `Product with ID ${id} does not exist`
      });
    }
    res.json(results[0]);
  });
});

// Get stock movement history for a product
app.get("/api/products/:id/history", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      sm.stock_movement_id,
      sm.stock_movement_type,
      sm.stock_movement_quantity,
      sm.sm_date,
      sm.inventory_id,
      COALESCE(st.staff_name, a.admin_name, 'System') as user_name,
      COALESCE(st.staff_id, a.admin_id, 0) as user_id,
      CASE 
        WHEN sm.stock_movement_type = 'in' THEN 'Stock Added'
        WHEN sm.stock_movement_type = 'out' THEN 'Sold/Removed'
        ELSE 'Unknown'
      END as action,
      CONCAT(CASE WHEN sm.stock_movement_type = 'in' THEN '+' ELSE '-' END, sm.stock_movement_quantity) as quantity_display
    FROM stock_movement sm
    LEFT JOIN staff st ON sm.staff_id = st.staff_id AND sm.staff_id > 0
    LEFT JOIN admin a ON sm.staff_id = a.admin_id AND sm.staff_id > 0
    WHERE sm.inventory_id = ?
    ORDER BY sm.sm_date DESC
    LIMIT 100
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("❌ Fetch Stock History Error:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Update stock with movement tracking
app.patch("/api/products/:id/stock", (req, res) => {
  const { id } = req.params;
  const { quantity, action, reason, reference, staff_id, user_name } = req.body;
  
  if (!quantity || !action) {
    return res.status(400).json({ error: "Missing required fields: quantity and action" });
  }
  
  if (action !== 'add' && action !== 'remove') {
    return res.status(400).json({ error: "Action must be 'add' or 'remove'" });
  }
  
  // Get current product
  db.query("SELECT Product_stock, Product_name, reorder_level FROM product WHERE Product_id=?", [id], (err, results) => {
    if (err) {
      console.error("❌ Fetch Product Error:", err);
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    const product = results[0];
    const currentStock = Number(product.Product_stock) || 0;
    const quantityNum = Number(quantity);
    
    // Calculate new stock
    const newStock = action === 'add' 
      ? currentStock + quantityNum 
      : currentStock - quantityNum;
    
    if (newStock < 0) {
      return res.status(400).json({ error: "Cannot remove more stock than available" });
    }
    
    // Update product stock
    const updateSql = "UPDATE product SET Product_stock = ?, updated_at = NOW() WHERE Product_id = ?";
    db.query(updateSql, [newStock, id], (updateErr) => {
      if (updateErr) {
        console.error("❌ Update Stock Error:", updateErr);
        return res.status(500).json({ error: updateErr.message });
      }
      
      // Record stock movement
      const movementType = action === 'add' ? 'in' : 'out';
      const staffId = Number(staff_id) || 1;
      const smSql = `INSERT INTO stock_movement (stock_movement_type, stock_movement_quantity, inventory_id, staff_id) VALUES (?, ?, ?, ?)`;
      
      db.query(smSql, [movementType, quantityNum, id, staffId], (smErr) => {
        if (smErr) {
          console.error("⚠️ Stock movement insert failed:", smErr.message);
        }
        
        // Check if stock dropped below threshold and create notification
        if (newStock <= product.reorder_level) {
          const noteSql = `INSERT INTO notifications (title, message, item_name, action, user_name, user_id) VALUES (?, ?, ?, ?, ?, ?)`;
          const title = 'Low Stock Alert';
          const message = `${product.Product_name} is running low (${newStock} units left). Threshold: ${product.reorder_level}`;
          const userName = user_name || 'System';
          
          db.query(noteSql, [title, message, product.Product_name, 'low_stock_alert', userName, staffId], (nErr) => {
            if (nErr) {
              console.error("⚠️ Notification insert failed:", nErr.message);
            }
          });
        }
        
        // Broadcast SSE event
        sseBroadcast('stock_updated', {
          type: 'stock_adjusted',
          product_id: id,
          item_name: product.Product_name,
          old_stock: currentStock,
          new_stock: newStock,
          action: action,
          quantity: quantityNum
        });
        
        // Trigger prediction update
        try {
          exec(`curl -s http://localhost:${process.env.PORT || 5001}/api/predict/${id}`, (err) => {
            if (err) console.error("⚠️ Prediction trigger failed:", err);
          });
        } catch (e) {
          // best-effort only
        }
        
        res.json({ 
          success: true,
          product_id: id,
          old_stock: currentStock,
          new_stock: newStock,
          action: action,
          quantity: quantityNum
        });
      });
    });
  });
});

// Add product
app.post("/api/products", (req, res) => {
  const { Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock, Product_status } = req.body;

  // Validate required fields - allow 0 as a valid price
  if (!Product_name || !Product_name.trim()) {
    return res.status(400).json({ error: "Missing required field: Product_name" });
  }
  
  if (!Product_sku || !Product_sku.trim()) {
    return res.status(400).json({ error: "Missing required field: Product_sku" });
  }
  
  // Allow 0 as a valid price value
  if (Product_price === undefined || Product_price === null) {
    return res.status(400).json({ error: "Missing required field: Product_price" });
  }

  const sql = `
    INSERT INTO product 
    (Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock, Product_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [Product_name, Product_sku, Product_price, Product_category, reorder_level || 10, supplier_id || 1, Product_stock || 0, Product_status || 'Active'], (err, result) => {
    // If error is about Product_status column, retry without it
    if (err && (err.message?.includes('Product_status') || err.sqlMessage?.includes('Product_status'))) {
      const sqlWithoutStatus = `
        INSERT INTO product 
        (Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(sqlWithoutStatus, [Product_name, Product_sku, Product_price, Product_category, reorder_level || 10, supplier_id || 1, Product_stock || 0], (retryErr, retryResult) => {
        if (retryErr) {
          console.error("❌ Insert Product Error (retry):", retryErr.sqlMessage || retryErr.message);
          return res.status(500).json({ 
            error: retryErr.sqlMessage || retryErr.message,
            message: `Database error: ${retryErr.sqlMessage || retryErr.message}. Note: Product_status column may be missing. Run fix_product_status_column.sql`
          });
        }
        const newProductId = retryResult.insertId;
        // Continue with stock movement record...
        res.json({ Product_id: newProductId, ...req.body });
      });
      return;
    }
    
    if (err) {
      console.error("❌ Insert Product Error:", err.sqlMessage || err.message);
      return res.status(500).json({ 
        error: err.sqlMessage || err.message,
        message: `Database error: ${err.sqlMessage || err.message}`
      });
    }

    const newProductId = result.insertId;

    // 5) Stock Movement Record: record initial stock as an 'in' movement
    const stockQty = Number(Product_stock) || 0;
    const staffId = Number(req.body.staff_id) || 1; // fallback to admin/staff 1
    if (stockQty > 0) {
      const smSql = `INSERT INTO stock_movement (stock_movement_type, stock_movement_quantity, inventory_id, staff_id) VALUES ('in', ?, ?, ?)`;
      db.query(smSql, [stockQty, newProductId, staffId], (smErr) => {
        if (smErr) {
          console.error("⚠️ Stock movement insert failed:", smErr.message);
        }
      });
    }

    // 1) Notification Center: add notification
    const noteSql = `INSERT INTO notifications (title, message, item_name, action, user_name, user_id) VALUES (?, ?, ?, ?, ?, ?)`;
    const userName = req.body.user_name || 'Admin';
    const action = 'New item added to inventory';
    const title = 'Item Added';
    const message = `${Product_name} was added by ${userName}`;
    db.query(noteSql, [title, message, Product_name, action, userName, staffId], (nErr) => {
      if (nErr) {
        console.error("⚠️ Notification insert failed:", nErr.message);
      }
    });

    // 3) Dashboard Auto-Update: push SSE event
    sseBroadcast('inventory_updated', {
      type: 'product_created',
      product_id: newProductId,
      item_name: Product_name,
      stock: stockQty
    });

    // 4) Predictive Insights Trigger (fire-and-forget)
    try {
      exec(`curl -s http://localhost:${process.env.PORT || 5001}/api/predict/${encodeURIComponent(Product_sku)}`);
    } catch (e) {
      // best-effort only
    }

    res.json({ Product_id: newProductId, ...req.body });
  });
});

// Update product
app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const { 
    Product_name, 
    Product_sku, 
    Product_price, 
    Product_category, 
    reorder_level, 
    supplier_id, 
    Product_stock, 
    Product_status 
  } = req.body;

  // Validate required fields - allow 0 as a valid price
  if (!Product_name || !Product_name.trim()) {
    return res.status(400).json({ error: "Missing required field: Product_name" });
  }
  
  if (!Product_sku || !Product_sku.trim()) {
    return res.status(400).json({ error: "Missing required field: Product_sku" });
  }
  
  // Allow 0 as a valid price value
  if (Product_price === undefined || Product_price === null) {
    return res.status(400).json({ error: "Missing required field: Product_price" });
  }

  const sql = `
    UPDATE product 
    SET Product_name=?, 
        Product_sku=?, 
        Product_price=?, 
        Product_category=?, 
        reorder_level=?, 
        supplier_id=?, 
        Product_stock=?, 
        Product_status=? 
    WHERE Product_id=?
  `;

  db.query(
    sql, 
    [Product_name, Product_sku, Product_price, Product_category, reorder_level || 10, supplier_id || 1, Product_stock || 0, Product_status || 'Active', id], 
    (err) => {
      // If error is about Product_status column, retry without it
      if (err && (err.message?.includes('Product_status') || err.sqlMessage?.includes('Product_status'))) {
        const sqlWithoutStatus = `
          UPDATE product 
          SET Product_name=?, 
              Product_sku=?, 
              Product_price=?, 
              Product_category=?, 
              reorder_level=?, 
              supplier_id=?, 
              Product_stock=?
          WHERE Product_id=?
        `;
        db.query(sqlWithoutStatus, [Product_name, Product_sku, Product_price, Product_category, reorder_level || 10, supplier_id || 1, Product_stock || 0, id], (retryErr) => {
          if (retryErr) {
            console.error("❌ Update Product Error (retry):", retryErr.sqlMessage || retryErr.message);
            return res.status(500).json({ 
              error: retryErr.sqlMessage || retryErr.message,
              message: `Database error: ${retryErr.sqlMessage || retryErr.message}. Note: Product_status column may be missing. Run fix_product_status_column.sql`
            });
          }
          res.json({ Product_id: id, ...req.body });
        });
        return;
      }
      if (err) {
        console.error("❌ Update Product Error:", err.sqlMessage);
        return res.status(500).json({ error: err.sqlMessage });
      }
      res.json({ Product_id: id, ...req.body });
    }
  );
});

// Delete product
app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM product WHERE Product_id=?", [id], (err) => {
    if (err) {
      console.error("❌ Delete Product Error:", err);
      return res.status(500).json(err);
    }
    res.json({ success: true });
  });
});

// ===================== PRODUCTS CRUD =========================


// ===================== ITEMS (alias of products) =========================
// These endpoints provide a friendlier /items path while using the same product table

// Get all items
app.get("/api/items", (req, res) => {
  db.query("SELECT * FROM product", (err, results) => {
    if (err) {
      console.error("❌ Fetch Items Error:", err);
      console.error("   Error code:", err.code);
      console.error("   Error message:", err.message);
      return res.status(500).json({ 
        error: "Database error", 
        message: err.message,
        code: err.code 
      });
    }
    res.json(results || []);
  });
});

// Get single item
app.get("/api/items/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT p.*, s.supplier_name, s.supplier_email, s.supplier_contactnum
    FROM product p
    LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
    WHERE p.Product_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("❌ Fetch Item Error:", err);
      return res.status(500).json(err);
    }
    if (results.length === 0) return res.status(404).json({ error: "Item not found" });
    res.json(results[0]);
  });
});

// Create item (accepts either Product_* fields or generic names)
app.post("/api/items", (req, res) => {
  const body = req.body || {};
  const Product_name = body.Product_name || body.name;
  const Product_sku = body.Product_sku || body.sku;
  // Ensure price is numeric; accept body.price as alias
  const Product_price = body.Product_price !== undefined ? Number(body.Product_price) : parseFloat(body.price);
  const Product_category = body.Product_category || body.category || 'Uncategorized';
  const reorder_level = body.reorder_level !== undefined ? Number(body.reorder_level) : Number(body.threshold) || 10;
  const supplier_id = body.supplier_id || 1;
  const Product_stock = body.Product_stock !== undefined ? Number(body.Product_stock) : Number(body.stock) || 0;
  const Product_status = body.Product_status || body.status || 'Active';

  if (!Product_name || !Product_sku || Number.isNaN(Product_price)) {
    return res.status(400).json({ error: "Missing or invalid fields: name, sku, price" });
  }

  // Check if Product_status column exists, if not, exclude it from INSERT
  const sql = `
    INSERT INTO product 
    (Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock${Product_status ? ', Product_status' : ''})
    VALUES (?, ?, ?, ?, ?, ?, ?${Product_status ? ', ?' : ''})
  `;

  const values = [Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock];
  if (Product_status) {
    values.push(Product_status);
  }

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Insert Item Error:", err.sqlMessage || err.message);
      console.error("   SQL:", sql);
      console.error("   Data:", { Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock, Product_status });
      return res.status(500).json({ 
        error: err.sqlMessage || err.message,
        message: `Database error: ${err.sqlMessage || err.message}`,
        code: err.code
      });
    }

    const newId = result.insertId;
    res.json({ Product_id: newId, ...req.body });
  });
});

// Update item
app.put("/api/items/:id", (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const Product_name = body.Product_name || body.name;
  const Product_sku = body.Product_sku || body.sku;
  const Product_price = body.Product_price !== undefined ? Number(body.Product_price) : parseFloat(body.price);
  const Product_category = body.Product_category || body.category || 'Uncategorized';
  const reorder_level = body.reorder_level !== undefined ? Number(body.reorder_level) : Number(body.threshold) || 10;
  const supplier_id = body.supplier_id || 1;
  const Product_stock = body.Product_stock !== undefined ? Number(body.Product_stock) : Number(body.stock) || 0;
  const Product_status = body.Product_status || body.status || 'Active';

  if (!Product_name || !Product_sku || Number.isNaN(Product_price)) {
    return res.status(400).json({ error: "Missing or invalid fields: name, sku, price" });
  }

  // Build UPDATE query conditionally based on whether Product_status column exists
  // For now, we'll try with Product_status and handle the error gracefully
  const sql = `
    UPDATE product 
    SET Product_name=?, Product_sku=?, Product_price=?, Product_category=?, reorder_level=?, supplier_id=?, Product_stock=?, Product_status=?
    WHERE Product_id=?
  `;

  db.query(sql, [Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock, Product_status, id], (err) => {
    // If error is about Product_status column, retry without it
    if (err && (err.message?.includes('Product_status') || err.sqlMessage?.includes('Product_status'))) {
      const sqlWithoutStatus = `
        UPDATE product 
        SET Product_name=?, Product_sku=?, Product_price=?, Product_category=?, reorder_level=?, supplier_id=?, Product_stock=?
        WHERE Product_id=?
      `;
      db.query(sqlWithoutStatus, [Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock, id], (retryErr) => {
        if (retryErr) {
          console.error("❌ Update Item Error (retry):", retryErr.sqlMessage || retryErr.message);
          console.error("   SQL:", sqlWithoutStatus);
          console.error("   Data:", { Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock, id });
          return res.status(500).json({ 
            error: retryErr.sqlMessage || retryErr.message,
            message: `Database error: ${retryErr.sqlMessage || retryErr.message}. Note: Product_status column may be missing. Run fix_product_status_column.sql`,
            code: retryErr.code
          });
        }
        res.json({ Product_id: id, ...req.body });
      });
      return;
    }
    if (err) {
      console.error("❌ Update Item Error:", err.sqlMessage || err.message);
      console.error("   SQL:", sql);
      console.error("   Data:", { Product_name, Product_sku, Product_price, Product_category, reorder_level, supplier_id, Product_stock, Product_status, id });
      return res.status(500).json({ 
        error: err.sqlMessage || err.message,
        message: `Database error: ${err.sqlMessage || err.message}`,
        code: err.code
      });
    }
    res.json({ Product_id: id, ...req.body });
  });
});

// Delete item
app.delete("/api/items/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM product WHERE Product_id=?", [id], (err) => {
    if (err) {
      console.error("❌ Delete Item Error:", err);
      return res.status(500).json(err);
    }
    res.json({ success: true });
  });
});

// Update stock (alias)
app.patch("/api/items/:id/stock", (req, res) => {
  const { id } = req.params;
  const { quantity, action, reason, reference, staff_id, user_name } = req.body;
  if (!quantity || !action) {
    return res.status(400).json({ error: "Missing required fields: quantity and action" });
  }
  if (action !== 'add' && action !== 'remove') {
    return res.status(400).json({ error: "Action must be 'add' or 'remove'" });
  }

  db.query("SELECT Product_stock, Product_name, reorder_level FROM product WHERE Product_id=?", [id], (err, results) => {
    if (err) {
      console.error("❌ Fetch Item Error:", err);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) return res.status(404).json({ error: "Item not found" });

    const product = results[0];
    const currentStock = Number(product.Product_stock) || 0;
    const quantityNum = Number(quantity);
    const newStock = action === 'add' ? currentStock + quantityNum : currentStock - quantityNum;
    if (newStock < 0) return res.status(400).json({ error: "Cannot remove more stock than available" });

    const updateSql = "UPDATE product SET Product_stock = ?, updated_at = NOW() WHERE Product_id = ?";
    db.query(updateSql, [newStock, id], (updateErr) => {
      if (updateErr) {
        console.error("❌ Update Item Stock Error:", updateErr);
        return res.status(500).json({ error: updateErr.message });
      }

      const movementType = action === 'add' ? 'in' : 'out';
      const staffId = Number(staff_id) || 1;
      const smSql = `INSERT INTO stock_movement (stock_movement_type, stock_movement_quantity, inventory_id, staff_id) VALUES (?, ?, ?, ?)`;
      db.query(smSql, [movementType, quantityNum, id, staffId], () => {
        // ignore movement error best-effort
      });

      sseBroadcast('stock_updated', {
        type: 'stock_adjusted',
        product_id: id,
        item_name: product.Product_name,
        old_stock: currentStock,
        new_stock: newStock,
        action: action,
        quantity: quantityNum
      });

      // Include stock in response per requirement
      res.json({ message: 'Stock updated successfully', stock: newStock, new_stock: newStock, old_stock: currentStock, quantity: quantityNum, action });
    });
  });
});

// ===================== ITEMS (alias of products) =========================


// ===================== INVOICES =========================

const normalizeInvoiceStatus = (value) => {
  if (!value || typeof value !== 'string') return 'Pending';
  const normalized = value.trim();
  if (normalized === 'Paid' || normalized === 'Pending' || normalized === 'Overdue') {
    return normalized;
  }
  const upper = normalized.toUpperCase();
  if (upper === 'PAID') return 'Paid';
  if (upper === 'PENDING') return 'Pending';
  if (upper === 'OVERDUE') return 'Overdue';
  return 'Pending';
};

const mapInvoicesWithItems = (invoiceRows = [], itemRows = []) => {
  const itemsByInvoice = {};
  itemRows.forEach((item) => {
    if (!itemsByInvoice[item.invoice_id]) {
      itemsByInvoice[item.invoice_id] = [];
    }
    itemsByInvoice[item.invoice_id].push({
      item_id: item.item_id,
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      product_id: item.product_id || null,
    });
  });

  return invoiceRows.map((invoice) => ({
    invoice_id: invoice.invoice_id,
    invoice_number: invoice.invoice_number,
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email,
    customer_phone: invoice.customer_phone,
    customer_address: invoice.customer_address,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    status: invoice.status,
    subtotal: Number(invoice.subtotal) || 0,
    tax: Number(invoice.tax) || 0,
    total: Number(invoice.total) || 0,
    notes: invoice.notes || '',
    created_at: invoice.created_at,
    items: itemsByInvoice[invoice.invoice_id] || [],
  }));
};

const fetchInvoicesWithItems = (res, invoiceFilterSql = '', params = [], single = false) => {
  const baseSql = `SELECT invoice_id, invoice_number, customer_name, customer_email, customer_phone,
    customer_address, invoice_date, due_date, status, subtotal, tax, total, notes, created_at
    FROM invoices ${invoiceFilterSql} ORDER BY invoice_date DESC, invoice_id DESC`;

  db.query(baseSql, params, (err, invoiceRows) => {
    if (err) {
      console.error('❌ Fetch Invoices Error:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!Array.isArray(invoiceRows) || invoiceRows.length === 0) {
      return res.json(single ? null : []);
    }

    const invoiceIds = invoiceRows.map((row) => row.invoice_id);
    db.query(
      'SELECT item_id, invoice_id, description, quantity, unit_price, product_id FROM invoice_items WHERE invoice_id IN (?) ORDER BY item_id ASC',
      [invoiceIds],
      (itemErr, itemRows) => {
        if (itemErr) {
          console.error('❌ Fetch Invoice Items Error:', itemErr.message);
          return res.status(500).json({ error: itemErr.message });
        }
        const mapped = mapInvoicesWithItems(invoiceRows, itemRows);
        res.json(single ? (mapped[0] || null) : mapped);
      }
    );
  });
};

app.get('/api/invoices', (req, res) => {
  fetchInvoicesWithItems(res);
});

app.get('/api/invoices/:id', (req, res) => {
  const invoiceId = req.params.id;
  fetchInvoicesWithItems(res, 'WHERE invoice_id = ?', [invoiceId], true);
});

app.post('/api/invoices', (req, res) => {
  const payload = req.body || {};
  const invoiceData = payload.invoice || payload;
  const items = payload.items || invoiceData.items || [];

  const invoiceNumber = invoiceData.invoice_number || invoiceData.invoiceNumber;
  const customerName = invoiceData.customer_name || invoiceData.customerName;
  const invoiceDate = invoiceData.invoice_date || invoiceData.invoiceDate;
  const dueDate = invoiceData.due_date || invoiceData.dueDate || null;
  const statusInput = invoiceData.status || 'Pending';
  const normalizedStatus = normalizeInvoiceStatus(statusInput);

  if (!invoiceNumber || !customerName || !invoiceDate || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Missing required fields: invoiceNumber, customerName, invoiceDate, items',
    });
  }

  const itemRows = items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity) || 0,
    unit_price: Number(item.unit_price ?? item.unitPrice ?? 0) || 0,
    product_id: item.product_id || item.productId || null,
  })).filter((row) => row.description && row.quantity > 0 && row.unit_price >= 0);

  if (itemRows.length === 0) {
    return res.status(400).json({ error: 'Invoice items are invalid or empty' });
  }

  const subtotal = invoiceData.subtotal !== undefined
    ? Number(invoiceData.subtotal)
    : itemRows.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);
  const tax = invoiceData.tax !== undefined
    ? Number(invoiceData.tax)
    : Number((subtotal * 0.05).toFixed(2));
  const total = invoiceData.total !== undefined
    ? Number(invoiceData.total)
    : subtotal + tax;

  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error('❌ Invoice transaction error:', transactionErr.message);
      return res.status(500).json({ error: transactionErr.message });
    }

    const invoiceInsert = {
      invoice_number: invoiceNumber,
      customer_name: customerName,
      customer_email: invoiceData.customer_email || invoiceData.customerEmail || null,
      customer_phone: invoiceData.customer_phone || invoiceData.customerPhone || null,
      customer_address: invoiceData.customer_address || invoiceData.customerAddress || null,
      invoice_date: invoiceDate,
      due_date: dueDate,
    status: normalizedStatus,
      subtotal,
      tax,
      total,
      notes: invoiceData.notes || '',
    };

    db.query('INSERT INTO invoices SET ?', invoiceInsert, (insertErr, result) => {
      if (insertErr) {
        db.rollback(() => {
          console.error('❌ Insert Invoice Error:', insertErr.message);
          res.status(500).json({ error: insertErr.message });
        });
        return;
      }

      const invoiceId = result.insertId;
      const values = itemRows.map((item) => [
        invoiceId,
        item.description,
        item.quantity,
        item.unit_price,
        item.product_id || null,
      ]);

      db.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, product_id) VALUES ?',
        [values],
        (itemErr) => {
          if (itemErr) {
            db.rollback(() => {
              console.error('❌ Insert Invoice Items Error:', itemErr.message);
              res.status(500).json({ error: itemErr.message });
            });
            return;
          }

          const adjustments = itemRows
            .map((row) => ({ product_id: row.product_id, quantity: Number(row.quantity) || 0 }))
            .filter((row) => row.product_id && row.quantity > 0);

          const applyStockDelta = (delta, done) => {
            if (!delta || adjustments.length === 0) return done();
            let index = 0;
            const next = () => {
              if (index >= adjustments.length) return done();
              const adj = adjustments[index++];
              db.query(
                'UPDATE product SET Product_stock = Product_stock + ? WHERE Product_id = ?',
                [delta * adj.quantity, adj.product_id],
                (stockErr) => {
                  if (stockErr) return done(stockErr);
                  next();
                }
              );
            };
            next();
          };

          const finalize = () => {
            db.commit((commitErr) => {
              if (commitErr) {
                db.rollback(() => {
                  console.error('❌ Invoice commit error:', commitErr.message);
                  res.status(500).json({ error: commitErr.message });
                });
                return;
              }
              fetchInvoicesWithItems(res, 'WHERE invoice_id = ?', [invoiceId], true);
            });
          };

          if (normalizedStatus === 'Paid') {
            applyStockDelta(-1, (stockErr) => {
              if (stockErr) {
                db.rollback(() => {
                  console.error('❌ Invoice stock update error:', stockErr.message);
                  res.status(500).json({ error: stockErr.message });
                });
                return;
              }
              finalize();
            });
          } else {
            finalize();
          }
        }
      );
    });
  });
});

app.patch('/api/invoices/:id/status', (req, res) => {
  const invoiceId = req.params.id;
  const { status } = req.body || {};
  const normalizedStatus = normalizeInvoiceStatus(status);

  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error('❌ Invoice status transaction error:', transactionErr.message);
      return res.status(500).json({ error: transactionErr.message });
    }

    db.query('SELECT status FROM invoices WHERE invoice_id = ?', [invoiceId], (fetchErr, rows) => {
      if (fetchErr) {
        return db.rollback(() => {
          console.error('❌ Fetch Invoice Status Error:', fetchErr.message);
          res.status(500).json({ error: fetchErr.message });
        });
      }

      if (!Array.isArray(rows) || rows.length === 0) {
        return db.rollback(() => {
          res.status(404).json({ error: 'Invoice not found' });
        });
      }

      const currentStatus = normalizeInvoiceStatus(rows[0].status || 'Pending');
      if (currentStatus === normalizedStatus) {
        return db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() => {
              console.error('❌ Invoice status commit error:', commitErr.message);
              res.status(500).json({ error: commitErr.message });
            });
          }
          fetchInvoicesWithItems(res, 'WHERE invoice_id = ?', [invoiceId], true);
        });
      }

      const needsDecrease = currentStatus !== 'Paid' && normalizedStatus === 'Paid';
      const needsRestore = currentStatus === 'Paid' && normalizedStatus !== 'Paid';
      const stockDelta = needsDecrease ? -1 : needsRestore ? 1 : 0;

      db.query(
        'SELECT item_id, description, quantity, product_id FROM invoice_items WHERE invoice_id = ?',
        [invoiceId],
        (itemErr, itemRows) => {
          if (itemErr) {
            return db.rollback(() => {
              console.error('❌ Fetch Invoice Items Error:', itemErr.message);
              res.status(500).json({ error: itemErr.message });
            });
          }

          const rowsArray = Array.isArray(itemRows) ? itemRows : [];

          const resolveProducts = (callback) => {
            db.query('SELECT Product_id, Product_sku, Product_name FROM product', (prodErr, productRows) => {
              if (prodErr) {
                return callback(prodErr);
              }

              const products = Array.isArray(productRows) ? productRows : [];
              const productBySku = new Map();
              const productByName = new Map();

              products.forEach((prod) => {
                if (prod.Product_sku) {
                  productBySku.set(String(prod.Product_sku).toUpperCase(), prod.Product_id);
                }
                if (prod.Product_name) {
                  productByName.set(String(prod.Product_name).trim().toUpperCase(), prod.Product_id);
                }
              });

              const adjustments = [];
              const itemsNeedingUpdate = [];

              rowsArray.forEach((row) => {
                const quantity = Number(row.quantity) || 0;
                if (quantity <= 0) return;

                let productId = row.product_id || null;
                if (!productId && row.description) {
                  const skuMatch = row.description.match(/\(([A-Za-z0-9\-]+)\)\s*$/);
                  if (skuMatch) {
                    const sku = skuMatch[1].toUpperCase();
                    if (productBySku.has(sku)) {
                      productId = productBySku.get(sku);
                    }
                  }
                  if (!productId) {
                    const namePart = row.description.split('(')[0].trim().toUpperCase();
                    if (productByName.has(namePart)) {
                      productId = productByName.get(namePart);
                    }
                  }
                }

                if (productId) {
                  adjustments.push({ product_id: productId, quantity });
                  if (!row.product_id) {
                    itemsNeedingUpdate.push({ item_id: row.item_id, product_id: productId });
                  }
                }
              });

              callback(null, { adjustments, itemsNeedingUpdate });
            });
          };

          resolveProducts((resolveErr, data) => {
            if (resolveErr) {
              return db.rollback(() => {
                console.error('❌ Resolve Product Error:', resolveErr.message);
                res.status(500).json({ error: resolveErr.message });
              });
            }

            const { adjustments, itemsNeedingUpdate } = data;

            const applyProductIdUpdates = (done) => {
              if (!itemsNeedingUpdate || itemsNeedingUpdate.length === 0) {
                return done();
              }
              let index = 0;
              const next = () => {
                if (index >= itemsNeedingUpdate.length) return done();
                const item = itemsNeedingUpdate[index++];
                db.query(
                  'UPDATE invoice_items SET product_id = ? WHERE item_id = ?',
                  [item.product_id, item.item_id],
                  (updateErr) => {
                    if (updateErr) return done(updateErr);
                    next();
                  }
                );
              };
              next();
            };

            const applyStockDelta = (delta, done) => {
              if (!delta || !adjustments || adjustments.length === 0) {
                return done();
              }
              let index = 0;
              const next = () => {
                if (index >= adjustments.length) return done();
                const adj = adjustments[index++];
                db.query(
                  'UPDATE product SET Product_stock = Product_stock + ? WHERE Product_id = ?',
                  [delta * adj.quantity, adj.product_id],
                  (stockErr) => {
                    if (stockErr) return done(stockErr);
                    next();
                  }
                );
              };
              next();
            };

            applyStockDelta(stockDelta, (stockErr) => {
              if (stockErr) {
                return db.rollback(() => {
                  console.error('❌ Invoice stock update error:', stockErr.message);
                  res.status(500).json({ error: stockErr.message });
                });
              }

              db.query('UPDATE invoices SET status = ? WHERE invoice_id = ?', [status, invoiceId], (updateErr) => {
                if (updateErr) {
                  return db.rollback(() => {
                    console.error('❌ Update Invoice Status Error:', updateErr.message);
                    res.status(500).json({ error: updateErr.message });
                  });
                }

                applyProductIdUpdates((productUpdateErr) => {
                  if (productUpdateErr) {
                    return db.rollback(() => {
                      console.error('❌ Invoice item product_id update error:', productUpdateErr.message);
                      res.status(500).json({ error: productUpdateErr.message });
                    });
                  }

                  db.query('UPDATE invoices SET status = ? WHERE invoice_id = ?', [normalizedStatus, invoiceId], (statusErr) => {
                    if (statusErr) {
                      return db.rollback(() => {
                        console.error('❌ Update Invoice Status Error:', statusErr.message);
                        res.status(500).json({ error: statusErr.message });
                      });
                    }

                    db.commit((commitErr) => {
                    if (commitErr) {
                      return db.rollback(() => {
                        console.error('❌ Invoice status commit error:', commitErr.message);
                        res.status(500).json({ error: commitErr.message });
                      });
                    }

                    fetchInvoicesWithItems(res, 'WHERE invoice_id = ?', [invoiceId], true);
                    });
                  });
                });
              });
            });
          });
        }
      );
    });
  });
});


// ===================== REPORTS & ANALYTICS =========================

// 1) Low Stock Products
app.get("/api/reports/low-stock", (req, res) => {
  const sql = `
    SELECT Product_id, Product_name, Product_stock, reorder_level
    FROM product
    WHERE Product_stock <= reorder_level
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Low Stock Report Error:", err);
      console.error("   SQL:", sql);
      console.error("   Error code:", err.code);
      console.error("   Error message:", err.message);
      return res.status(500).json({ 
        error: "Database error", 
        message: err.message,
        code: err.code 
      });
    }
    res.json(results || []);
  });
});

// Dashboard metrics (total items, low stock count, inventory value)
app.get("/api/dashboard/metrics", (req, res) => {
  const totalSql = `SELECT COUNT(*) AS total FROM product`;
  const lowSql = `SELECT COUNT(*) AS low FROM product WHERE Product_stock <= reorder_level`;
  const valueSql = `SELECT COALESCE(SUM(Product_stock * Product_price),0) AS inventory_value FROM product`;

  db.query(totalSql, (e1, r1) => {
    if (e1) {
      console.error("❌ Dashboard Metrics Error (total):", e1);
      console.error("   SQL:", totalSql);
      console.error("   Error:", e1.message);
      return res.status(500).json({ 
        error: "Database error", 
        message: e1.message,
        code: e1.code,
        sql: "total_items"
      });
    }
    db.query(lowSql, (e2, r2) => {
      if (e2) {
        console.error("❌ Dashboard Metrics Error (low stock):", e2);
        console.error("   SQL:", lowSql);
        console.error("   Error:", e2.message);
        return res.status(500).json({ 
          error: "Database error", 
          message: e2.message,
          code: e2.code,
          sql: "low_stock"
        });
      }
      db.query(valueSql, (e3, r3) => {
        if (e3) {
          console.error("❌ Dashboard Metrics Error (inventory value):", e3);
          console.error("   SQL:", valueSql);
          console.error("   Error:", e3.message);
          return res.status(500).json({ 
            error: "Database error", 
            message: e3.message,
            code: e3.code,
            sql: "inventory_value"
          });
        }
        res.json({
          total_items: r1[0]?.total || 0,
          low_stock_count: r2[0]?.low || 0,
          inventory_value: r3[0]?.inventory_value || 0
        });
      });
    });
  });
});

// 2) Stock by Category
app.get("/api/reports/stock-by-category", (req, res) => {
  const sql = `
    SELECT Product_category, SUM(Product_stock) as total_stock
    FROM product
    GROUP BY Product_category
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Stock by Category Error:", err);
      return res.status(500).json(err);
    }
    res.json(results);
  });
});

// 3) Supplier Performance (total orders + amount)
app.get("/api/reports/supplier-performance", (req, res) => {
  const sql = `
    SELECT s.supplier_name,
           COUNT(o.order_id) AS total_orders,
           COALESCE(SUM(o.total_amount), 0) AS total_amount
    FROM supplier s
    LEFT JOIN orders_from_supplier o ON s.supplier_id = o.supplier_id
    GROUP BY s.supplier_id, s.supplier_name
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Supplier Performance Error:", err);
      return res.status(500).json(err);
    }
    res.json(results);
  });
});

// 4) Monthly Orders Summary
app.get("/api/reports/monthly-orders", (req, res) => {
  const sql = `
    SELECT DATE_FORMAT(order_date, '%Y-%m') as month,
           COUNT(order_id) AS total_orders,
           COALESCE(SUM(total_amount), 0) AS total_amount
    FROM orders_from_supplier
    GROUP BY DATE_FORMAT(order_date, '%Y-%m')
    ORDER BY month ASC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Monthly Orders Report Error:", err);
      return res.status(500).json(err);
    }
    res.json(results);
  });
});

// ===================== REPORTS & ANALYTICS =========================


// ===================== SETTINGS CRUD API =====================
app.get("/api/settings/:staff_id", (req, res) => {
  const { staff_id } = req.params;
  db.query("SELECT * FROM settings WHERE staff_id = ?", [staff_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.json({
        notification_threshold: 10,
        reorder_rule: "default",
        staff_id,
      });
    res.json(results[0]);
  });
});

app.post("/api/settings", (req, res) => {
  const { notification_threshold, reorder_rule, staff_id } = req.body;
  db.query(
    "INSERT INTO settings (notification_threshold, reorder_rule, staff_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE notification_threshold=?, reorder_rule=?",
    [notification_threshold, reorder_rule, staff_id, notification_threshold, reorder_rule],
    (err) => {
      if (err) return res.status(500).json({ error: "Error saving settings" });
      res.json({ success: true, message: "Settings saved successfully" });
    }
  );
});

// ===================== SETTINGS CRUD API =====================

// ===================== NOTIFICATIONS API =====================
app.get("/api/notifications", (req, res) => {
  const sql = `SELECT id, title, message, item_name, action, user_name, user_id, created_at FROM notifications ORDER BY created_at DESC LIMIT 100`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
// ===================== NOTIFICATIONS API =====================

// ===================== ML | PREDICT STOCK =========================

app.get("/api/predict/:productId", (req, res) => {
  const { productId } = req.params;

  exec(`python predict_arima.py ${productId}`, (err, stdout, stderr) => {
    if (err) {
      console.error("❌ ARIMA Error:", stderr);
      return res.status(500).json({ error: "Prediction failed" });
    }

    try {
      const forecast = JSON.parse(stdout.replace("'", '"'));
      res.json({ productId, forecast });
    } catch (e) {
      res.status(200).send(stdout); // fallback plain text
    }
  });
});

// Train LSTM models endpoint
app.post("/api/ml/train", async (req, res) => {
  try {
    const limit = req.body.limit || null;
    const response = await axios.post(
      `${ML_SERVICE_BASE_URL}/api/train`,
      { limit },
      { timeout: 300000 } // 5 minute timeout for training
    );
    res.json(response.data);
  } catch (error) {
    console.error("❌ LSTM training error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to train LSTM models"
    });
  }
});

// Get LSTM service health
app.get("/api/ml/health", async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_BASE_URL}/api/health`, { timeout: 3000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      status: "unavailable",
      error: "LSTM service not available",
      message: "Start the LSTM service to enable AI predictions"
    });
  }
});

// Get AI predictions for a product (wrapper endpoint with LSTM integration)
app.get("/api/predictions/products/:id", async (req, res) => {
  const { id } = req.params;

  const fetchFromML = async (endpoint) => {
    try {
      // Increased timeout to 30 seconds to allow for on-the-fly training
      // Training a model can take 1-5 seconds, and with data processing, 
      // it may need more time than the default 5 seconds
      const response = await axios.get(`${ML_SERVICE_BASE_URL}${endpoint}`, {
        timeout: 30000, // 30 seconds - allows time for training if needed
      });
      return response.data;
    } catch (mlError) {
      // Don't log 404 errors as warnings - they're expected for products without enough data
      if (mlError.response && mlError.response.status === 404) {
        // Product doesn't have enough historical data (needs 60+ days)
        // This is normal and will use fallback calculations
        return null;
      }
      // Only log non-404 errors (timeouts, connection issues, etc.)
      if (!mlError.response || mlError.response.status !== 404) {
        console.log(`⚠️ ML service request to ${endpoint} failed:`, mlError.message);
      }
      return null;
    }
  };

  try {
    db.query(
      "SELECT Product_id, Product_sku, Product_name, Product_stock, reorder_level, Product_category FROM product WHERE Product_id = ? OR Product_sku = ? LIMIT 1",
      [id, id],
      async (err, results) => {
        if (err) {
          console.error("❌ Fetch Product Error:", err);
          return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
          console.warn(`⚠️ Product not found for prediction: ID ${id}`);
          return res.status(404).json({
            error: "Product not found",
            message: `Product with ID or SKU ${id} does not exist`,
          });
        }

        const product = results[0];
        const currentStock = Number(product.Product_stock) || 0;
        const threshold = Number(product.reorder_level) || 10;
        const productSku = product.Product_sku || String(product.Product_id);
        const mlProductId =
          (typeof id === "string" && /[A-Za-z]/.test(id)) ? id : productSku;

        // Try LSTM service first, fallback to old endpoints if needed
        const [mlForecastResponse, mlRestockResponse] =
          await Promise.all([
            fetchFromML(`/api/forecast/${encodeURIComponent(mlProductId)}?days=30`),
            fetchFromML(`/api/restock/${encodeURIComponent(mlProductId)}?current_stock=${currentStock}&lead_time=7&safety_days=14`),
          ]);

        const forecastData =
          mlForecastResponse && mlForecastResponse.success
            ? mlForecastResponse.data || null
            : null;
        const restockData =
          mlRestockResponse && mlRestockResponse.success
            ? mlRestockResponse.data || null
            : null;
        
        // Extract depletion and reorder info from restock data
        const depletionData = restockData ? {
          depletion_days: restockData.days_until_stockout,
          confidence: restockData.forecast?.confidence_score || 85,
          current_stock: restockData.current_stock,
          predicted_daily_demand: restockData.daily_demand,
          depletion_date: restockData.days_until_stockout 
            ? new Date(Date.now() + restockData.days_until_stockout * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : null
        } : null;
        
        const reorderData = restockData ? {
          suggested_quantity: restockData.suggested_quantity,
          reorder_point: restockData.reorder_point,
          lead_time_days: 7,
          safety_stock_days: 14,
          daily_demand: restockData.daily_demand,
          safety_stock: restockData.safety_stock
        } : null;

        let depletionPrediction = null;
        let reorderSuggestion = null;
        let forecastOverview = null;
        let predictionPayload = null;

        if (depletionData) {
          const depletionDays =
            depletionData.depletion_days ??
            depletionData.days_until_depletion ??
            null;
          const predictedDailyDemand =
            depletionData.predicted_daily_demand ?? null;
          const depletionDate =
            typeof depletionDays === "number" && Number.isFinite(depletionDays)
              ? new Date(
                  Date.now() + depletionDays * 24 * 60 * 60 * 1000
                ).toISOString()
              : null;

          depletionPrediction = {
            depletion_days: depletionDays,
            confidence: depletionData.confidence ?? 85,
            current_stock: currentStock,
            predicted_daily_demand: predictedDailyDemand,
            prediction_method: "lstm",
            depletion_date: depletionData.depletion_date || depletionDate,
          };
        }

        if (reorderData) {
          reorderSuggestion = {
            suggested_quantity:
              reorderData.suggested_quantity ??
              reorderData.suggested_reorder_quantity ??
              Math.max(threshold * 2, 20),
            lead_time_days: reorderData.lead_time_days ?? 7,
            safety_stock_days: reorderData.safety_stock_days ?? 5,
            predicted_daily_demand:
              reorderData.predicted_daily_demand ??
              depletionPrediction?.predicted_daily_demand ??
              null,
          };
        }

        if (forecastData) {
          const forecastDemand = Array.isArray(forecastData.forecast_demand)
            ? forecastData.forecast_demand
            : Array.isArray(forecastData.forecast)
            ? forecastData.forecast
            : [];
          
          // Extract confidence intervals if available
          const confidenceIntervals = Array.isArray(forecastData.confidence_intervals)
            ? forecastData.confidence_intervals
            : [];
          const confidenceLower = confidenceIntervals.map(ci => ci[0] || 0);
          const confidenceUpper = confidenceIntervals.map(ci => ci[1] || 0);
          
          const cumulativeDemand = forecastDemand.reduce(
            (acc, value) => {
              const previous = acc.length > 0 ? acc[acc.length - 1] : 0;
              acc.push(previous + (Number(value) || 0));
              return acc;
            },
            []
          );

          forecastOverview = {
            forecast_demand: forecastDemand,
            confidence_lower: confidenceLower.length > 0 ? confidenceLower : [],
            confidence_upper: confidenceUpper.length > 0 ? confidenceUpper : [],
            cumulative_demand: cumulativeDemand,
            days_ahead: forecastData.forecast_days || forecastDemand.length,
            confidence_score: forecastData.confidence_score || 85,
            model_type: forecastData.model_type || "lstm"
          };
        }

        const resolveFallbackPrediction = () =>
          new Promise((resolve) => {
            // Helper function to finish calculation
            const finishCalculation = (avgDailyConsumption) => {
              const daysUntilDepletion =
                avgDailyConsumption > 0
                  ? Math.ceil(currentStock / avgDailyConsumption)
                  : null;
              const depletionDate =
                typeof daysUntilDepletion === "number"
                  ? new Date(
                      Date.now() + daysUntilDepletion * 24 * 60 * 60 * 1000
                    ).toISOString()
                  : null;

              const fallbackDepletion = {
                depletion_days: daysUntilDepletion,
                confidence: 75,
                current_stock: currentStock,
                predicted_daily_demand: avgDailyConsumption,
                prediction_method: "calculated",
                depletion_date: depletionDate,
              };

              // Calculate restock quantity more intelligently
              // Use reorder_level as base, or calculate from consumption
              const baseQuantity = threshold > 0 
                ? Math.max(threshold, Math.ceil(avgDailyConsumption * 21)) // 3 weeks supply
                : Math.max(20, Math.ceil(avgDailyConsumption * 30)); // 30 days supply, min 20
              
              const fallbackReorder = {
                suggested_quantity: baseQuantity,
                lead_time_days: 7,
                safety_stock_days: 5,
                predicted_daily_demand: avgDailyConsumption,
              };

              const fallbackForecast = {
                forecast_demand: Array.from({ length: 14 }, () =>
                  Math.max(0, Math.round(avgDailyConsumption))
                ),
                confidence_lower: [],
                confidence_upper: [],
                cumulative_demand: [],
                days_ahead: 14,
              };
              fallbackForecast.cumulative_demand =
                fallbackForecast.forecast_demand.reduce((acc, value) => {
                  const previous = acc.length > 0 ? acc[acc.length - 1] : 0;
                  acc.push(previous + value);
                  return acc;
                }, []);

              resolve({
                depletion: fallbackDepletion,
                reorder: fallbackReorder,
                forecast: fallbackForecast,
              });
            };

            // First try to get consumption from sales table (more accurate)
            db.query(
              `SELECT 
                SUM(s.quantity) as total_sales,
                COUNT(DISTINCT s.order_date) as days_with_sales,
                DATEDIFF(MAX(s.order_date), MIN(s.order_date)) + 1 as date_range_days
              FROM sales s
              JOIN product p ON s.product_id = p.Product_id
              WHERE (p.Product_id = ? OR p.Product_sku = ?)
                AND s.order_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
              GROUP BY s.product_id`,
              [product.Product_id, product.Product_sku || product.Product_id],
              (salesErr, salesResults) => {
                let avgDailyConsumption = 2; // Default fallback
                
                // Use sales data if available
                if (!salesErr && salesResults.length > 0 && salesResults[0].days_with_sales > 0) {
                  const dateRange = salesResults[0].date_range_days || salesResults[0].days_with_sales;
                  avgDailyConsumption = salesResults[0].total_sales / Math.max(dateRange, 1);
                }
                
                // If no sales data, try stock_movement
                if (avgDailyConsumption === 2) {
                  db.query(
                    "SELECT stock_movement_type, stock_movement_quantity, sm_date FROM stock_movement WHERE inventory_id = ? AND sm_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) ORDER BY sm_date DESC",
                    [product.Product_id],
                    (historyErr, historyResults) => {
                      if (!historyErr && historyResults.length > 0) {
                        let totalOut = 0;
                        let daySpan = 0;
                        const today = new Date();

                        historyResults.forEach((movement) => {
                          if (movement.stock_movement_type === "out") {
                            totalOut += Number(movement.stock_movement_quantity) || 0;
                            const movementDate = new Date(movement.sm_date);
                            const daysDiff = Math.max(
                              1,
                              Math.floor(
                                (today - movementDate) / (1000 * 60 * 60 * 24)
                              )
                            );
                            if (daySpan === 0 || daysDiff < daySpan) {
                              daySpan = daysDiff;
                            }
                          }
                        });

                        if (totalOut > 0 && daySpan > 0) {
                          avgDailyConsumption = totalOut / daySpan;
                        }
                      }
                      
                      // Continue with calculation
                      finishCalculation(avgDailyConsumption);
                    }
                  );
                } else {
                  // Use sales-based consumption
                  finishCalculation(avgDailyConsumption);
                }
              }
            );
          });

        if (!depletionPrediction || !reorderSuggestion) {
          const fallback = await resolveFallbackPrediction();
          depletionPrediction = depletionPrediction || fallback.depletion;
          reorderSuggestion = reorderSuggestion || fallback.reorder;
          forecastOverview = forecastOverview || fallback.forecast;
        }

        const status =
          currentStock <= threshold
            ? "At Risk"
            : currentStock <= threshold * 1.5
            ? "Warning"
            : "Good";

        const suggestedQty =
          // Use reorder_level as intelligent default if no suggestion available
          reorderSuggestion?.suggested_quantity || 
          (threshold > 0 ? Math.max(threshold, 20) : 20);

        predictionPayload = {
          days_until_depletion: depletionPrediction?.depletion_days ?? 0,
          confidence: depletionPrediction?.confidence ?? 75,
          suggested_reorder_quantity: suggestedQty,
          predicted_depletion_date:
            depletionPrediction?.depletion_date ||
            (depletionPrediction?.depletion_days
              ? new Date(
                  Date.now() +
                    depletionPrediction.depletion_days * 24 * 60 * 60 * 1000
                )
                  .toISOString()
                  .split("T")[0]
              : null),
          status,
          prediction_method: depletionPrediction?.prediction_method ?? "unknown",
        };

        res.json({
          success: true,
          product_id: product.Product_id,
          product_sku: productSku,
          product_name: product.Product_name,
          product_category: product.Product_category || null,
          current_stock: currentStock,
          threshold,
          prediction: predictionPayload,
          depletion_prediction: depletionPrediction,
          reorder_suggestion: reorderSuggestion,
          forecast: forecastOverview,
          ml_service_url: ML_SERVICE_BASE_URL,
          last_updated: new Date().toISOString(),
        });
      }
    );
  } catch (error) {
    console.error("❌ Prediction Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// ===================== PREDICT STOCK =========================

// ------------------ GLOBAL ERROR HANDLER ------------------
app.use((err, req, res, next) => {
  console.error("❌ Unhandled Error:", err);
  res.status(500).json({ 
    error: "Internal server error", 
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 5001;
// Bind to all network interfaces to accept connections from mobile devices
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Mobile app should connect to: http://YOUR_PC_IP:${PORT}/api`);
  console.log(`🤖 ML service base URL: ${ML_SERVICE_BASE_URL}`);
  
  // LSTM Service Health Check
  try {
    const healthResponse = await axios.get(`${ML_SERVICE_BASE_URL}/api/health`, { timeout: 3000 });
    console.log(`✅ LSTM Forecasting Service: ${healthResponse.data.status}`);
    console.log(`   Trained models: ${healthResponse.data.trained_models || 0}`);
  } catch (err) {
    console.warn(`⚠️  LSTM Forecasting Service not available at ${ML_SERVICE_BASE_URL}`);
    console.warn(`   Start the service with: python machine-learning/services/start_lstm_service.py`);
  }
  console.log(`💡 Find your IP: ipconfig | findstr IPv4`);
});
