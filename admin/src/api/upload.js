/**
 * 上传相关API
 * @module api/upload
 */

import request from './request'

/**
 * 上传图片
 * @param {File} file - 图片文件
 * @returns {Promise} API响应
 */
export function uploadImage(file) {
    const formData = new FormData()
    formData.append('file', file)

    return request({
        url: '/upload/image',
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}
