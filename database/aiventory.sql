-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 08, 2025 at 07:00 PM
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
  `admin_name` varchar(255) NOT NULL,
  `admin_username` varchar(255) NOT NULL,
  `admin_password` varchar(255) NOT NULL,
  `admin_email` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`admin_id`, `admin_name`, `admin_username`, `admin_password`, `admin_email`, `created_at`, `last_login`) VALUES
(1, 'Red John', 'redjohn@gmail.com', '$2b$10$KexQiu6ZkgJwNfeanQKKyepqVpokIRbTxE//cKXXKu3A5KWvnrloa', 'redjohn@gmail.com', '2025-11-08 17:49:00', '2025-11-08 17:49:00');

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `inventory_id` int(11) NOT NULL,
  `stock_quantity` int(11) NOT NULL,
  `threshold` int(11) NOT NULL,
  `status` enum('normal','low stock','out of stock','') NOT NULL,
  `product_id` int(11) NOT NULL,
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `invoice_id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `customer_email` varchar(150) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_address` text DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('Pending','Paid','Overdue') DEFAULT 'Pending',
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`invoice_id`, `invoice_number`, `customer_name`, `customer_email`, `customer_phone`, `customer_address`, `invoice_date`, `due_date`, `status`, `subtotal`, `tax`, `total`, `notes`, `created_at`) VALUES
(4, 'INV-20251107-5829', 'Walter White', 'walterw@gmail.com', '09378718781', 'Mexico', '2025-11-07', '2025-11-08', 'Paid', 600.00, 30.00, 630.00, '', '2025-11-07 06:31:08'),
(5, 'INV-20251107-5254', 'Tony Stark', 'tonys@gmail.com', '09238781234', 'new york', '2025-11-07', '2025-11-08', 'Paid', 1800.00, 90.00, 1890.00, '', '2025-11-07 07:14:09'),
(6, 'INV-20251107-4086', 'Jeff Benz', 'jeffb@gmail.com', '09237817633', 'California', '2025-11-07', '2025-11-07', 'Paid', 3000.00, 150.00, 3150.00, '', '2025-11-07 07:20:17'),
(7, 'INV-20251107-7543', 'Sam Esmael', 'same@gmail.com', '09232123413', 'Japan', '2025-11-07', '2025-11-07', 'Paid', 1600.00, 80.00, 1680.00, '', '2025-11-07 07:24:33'),
(8, 'INV-20251107-8098', 'Rami Malik', NULL, '09352618751', NULL, '2025-11-07', '2025-11-07', 'Paid', 2400.00, 0.00, 2400.00, 'Generated from mobile sale via Cash', '2025-11-07 07:47:51'),
(9, 'INV-20251107-2192', 'Dexter Morgan', NULL, '09345482648', NULL, '2025-11-07', '2025-11-07', 'Paid', 1200.00, 0.00, 1200.00, 'Generated from mobile sale via Card', '2025-11-07 08:01:35'),
(10, 'INV-20251107-9738', 'Minato Kun', 'minatok@gmail.com', '09482878736', 'Hidden Leaf', '2025-11-07', '2025-11-07', 'Paid', 1800.00, 90.00, 1890.00, '', '2025-11-07 08:12:31'),
(11, 'INV-20251107-2835', 'Naruto Kun', NULL, '09684546499', NULL, '2025-11-07', '2025-11-07', 'Paid', 320.00, 0.00, 320.00, 'Generated from mobile sale via Cash', '2025-11-07 08:15:16'),
(12, 'INV-20251107-2102', 'Kakashi Kun', NULL, '09354618164', NULL, '2025-11-07', '2025-11-07', 'Paid', 600.00, 0.00, 600.00, 'Generated from mobile sale via Cash', '2025-11-07 13:36:04'),
(13, 'INV-20251109-2819', 'Bruce Wayne', NULL, '09484646499', NULL, '2025-11-08', '2025-11-08', 'Paid', 10250.00, 0.00, 10250.00, 'Generated from mobile sale via Cash', '2025-11-08 16:04:45'),
(14, 'INV-20251109-4909', 'Patrick Jane', NULL, '09684948945', NULL, '2025-11-08', '2025-11-08', 'Paid', 750.00, 0.00, 750.00, 'Generated from mobile sale via Cash', '2025-11-08 17:56:27');

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `item_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `product_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoice_items`
--

INSERT INTO `invoice_items` (`item_id`, `invoice_id`, `description`, `quantity`, `unit_price`, `product_id`) VALUES
(7, 4, 'Brake Pads (BRK-PAD-004)', 1, 600.00, NULL),
(8, 5, 'Brake Pads (BRK-PAD-004)', 3, 600.00, NULL),
(9, 6, 'Brake Pads (BRK-PAD-004)', 5, 600.00, NULL),
(10, 7, 'Engine Oil (OIL-10W40-002)', 5, 320.00, NULL),
(11, 8, 'Brake Pads (BRK-PAD-004)', 4, 600.00, NULL),
(12, 9, 'Brake Pads (BRK-PAD-004)', 2, 600.00, NULL),
(13, 10, 'Brake Pads (BRK-PAD-004)', 3, 600.00, 8),
(14, 11, 'Engine Oil (OIL-10W40-002)', 1, 320.00, 9),
(15, 12, 'Brake Pads (BRK-PAD-004)', 1, 600.00, 8),
(16, 13, 'Spark Plug (NGK) (Spark Plug (NGK))', 41, 250.00, 10),
(17, 14, 'Spark Plug (NGK) (Spark Plug (NGK))', 3, 250.00, 10);

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
(1, 'Item Added', 'Engine Oil was added by Admin', 'Engine Oil', 'New item added to inventory', 'Admin', 1, '2025-11-07 07:22:49'),
(2, 'Item Added', 'Spark Plug (NGK) was added by Admin', 'Spark Plug (NGK)', 'New item added to inventory', 'Admin', 1, '2025-11-08 15:58:57');

-- --------------------------------------------------------

--
-- Table structure for table `orders_from_supplier`
--

CREATE TABLE `orders_from_supplier` (
  `order_id` int(11) NOT NULL,
  `order_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `order_status` enum('pending','completed','cancelled','') NOT NULL,
  `total_amount` decimal(10,0) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `supplier_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_item`
