/**
 * 统一响应工具类
 * 提供标准化的API响应格式
 * 
 * @module utils/response
 * @author AI Assistant
 * 
 * @example
 * const response = require('./utils/response');
 * res.json(response.success(data, '操作成功'));
 * res.json(response.error('操作失败', 400));
 */

/**
 * 成功响应
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @returns {Object} 标准响应对象
 */
function success(data = null, message = '操作成功') {
    return {
        code: 200,
        success: true,
        message,
        data,
        timestamp: Date.now()
    };
}

/**
 * 错误响应
 * @param {string} message - 错误消息
 * @param {number} code - 错误码
 * @param {any} data - 额外数据
 * @returns {Object} 标准响应对象
 */
function error(message = '操作失败', code = 400, data = null) {
    return {
        code,
        success: false,
        message,
        data,
        timestamp: Date.now()
    };
}

/**
 * 分页响应
 * @param {Array} list - 数据列表
 * @param {number} total - 总数
 * @param {number} page - 当前页
 * @param {number} pageSize - 每页条数
 * @param {string} message - 响应消息
 * @returns {Object} 标准分页响应对象
 */
function paginate(list, total, page, pageSize, message = '获取成功') {
    return {
        code: 200,
        success: true,
        message,
        data: {
            list,
            pagination: {
                total,
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                totalPages: Math.ceil(total / pageSize)
            }
        },
        timestamp: Date.now()
    };
}

/**
 * 常用错误响应
 */
const errors = {
    // 认证相关
    UNAUTHORIZED: error('未授权，请先登录', 401),
    TOKEN_EXPIRED: error('登录已过期，请重新登录', 401),
    FORBIDDEN: error('没有权限访问', 403),

    // 资源相关
    NOT_FOUND: error('资源不存在', 404),

    // 请求相关
    BAD_REQUEST: error('请求参数错误', 400),
    VALIDATION_ERROR: (msg) => error(msg || '参数验证失败', 400),

    // 服务器相关
    SERVER_ERROR: error('服务器内部错误', 500)
};

module.exports = {
    success,
    error,
    paginate,
    errors
};
