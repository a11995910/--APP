/**
 * 请求验证中间件
 * 使用 express-validator 进行参数验证
 * 
 * @module middlewares/validator
 * @author AI Assistant
 */

const { validationResult } = require('express-validator');
const response = require('../utils/response');

/**
 * 处理验证结果中间件
 * 检查验证器的结果，如有错误则返回400
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function handleValidation(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return res.status(400).json(
            response.error(errorMessages[0], 400, { errors: errors.array() })
        );
    }

    next();
}

module.exports = {
    handleValidation
};
