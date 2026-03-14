/**
 * 贷款相关API
 */
import { get, post, put, del } from '../utils/request'

/**
 * 获取贷款列表
 * @param {Object} params 查询参数
 * @returns {Promise<Object>} 接口响应
 */
export function getLoans(params) {
    return get('/loans', params)
}

/**
 * 获取贷款详情
 * @param {number|string} id 贷款ID
 * @returns {Promise<Object>} 接口响应
 */
export function getLoanDetail(id) {
    return get(`/loans/${id}`)
}

/**
 * 获取贷款还款明细
 * @param {number|string} id 贷款ID
 * @returns {Promise<Object>} 接口响应
 */
export function getLoanSchedule(id) {
    return get(`/loans/${id}/schedule`)
}

/**
 * 创建贷款
 * @param {Object} data 贷款数据
 * @returns {Promise<Object>} 接口响应
 */
export function createLoan(data) {
    return post('/loans', data)
}

/**
 * 更新贷款
 * @param {number|string} id 贷款ID
 * @param {Object} data 更新数据
 * @returns {Promise<Object>} 接口响应
 */
export function updateLoan(id, data) {
    return put(`/loans/${id}`, data)
}

/**
 * 删除贷款
 * @param {number|string} id 贷款ID
 * @returns {Promise<Object>} 接口响应
 */
export function deleteLoan(id) {
    return del(`/loans/${id}`)
}

/**
 * 标记结清
 * @param {number|string} id 贷款ID
 * @returns {Promise<Object>} 接口响应
 */
export function markComplete(id) {
    return post(`/loans/${id}/complete`)
}
