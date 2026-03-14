/**
 * JWT认证中间件
 * 验证请求中的JWT令牌
 * 
 * @module middlewares/auth
 * @author AI Assistant
 * 
 * @example
 * router.get('/profile', authMiddleware, (req, res) => {
 *     // req.user 包含解码后的用户信息
 * });
 */

const { verifyToken } = require('../config/jwt');
const response = require('../utils/response');

/**
 * 用户认证中间件
 * 从请求头中提取并验证JWT令牌
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function authMiddleware(req, res, next) {
    try {
        // 从请求头获取token
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json(response.errors.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json(response.errors.UNAUTHORIZED);
        }

        // 验证token
        const decoded = verifyToken(token);

        // 将用户信息附加到请求对象
        req.user = decoded;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(response.errors.TOKEN_EXPIRED);
        }
        return res.status(401).json(response.errors.UNAUTHORIZED);
    }
}

/**
 * 管理员认证中间件
 * 验证管理员身份
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function adminAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json(response.errors.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        // 检查是否为管理员
        if (!decoded.isAdmin) {
            return res.status(403).json(response.errors.FORBIDDEN);
        }

        req.admin = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(response.errors.TOKEN_EXPIRED);
        }
        return res.status(401).json(response.errors.UNAUTHORIZED);
    }
}

/**
 * 可选认证中间件
 * 如果有token则验证，没有也放行
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function optionalAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token) {
                req.user = verifyToken(token);
            }
        }

        next();
    } catch (error) {
        // Token无效时不阻止请求，只是不设置user
        next();
    }
}

module.exports = {
    authMiddleware,
    adminAuthMiddleware,
    optionalAuthMiddleware
};
