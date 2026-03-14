/**
 * JWT配置模块
 * 提供JWT令牌的生成和验证功能
 * 
 * @module config/jwt
 * @author AI Assistant
 * @description JWT认证配置
 * 
 * @example
 * const jwt = require('./config/jwt');
 * const token = jwt.generateToken({ userId: 1 });
 * const decoded = jwt.verifyToken(token);
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
// Token过期时间
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成JWT令牌
 * @param {Object} payload - 令牌载荷数据
 * @param {Object} options - 可选配置
 * @returns {string} 生成的JWT令牌
 * 
 * @example
 * const token = generateToken({ userId: 1, role: 'user' });
 */
function generateToken(payload, options = {}) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: options.expiresIn || JWT_EXPIRES_IN,
        ...options
    });
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {Object} 解码后的载荷数据
 * @throws {Error} 令牌无效或过期时抛出错误
 * 
 * @example
 * try {
 *     const decoded = verifyToken(token);
 *     console.log(decoded.userId);
 * } catch (error) {
 *     console.log('Token验证失败');
 * }
 */
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

/**
 * 生成管理员令牌（较短过期时间）
 * @param {Object} payload - 令牌载荷数据
 * @returns {string} 生成的JWT令牌
 */
function generateAdminToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '24h'
    });
}

/**
 * 解码令牌（不验证签名）
 * @param {string} token - JWT令牌
 * @returns {Object|null} 解码后的载荷数据，失败返回null
 */
function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
}

module.exports = {
    generateToken,
    verifyToken,
    generateAdminToken,
    decodeToken,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
