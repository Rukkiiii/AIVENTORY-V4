-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 06, 2025 at 11:23 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `aiventory`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `admin_id` int(11) NOT NULL,
  `admin_name` varchar(100) NOT NULL,
  `admin_username` varchar(50) NOT NULL,
  `admin_password` varchar(255) NOT NULL,
  `admin_email` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`admin_id`, `admin_name`, `admin_username`, `admin_password`, `admin_email`, `created_at`, `last_login`) VALUES
(1, 'Administrator', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@aiventory.com', '2025-11-05 05:50:32', '2025-11-05 05:50:32'),
(2, 'Maelyn Obejero', 'admin.maelyn@gmail.com', '$2b$10$95kPKi395S/E4WoYdtmkzOv7EShJ1bz/KJqBTNDSyE/QdfcQ4j8vC', 'admin.maelyn@gmail.com', '2025-11-05 10:17:35', '2025-11-06 10:14:33'),
(3, 'Darren Light Blanca', 'admin.darren@gmail.com', '$2b$10$qzruh9ylMyoyD9d8tI9xneCTw2tcHO6RGXwaKpyhDk3CH5D3Ndk3m', 'admin.darren@gmail.com', '2025-11-05 16:16:23', '2025-11-05 16:16:38');

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `inventory_id` int(11) NOT NULL,
  `stock_quantity` int(11) NOT NULL,
  `status` enum('normal','low stock','out of stock','') NOT NULL,
  `product_id` int(11) NOT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` varchar(500) NOT NULL,
  `item_name` varchar(255) DEFAULT NULL,
  `action` varchar(255) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `title`, `message`, `item_name`, `action`, `user_name`, `user_id`, `created_at`) VALUES
(1, 'Item Added', 'HONDA CLICK 150i V2 GAME CHANGER | MUFFLER COMP., EXHAUST was added by Admin', 'HONDA CLICK 150i V2 GAME CHANGER | MUFFLER COMP., EXHAUST', 'New item added to inventory', 'Admin', 1, '2025-11-05 08:53:47'),
(2, 'Item Added', 'COLLAR FRONT WHEEL SIDE was added by Admin', 'COLLAR FRONT WHEEL SIDE', 'New item added to inventory', 'Admin', 1, '2025-11-05 10:19:30'),
(3, 'Item Added', 'COLLAR FRONT WHEEL SIDE was added by Admin', 'COLLAR FRONT WHEEL SIDE', 'New item added to inventory', 'Admin', 1, '2025-11-05 10:19:30'),
(4, 'Item Added', 'COLLAR FRONT WHEEL SIDE was added by Admin', 'COLLAR FRONT WHEEL SIDE', 'New item added to inventory', 'Admin', 1, '2025-11-05 10:19:30'),
(5, 'Item Added', 'STEP FLOOR was added by Admin', 'STEP FLOOR', 'New item added to inventory', 'Admin', 1, '2025-11-05 10:31:54'),
(6, 'Item Added', 'STEP FLOOR was added by Admin', 'STEP FLOOR', 'New item added to inventory', 'Admin', 1, '2025-11-05 10:31:54'),
(7, 'Item Added', 'STEP FLOOR was added by Admin', 'STEP FLOOR', 'New item added to inventory', 'Admin', 1, '2025-11-05 10:31:55'),
(8, 'Item Added', 'FRONTN AXLE WHEEL was added by Admin', 'FRONTN AXLE WHEEL', 'New item added to inventory', 'Admin', 1, '2025-11-05 12:32:35'),
(9, 'Low Stock Alert', 'FRONTN AXLE WHEEL is running low (4 units left). Threshold: 5', 'FRONTN AXLE WHEEL', 'low_stock_alert', 'Admin', 1, '2025-11-05 12:38:57'),
(10, 'Item Added', 'CLAMO D13 TUBE was added by Admin', 'CLAMO D13 TUBE', 'New item added to inventory', 'Admin', 1, '2025-11-05 14:44:19'),
(11, 'Item Added', 'CLAMO D13 TUBE was added by Admin', 'CLAMO D13 TUBE', 'New item added to inventory', 'Admin', 1, '2025-11-05 14:44:19'),
(12, 'Item Added', 'CLAMO D13 TUBE was added by Admin', 'CLAMO D13 TUBE', 'New item added to inventory', 'Admin', 1, '2025-11-05 14:44:19'),
(13, 'Item Added', 'CLAMO D13 TUBE was added by Admin', 'CLAMO D13 TUBE', 'New item added to inventory', 'Admin', 1, '2025-11-05 14:44:19'),
(14, 'Item Added', 'LATCH was added by Admin', 'LATCH', 'New item added to inventory', 'Admin', 1, '2025-11-05 16:18:01');

-- --------------------------------------------------------

--
-- Table structure for table `orders_from_supplier`
--

CREATE TABLE `orders_from_supplier` (
  `order_id` int(11) NOT NULL,
  `order_no` varchar(50) DEFAULT NULL,
  `order_date` date NOT NULL,
  `order_status` enum('Pending','Approved','Delivered','Completed','Cancelled') DEFAULT 'Approved',
  `total_amount` decimal(10,2) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_item`
--

CREATE TABLE `order_item` (
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `Product_id` int(11) NOT NULL,
  `Product_name` varchar(100) NOT NULL,
  `Product_description` text DEFAULT NULL,
  `Product_sku` varchar(50) DEFAULT NULL,
  `Product_price` decimal(10,2) DEFAULT NULL,
  `Product_stock` int(11) DEFAULT 0,
  `Product_category` varchar(50) DEFAULT NULL,
  `reorder_level` int(11) DEFAULT 10,
  `supplier_id` int(11) DEFAULT NULL,
  `Product_status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`Product_id`, `Product_name`, `Product_description`, `Product_sku`, `Product_price`, `Product_stock`, `Product_category`, `reorder_level`, `supplier_id`, `Product_status`, `created_at`, `updated_at`) VALUES
(2, 'Office Chair', NULL, 'CHAIR001', 199.99, 99, 'Furniture', 3, 2, 'Active', '2025-11-05 05:50:32', '2025-11-05 10:46:40'),
(3, 'Wireless Mouse', NULL, 'MOUSE001', 29.99, 49, 'Electronics', 10, 3, 'Active', '2025-11-05 05:50:32', '2025-11-05 13:29:14'),
(4, 'Desk Lamp', NULL, 'LAMP001', 49.99, 20, 'Furniture', 5, 2, 'Active', '2025-11-05 05:50:32', '2025-11-05 05:50:32'),
(7, 'HONDA CLICK 150i V2 GAME CHANGER | MUFFLER COMP., EXHAUST', NULL, ' 18300-K59-A70', 1.00, 2, 'Scanned Item', 5, 1, 'Active', '2025-11-05 08:53:46', '2025-11-06 03:31:41'),
(14, 'FRONTN AXLE WHEEL', NULL, '28100000', 138.00, 3, 'Scanned Item', 5, 1, 'Active', '2025-11-05 12:32:35', '2025-11-06 03:32:15'),
(15, 'CLAMO D13 TUBE', NULL, '95002-41300779', 49.00, 11, 'Scanned Item', 5, 1, 'Active', '2025-11-05 14:44:18', '2025-11-06 03:31:06'),
(19, 'LATCH', NULL, '81137-K2C-V01', 79.00, 91, 'Scanned Item', 5, 1, 'Active', '2025-11-05 16:18:01', '2025-11-06 03:24:52'),
(20, 'PCX 150 | SPRING, DRIVEN FACE (800RPM)', NULL, '2FDFF7K35-500', 79.00, 49, 'Scanned Item', 5, 1, 'Active', '2025-11-06 03:14:50', '2025-11-06 05:28:16');

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `setting_id` int(11) NOT NULL,
  `notification_threshold` int(11) NOT NULL,
  `reorder_rule` text NOT NULL,
  `staff_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `staff`
--

CREATE TABLE `staff` (
  `staff_id` int(11) NOT NULL,
  `staff_name` varchar(100) NOT NULL,
  `staff_username` varchar(50) NOT NULL,
  `staff_password` varchar(255) NOT NULL,
  `staff_email` varchar(100) NOT NULL,
  `staff_role` varchar(20) DEFAULT 'Staff',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `staff`
--

INSERT INTO `staff` (`staff_id`, `staff_name`, `staff_username`, `staff_password`, `staff_email`, `staff_role`, `created_at`, `last_login`) VALUES
(1, 'Staff User', 'staff', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff@aiventory.com', 'Staff', '2025-11-05 05:50:32', '2025-11-05 05:50:32'),
(2, 'Philip Jomer Bortoleto', 'staff.pj@gmail.com', '$2b$10$AJw4cnJWbNwpJo0gsK5LNeERf7xtCv5hRQtn1xgeLQGEQ8zPMzpv.', 'staff.pj@gmail.com', 'Staff', '2025-11-05 06:33:04', '2025-11-05 13:31:00'),
(3, 'Angel Llanuta', 'staff.angel@gmail.com', '$2b$10$uuY24PTFgABOV21KfkgPc.NW8BXgZ.ZUVI4JXTvdGaRzeuEtDu8DG', 'staff.angel@gmail.com', 'Staff', '2025-11-06 03:12:33', '2025-11-06 03:24:21');

-- --------------------------------------------------------

--
-- Table structure for table `stock_movement`
--

CREATE TABLE `stock_movement` (
  `stock_movement_id` int(11) NOT NULL,
  `stock_movement_type` enum('in','out') NOT NULL,
  `stock_movement_quantity` int(11) NOT NULL,
  `sm_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `inventory_id` int(11) NOT NULL,
  `staff_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stock_movement`
--

INSERT INTO `stock_movement` (`stock_movement_id`, `stock_movement_type`, `stock_movement_quantity`, `sm_date`, `inventory_id`, `staff_id`) VALUES
(0, 'in', 1, '2025-11-05 08:53:47', 7, 1),
(0, 'in', 1, '2025-11-05 10:19:30', 8, 1),
(0, 'in', 1, '2025-11-05 10:19:30', 9, 1),
(0, 'in', 1, '2025-11-05 10:19:30', 10, 1),
(0, 'in', 100, '2025-11-05 10:19:45', 10, 1),
(0, 'in', 1, '2025-11-05 10:31:54', 11, 1),
(0, 'in', 1, '2025-11-05 10:31:54', 12, 1),
(0, 'in', 1, '2025-11-05 10:31:55', 13, 1),
(0, 'in', 100, '2025-11-05 10:34:09', 12, 1),
(0, 'in', 100, '2025-11-05 10:34:17', 12, 1),
(0, 'in', 100, '2025-11-05 10:34:19', 12, 1),
(0, 'in', 100, '2025-11-05 10:34:19', 12, 1),
(0, 'in', 100, '2025-11-05 10:34:20', 12, 1),
(0, 'in', 100, '2025-11-05 10:40:07', 9, 1),
(0, 'in', 100, '2025-11-05 10:40:09', 9, 1),
(0, 'in', 12, '2025-11-05 10:46:29', 2, 1),
(0, 'in', 12, '2025-11-05 10:46:29', 2, 1),
(0, 'in', 12, '2025-11-05 10:46:30', 2, 1),
(0, 'in', 12, '2025-11-05 10:46:30', 2, 1),
(0, 'in', 12, '2025-11-05 10:46:31', 2, 1),
(0, 'in', 12, '2025-11-05 10:46:38', 2, 1),
(0, 'in', 12, '2025-11-05 10:46:40', 2, 1),
(0, 'in', 20, '2025-11-05 10:47:10', 13, 1),
(0, 'in', 1, '2025-11-05 12:32:35', 14, 1),
(0, 'in', 10, '2025-11-05 12:32:52', 14, 1),
(0, 'out', 7, '2025-11-05 12:38:57', 14, 1),
(0, 'out', 1, '2025-11-05 13:29:14', 3, 1),
(0, 'in', 10, '2025-11-05 13:29:53', 6, 1),
(0, 'out', 7, '2025-11-05 13:30:11', 6, 1),
(0, 'in', 10, '2025-11-05 14:10:43', 7, 1),
(0, 'out', 1, '2025-11-05 14:10:59', 7, 1),
(0, 'in', 1, '2025-11-05 14:44:18', 15, 1),
(0, 'in', 1, '2025-11-05 14:44:19', 16, 1),
(0, 'in', 1, '2025-11-05 14:44:19', 17, 1),
(0, 'in', 1, '2025-11-05 14:44:19', 18, 1),
(0, 'in', 1, '2025-11-05 16:18:01', 19, 1),
(0, 'in', 60, '2025-11-05 16:18:28', 19, 1),
(0, 'in', 100, '2025-11-05 16:23:35', 19, 1),
(0, 'in', 1000, '2025-11-05 16:24:33', 19, 1),
(0, 'in', 60, '2025-11-05 16:24:43', 19, 1),
(0, 'out', 160, '2025-11-05 16:25:49', 19, 1),
(0, 'out', 160, '2025-11-05 16:25:49', 19, 1),
(0, 'out', 160, '2025-11-05 16:25:49', 19, 1),
(0, 'out', 160, '2025-11-05 16:25:49', 19, 1),
(0, 'out', 160, '2025-11-05 16:25:49', 19, 1),
(0, 'out', 160, '2025-11-05 16:25:49', 19, 1),
(0, 'out', 160, '2025-11-05 16:25:49', 19, 1),
(0, 'out', 1, '2025-11-06 03:15:05', 20, 1),
(0, 'out', 10, '2025-11-06 03:18:43', 19, 1),
(0, 'in', 20, '2025-11-06 03:24:42', 19, 1),
(0, 'out', 20, '2025-11-06 03:24:52', 19, 1),
(0, 'in', 50, '2025-11-06 03:30:22', 20, 1),
(0, 'in', 10, '2025-11-06 03:31:06', 15, 1),
(0, 'out', 8, '2025-11-06 03:31:41', 7, 1),
(0, 'out', 1, '2025-11-06 03:32:15', 14, 1),
(0, 'out', 1, '2025-11-06 05:28:16', 20, 1);

-- --------------------------------------------------------

--
-- Table structure for table `supplier`
--

CREATE TABLE `supplier` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(100) NOT NULL,
  `supplier_contactnum` varchar(20) DEFAULT NULL,
  `supplier_email` varchar(100) DEFAULT NULL,
  `supplier_address` text DEFAULT NULL,
  `supplier_rating` decimal(3,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `supplier`
--

INSERT INTO `supplier` (`supplier_id`, `supplier_name`, `supplier_contactnum`, `supplier_email`, `supplier_address`, `supplier_rating`, `created_at`, `updated_at`) VALUES
(1, 'TechSupply Co.', '+1234567890', 'contact@techsupply.com', '123 Tech Street, Silicon Valley', 4.50, '2025-11-05 05:50:32', '2025-11-05 05:50:32'),
(2, 'Office Essentials', '+0987654321', 'sales@officeessentials.com', '456 Business Ave, Downtown', 4.20, '2025-11-05 05:50:32', '2025-11-05 05:50:32'),
(3, 'Global Electronics', '+1122334455', 'info@globalelectronics.com', '789 Electronics Blvd, Tech City', 4.80, '2025-11-05 05:50:32', '2025-11-05 05:50:32'),
(4, 'BLACKDIAMOND', '+639123456789', 'blackdiamond@gmail.com', 'Barra Macabalan Cagayan de Oro City\nBarra Proper Macabalan Cagayan de Oro City', 5.00, '2025-11-05 10:37:43', '2025-11-05 10:37:43');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`admin_id`),
  ADD UNIQUE KEY `admin_username` (`admin_username`),
  ADD UNIQUE KEY `admin_email` (`admin_email`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD KEY `inventory_ibfk_1` (`product_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders_from_supplier`
--
ALTER TABLE `orders_from_supplier`
  ADD PRIMARY KEY (`order_id`),
  ADD UNIQUE KEY `order_no` (`order_no`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `idx_order_no` (`order_no`);

--
-- Indexes for table `order_item`
--
ALTER TABLE `order_item`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`Product_id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD KEY `settings_ibfk_1` (`staff_id`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`staff_id`),
  ADD UNIQUE KEY `staff_username` (`staff_username`),
  ADD UNIQUE KEY `staff_email` (`staff_email`);

--
-- Indexes for table `stock_movement`
--
ALTER TABLE `stock_movement`
  ADD KEY `stock_movement_ibfk_1` (`staff_id`);

--
-- Indexes for table `supplier`
--
ALTER TABLE `supplier`
  ADD PRIMARY KEY (`supplier_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `orders_from_supplier`
--
ALTER TABLE `orders_from_supplier`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_item`
--
ALTER TABLE `order_item`
  MODIFY `order_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `Product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `staff_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `supplier`
--
ALTER TABLE `supplier`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`Product_id`);

--
-- Constraints for table `orders_from_supplier`
--
ALTER TABLE `orders_from_supplier`
  ADD CONSTRAINT `orders_from_supplier_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_item`
--
ALTER TABLE `order_item`
  ADD CONSTRAINT `order_item_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders_from_supplier` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_item_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product` (`Product_id`) ON DELETE CASCADE;

--
-- Constraints for table `product`
--
ALTER TABLE `product`
  ADD CONSTRAINT `product_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`) ON DELETE SET NULL;

--
-- Constraints for table `settings`
--
ALTER TABLE `settings`
  ADD CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`);

--
-- Constraints for table `stock_movement`
--
ALTER TABLE `stock_movement`
  ADD CONSTRAINT `stock_movement_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`staff_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
