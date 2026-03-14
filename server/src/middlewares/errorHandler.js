/**
 * 错误处理中间件
 * 统一处理应用中的错误
 * 
 * @module middlewares/errorHandler
 * @author AI Assistant
 */

const logger = require('../utils/logger');
const response = require('../utils/response');

/**
 * 全局错误处理中间件
 * 
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function errorHandler(err, req, res, next) {
    // 记录错误日志
    logger.error('应用错误', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        user: req.user?.id || 'anonymous'
    });

    // 判断错误类型并返回相应响应
    if (err.name === 'ValidationError') {
        return res.status(400).json(response.error(err.message, 400));
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json(response.errors.UNAUTHORIZED);
    }

    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json(response.error('数据已存在', 400));
    }

    // 生产环境不暴露详细错误信息
    const message = process.env.NODE_ENV === 'production'
        ? '服务器内部错误'
        : err.message;

    return res.status(500).json(response.error(message, 500));
}

/**
 * 404 处理中间件
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
function notFoundHandler(req, res) {
    res.status(404).json(response.error(`接口 ${req.method} ${req.url} 不存在`, 404));
}

module.exports = {
    errorHandler,
    notFoundHandler
};
