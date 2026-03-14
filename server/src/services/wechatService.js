/**
 * 微信小程序服务
 * 负责通过登录凭证 code 换取 openid / unionid。
 *
 * @module services/wechatService
 */

const axios = require('axios');
const config = require('../config');

/**
 * 微信小程序服务类
 */
class WechatService {
    /**
     * 检查微信小程序配置是否完整。
     * @returns {boolean} 配置是否可用。
     */
    isConfigured() {
        return Boolean(config.wechatMiniapp.appId && config.wechatMiniapp.appSecret);
    }

    /**
     * 使用小程序登录 code 换取 openid。
     * @param {string} code 小程序登录临时凭证。
     * @returns {Promise<{openid:string, unionid:string|null}>} 微信身份信息。
     */
    async getOpenidByCode(code) {
        if (!this.isConfigured()) {
            throw new Error('微信小程序配置缺失，请先配置 WECHAT_MINIAPP_APP_ID 和 WECHAT_MINIAPP_APP_SECRET');
        }

        const url = 'https://api.weixin.qq.com/sns/jscode2session';
        const { data } = await axios.get(url, {
            params: {
                appid: config.wechatMiniapp.appId,
                secret: config.wechatMiniapp.appSecret,
                js_code: code,
                grant_type: 'authorization_code'
            },
            timeout: 5000
        });

        if (!data || data.errcode) {
            throw new Error(data?.errmsg || '微信 code2session 失败');
        }

        if (!data.openid) {
            throw new Error('微信返回结果中缺少 openid');
        }

        return {
            openid: data.openid,
            unionid: data.unionid || null
        };
    }
}

module.exports = new WechatService();
