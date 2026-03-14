/**
 * Banner API
 */
import { get } from '../utils/request'

export function getBanners() {
    return get('/banners')
}
