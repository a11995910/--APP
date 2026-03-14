/**
 * 数据库配置模块
 * 使用 mysql2 连接 MySQL 数据库，支持 Promise 风格调用
 * 
 * @module config/database
 * @author AI Assistant
 * @description MySQL数据库连接池配置
 * 
 * @example
 * const db = require('./config/database');
 * const [rows] = await db.query('SELECT * FROM users');
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 创建数据库连接池
 * 使用连接池可以复用连接，提高性能
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loan_reminder',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 启用多语句查询（用于初始化脚本）
    multipleStatements: true,
    // 时区设置
    timezone: '+08:00'
});

/**
 * 规范化 SQL 绑定参数，避免 mysql2 因 undefined 抛错。
 * mysql2 不接受 undefined，语义上将其视为 NULL。
 *
 * @param {Array<any>} params - 原始参数数组
 * @returns {Array<any>} 规范化后的参数数组
 */
function normalizeParams(params = []) {
    if (!Array.isArray(params)) return params;
    return params.map((item) => (item === undefined ? null : item));
}

/**
 * 测试数据库连接
 * @returns {Promise<boolean>} 连接成功返回true，否则抛出错误
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ 数据库连接成功');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        throw error;
    }
}

/**
 * 执行SQL查询
 * @param {string} sql - SQL语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Array>} 查询结果
 * 
 * @example
 * const users = await db.query('SELECT * FROM users WHERE id = ?', [1]);
 */
async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, normalizeParams(params));
    return rows;
}

/**
 * 执行事务
 * @param {Function} callback - 事务回调函数，接收connection参数
 * @returns {Promise<any>} 事务执行结果
 * 
 * @example
 * await db.transaction(async (conn) => {
 *     await conn.execute('INSERT INTO users SET ?', [userData]);
 *     await conn.execute('INSERT INTO loans SET ?', [loanData]);
 * });
 */
async function transaction(callback) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    pool,
    query,
    transaction,
    testConnection,
    normalizeParams
};