--

CREATE TABLE `order_item` (
  `order_item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` int(11) NOT NULL,
  `received_date` date NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `Product_id` int(11) NOT NULL,
  `Product_name` varchar(255) NOT NULL,
  `Product_sku` varchar(100) NOT NULL,
  `Product_description` varchar(255) NOT NULL,
  `Product_price` decimal(10,0) NOT NULL,
  `Product_stock` int(11) DEFAULT 0,
  `Product_status` enum('Active','Inactive') DEFAULT 'Active',
  `Product_category` varchar(255) NOT NULL,
  `reorder_level` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `product`
--

INSERT INTO `product` (`Product_id`, `Product_name`, `Product_sku`, `Product_description`, `Product_price`, `Product_stock`, `Product_status`, `Product_category`, `reorder_level`, `supplier_id`, `created_at`, `updated_at`) VALUES
(8, 'Brake Pads', 'BRK-PAD-004', '', 600, 41, 'Active', 'Brakes', 25, 1, '2025-11-06 17:34:25', '2025-11-06 17:34:25'),
(9, 'Engine Oil', 'OIL-10W40-002', '', 320, 34, 'Active', 'Lubricants', 20, 1, '2025-11-07 07:22:49', '2025-11-07 07:22:49'),
(10, 'Spark Plug (NGK)', 'Spark Plug (NGK)', '', 250, 71, 'Active', 'Electrical', 15, 1, '2025-11-08 15:58:57', '2025-11-08 16:27:43');

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
  `staff_username` varchar(255) NOT NULL,
  `staff_password` varchar(255) NOT NULL,
  `staff_name` varchar(255) NOT NULL,
  `staff_email` varchar(255) NOT NULL,
  `staff_role` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier`
--

CREATE TABLE `supplier` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(255) NOT NULL,
  `supplier_contactnum` varchar(30) NOT NULL,
  `supplier_email` varchar(255) NOT NULL,
  `supplier_address` varchar(255) NOT NULL,
  `supplier_rating` decimal(10,0) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `supplier`
--

INSERT INTO `supplier` (`supplier_id`, `supplier_name`, `supplier_contactnum`, `supplier_email`, `supplier_address`, `supplier_rating`) VALUES
(1, 'Los Pollos', '09348283721', 'gusfring@gmail.com', 'Mexico', 4),
(2, 'Tyrell Wellick', '09237461781', 'tyrellw@gmail.com', 'New York City', 5);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`admin_id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`invoice_id`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `fk_invoice_items_product` (`product_id`);

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
  ADD KEY `supplier_id` (`supplier_id`);

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
  ADD PRIMARY KEY (`setting_id`),
  ADD KEY `staff_id` (`staff_id`);

--
-- Indexes for table `staff`
--
ALTER TABLE `staff`
  ADD PRIMARY KEY (`staff_id`);

--
-- Indexes for table `stock_movement`
--
ALTER TABLE `stock_movement`
  ADD PRIMARY KEY (`stock_movement_id`),
  ADD KEY `inventory_id` (`inventory_id`),
  ADD KEY `staff_id` (`staff_id`);

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
  MODIFY `admin_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `inventory_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `invoice_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
  MODIFY `Product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `setting_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `staff`
--
ALTER TABLE `staff`
  MODIFY `staff_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_movement`
--
ALTER TABLE `stock_movement`
  MODIFY `stock_movement_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `supplier`
--
ALTER TABLE `supplier`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inventory`
--
ALTER TABLE `inventory`
  ADD CONSTRAINT `inventory_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product` (`Product_id`);

--
-- Constraints for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `fk_invoice_items_product` FOREIGN KEY (`product_id`) REFERENCES `product` (`Product_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`invoice_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_item`
--
ALTER TABLE `order_item`
  ADD CONSTRAINT `order_item_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders_from_supplier` (`order_id`),
  ADD CONSTRAINT `order_item_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product` (`Product_id`);

--
-- Constraints for table `product`
--
ALTER TABLE `product`
  ADD CONSTRAINT `product_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `supplier` (`supplier_id`);

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
