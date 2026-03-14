-- ============================================
-- 金融贷款提醒应用 - 数据库初始化脚本
-- ============================================
-- 执行命令: mysql -u root -p < init.sql
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS loan_reminder 
    DEFAULT CHARACTER SET utf8mb4 
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE loan_reminder;

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    wechat_openid VARCHAR(64) UNIQUE COMMENT '微信OpenID',
    wechat_unionid VARCHAR(64) COMMENT '微信UnionID',
    phone VARCHAR(20) NOT NULL COMMENT '手机号',
    nickname VARCHAR(50) COMMENT '昵称',
    avatar VARCHAR(255) COMMENT '头像URL',
    platform ENUM('miniapp', 'app') DEFAULT 'miniapp' COMMENT '来源平台：miniapp-小程序 app-APP',
    notify_type ENUM('sms', 'push', 'both') DEFAULT 'sms' COMMENT '通知形式：sms-短信 push-推送 both-两者都有',
    status TINYINT DEFAULT 1 COMMENT '状态：0-禁用 1-正常',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_phone (phone),
    INDEX idx_wechat_openid (wechat_openid),
    INDEX idx_platform (platform),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 贷款表
-- ============================================
CREATE TABLE IF NOT EXISTS loans (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '贷款ID',
    user_id INT NOT NULL COMMENT '用户ID',
    loan_name VARCHAR(100) NOT NULL COMMENT '贷款名称',
    principal DECIMAL(12,2) NOT NULL COMMENT '贷款本金',
    monthly_payment DECIMAL(10,2) NOT NULL COMMENT '月还款额',
    payment_day INT NOT NULL COMMENT '还款日(1-31)',
    start_date DATE NOT NULL COMMENT '开始日期',
    end_date DATE NOT NULL COMMENT '结束日期',
    remind_days INT DEFAULT 3 COMMENT '提前提醒天数',
    status TINYINT DEFAULT 1 COMMENT '状态：0-已结清 1-还款中',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_payment_day (payment_day),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='贷款表';

-- ============================================
-- 贷款扩展配置表
-- ============================================
CREATE TABLE IF NOT EXISTS loan_plan_configs (
    loan_id INT PRIMARY KEY COMMENT '贷款ID',
    annual_rate DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '年利率(%)',
    term_months INT NOT NULL DEFAULT 12 COMMENT '贷款期限(月)',
    repayment_method ENUM('equal_installment', 'equal_principal', 'interest_first') NOT NULL DEFAULT 'equal_installment' COMMENT '还款方式',
    first_payment_year INT NOT NULL COMMENT '首期支付年份',
    first_payment_month INT NOT NULL COMMENT '首期支付月份',
    remind_enabled TINYINT NOT NULL DEFAULT 1 COMMENT '提醒开关：0-关闭 1-开启',
    remind_day INT NOT NULL DEFAULT 1 COMMENT '每月提醒日(1-31)',
    remind_hour INT NOT NULL DEFAULT 12 COMMENT '提醒小时(0-23)',
    remind_minute INT NOT NULL DEFAULT 0 COMMENT '提醒分钟(0-59)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    CONSTRAINT fk_loan_plan_configs_loan_id FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='贷款扩展配置表';

-- ============================================
-- 还款记录表
-- ============================================
CREATE TABLE IF NOT EXISTS repayments (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    loan_id INT NOT NULL COMMENT '贷款ID',
    due_date DATE NOT NULL COMMENT '应还日期',
    amount DECIMAL(10,2) NOT NULL COMMENT '应还金额',
    paid_amount DECIMAL(10,2) DEFAULT 0 COMMENT '实还金额',
    paid_date DATE COMMENT '实际还款日期',
    status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending' COMMENT '状态：pending-待还 paid-已还 overdue-逾期',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_loan_id (loan_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status),
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='还款记录表';

-- ============================================
-- 通知记录表
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '通知ID',
    user_id INT NOT NULL COMMENT '用户ID',
    loan_id INT NOT NULL COMMENT '贷款ID',
    notify_type ENUM('sms', 'push') NOT NULL COMMENT '通知类型：sms-短信 push-推送',
    content TEXT NOT NULL COMMENT '通知内容',
    send_time DATETIME COMMENT '发送时间',
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending' COMMENT '状态：pending-待发送 sent-已发送 failed-发送失败',
    fail_reason VARCHAR(255) COMMENT '失败原因',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_user_id (user_id),
    INDEX idx_loan_id (loan_id),
    INDEX idx_status (status),
    INDEX idx_notify_type (notify_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知记录表';

-- ============================================
-- 用户推送设备表
-- ============================================
CREATE TABLE IF NOT EXISTS user_push_devices (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '设备记录ID',
    user_id INT NOT NULL COMMENT '用户ID',
    push_client_id VARCHAR(128) NOT NULL COMMENT '推送客户端ID',
    push_channel VARCHAR(32) NOT NULL DEFAULT 'unipush' COMMENT '推送通道标识',
    device_brand VARCHAR(50) COMMENT '设备品牌',
    device_model VARCHAR(80) COMMENT '设备型号',
    os_name VARCHAR(20) COMMENT '系统名称',
    os_version VARCHAR(30) COMMENT '系统版本',
    app_version VARCHAR(20) COMMENT '应用版本',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-停用 1-启用',
    last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '最近登录时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_push_client_id (push_client_id),
    INDEX idx_user_status (user_id, status),
    CONSTRAINT fk_user_push_devices_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户推送设备表';

-- ============================================
-- Banner广告表
-- ============================================
CREATE TABLE IF NOT EXISTS banners (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Banner ID',
    title VARCHAR(100) NOT NULL COMMENT '标题',
    image_url VARCHAR(255) NOT NULL COMMENT '图片URL',
    link_url VARCHAR(255) COMMENT '跳转链接',
    sort_order INT DEFAULT 0 COMMENT '排序值，越小越靠前',
    status TINYINT DEFAULT 1 COMMENT '状态：0-下架 1-上架',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Banner广告表';

-- ============================================
-- 短信平台配置表
-- ============================================
CREATE TABLE IF NOT EXISTS sms_config (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
    platform VARCHAR(50) NOT NULL COMMENT '平台名称',
    access_key VARCHAR(100) NOT NULL COMMENT 'AccessKey',
    access_secret VARCHAR(100) NOT NULL COMMENT 'AccessSecret',
    sign_name VARCHAR(50) NOT NULL COMMENT '短信签名',
    template_code VARCHAR(50) NOT NULL COMMENT '模板Code',
    balance INT DEFAULT 0 COMMENT '剩余额度',
    status TINYINT DEFAULT 1 COMMENT '状态：0-禁用 1-启用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信平台配置表';

-- ============================================
-- 管理员表
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '管理员ID',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密）',
    name VARCHAR(50) COMMENT '姓名',
    role ENUM('admin', 'operator') DEFAULT 'operator' COMMENT '角色：admin-管理员 operator-运营',
    status TINYINT DEFAULT 1 COMMENT '状态：0-禁用 1-正常',
    last_login DATETIME COMMENT '最后登录时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_username (username),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- ============================================
-- 初始数据
-- ============================================

-- 插入默认管理员账号 (密码: admin123)
-- 密码是使用 bcrypt 加密的 'admin123'
INSERT INTO admins (username, password, name, role) VALUES 
('admin', '$2a$10$N.3Ys6eDQ8hE5E1xzLqY4.R.X7mVqU1qKL1yJ2mKf8uDzGvVwTdCe', '超级管理员', 'admin')
ON DUPLICATE KEY UPDATE username = username;

-- 插入示例Banner
INSERT INTO banners (title, image_url, link_url, sort_order) VALUES 
('金融资讯', 'https://via.placeholder.com/750x300/4F46E5/white?text=金融资讯', '', 1),
('理财小贴士', 'https://via.placeholder.com/750x300/10B981/white?text=理财小贴士', '', 2),
('还款小知识', 'https://via.placeholder.com/750x300/F59E0B/white?text=还款小知识', '', 3);

-- ============================================
-- 完成提示
-- ============================================
SELECT '数据库初始化完成！' AS message;
SELECT '默认管理员账号: admin / admin123' AS info;
