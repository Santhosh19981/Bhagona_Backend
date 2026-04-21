-- Migration to add vendor bank accounts and update orders for Razorpay
SET FOREIGN_KEY_CHECKS=0;

-- Create vendor_bank_accounts table
CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_user_id INT NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update orders table to support Razorpay and Payouts
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255) AFTER transaction_id,
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255) AFTER razorpay_order_id,
ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(512) AFTER razorpay_payment_id,
ADD COLUMN IF NOT EXISTS admin_commission DECIMAL(12,2) DEFAULT 0.00 AFTER order_value,
ADD COLUMN IF NOT EXISTS vendor_payout_amount DECIMAL(12,2) DEFAULT 0.00 AFTER admin_commission,
ADD COLUMN IF NOT EXISTS payout_status ENUM('Pending', 'Completed', 'Rejected') DEFAULT 'Pending' AFTER payment_status;

SET FOREIGN_KEY_CHECKS=1;
