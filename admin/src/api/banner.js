/**
 * Banner API
 */
import request from './request'

// 获取Banner列表
export function getBannerList(params) {
    return request.get('/admin/banners', { params })
}

// 获取Banner详情
export function getBannerDetail(id) {
    return request.get(`/admin/banners/${id}`)
}

// 创建Banner
export function createBanner(data) {
    return request.post('/admin/banners', data)
}

// 更新Banner
export function updateBanner(id, data) {
    return request.put(`/admin/banners/${id}`, data)
}

// 删除Banner
export function deleteBanner(id) {
    return request.delete(`/admin/banners/${id}`)
}

// 切换Banner状态
export function toggleBannerStatus(id) {
    return request.post(`/admin/banners/${id}/toggle`)
}
