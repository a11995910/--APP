/**
 * 用户控制器
 * 处理用户相关的API请求
 * 
 * @module controllers/userController
 * @author AI Assistant
 */

const { body, query } = require('express-validator');
const User = require('../models/User');
const UserPushDevice = require('../models/UserPushDevice');
const Loan = require('../models/Loan');
const Notification = require('../models/Notification');
const { generateToken } = require('../config/jwt');
const response = require('../utils/response');
const { handleValidation } = require('../middlewares/validator');
const { isValidPhone, maskPhone } = require('../utils/helpers');
const wechatService = require('../services/wechatService');

/**
 * 用户注册/登录验证规则
 */
const loginValidation = [
    body('phone').notEmpty().withMessage('手机号不能为空')
        .custom(val => isValidPhone(val)).withMessage('手机号格式不正确'),
    body('platform').optional().isIn(['miniapp', 'app']).withMessage('平台类型不正确'),
    body('wechat_code').optional().isString().withMessage('微信登录码格式不正确'),
    body('push_client_id').optional().isLength({ max: 128 }).withMessage('推送客户端ID长度不正确'),
    body('push_channel').optional().isLength({ max: 32 }).withMessage('推送通道标识长度不正确'),
    body('device_brand').optional().isLength({ max: 50 }).withMessage('设备品牌长度不正确'),
    body('device_model').optional().isLength({ max: 80 }).withMessage('设备型号长度不正确'),
    body('os_name').optional().isLength({ max: 20 }).withMessage('系统名称长度不正确'),
    body('os_version').optional().isLength({ max: 30 }).withMessage('系统版本长度不正确'),
    body('app_version').optional().isLength({ max: 20 }).withMessage('应用版本长度不正确'),
    handleValidation
];

/**
 * 微信登录验证规则
 */
const wechatLoginValidation = [
    body('code').notEmpty().withMessage('微信授权码不能为空'),
    body('phone').optional(),
    handleValidation
];

/**
 * 小程序静默登录验证规则
 */
const miniappSilentLoginValidation = [
    body('code').notEmpty().withMessage('code不能为空'),
    handleValidation
];

/**
 * APP 推送设备同步验证规则。
 */
const syncPushDeviceValidation = [
    body('push_client_id').notEmpty().withMessage('推送客户端ID不能为空')
        .isLength({ max: 128 }).withMessage('推送客户端ID长度不正确'),
    body('push_channel').optional().isLength({ max: 32 }).withMessage('推送通道标识长度不正确'),
    body('device_brand').optional().isLength({ max: 50 }).withMessage('设备品牌长度不正确'),
    body('device_model').optional().isLength({ max: 80 }).withMessage('设备型号长度不正确'),
    body('os_name').optional().isLength({ max: 20 }).withMessage('系统名称长度不正确'),
    body('os_version').optional().isLength({ max: 30 }).withMessage('系统版本长度不正确'),
    body('app_version').optional().isLength({ max: 20 }).withMessage('应用版本长度不正确'),
    handleValidation
];

/**
 * 构建统一登录成功响应数据。
 * @param {Object} user 用户对象。
 * @param {Object} extra 附加登录信息。
 * @returns {{token:string, user:Object}} 登录响应数据。
 */
function buildLoginSuccessPayload(user, extra = {}) {
    const token = generateToken({
        id: user.id,
        phone: user.phone,
        platform: user.platform
    });

    return {
        token,
        user: {
            id: user.id,
            phone: maskPhone(user.phone),
            nickname: user.nickname,
            avatar: user.avatar,
            platform: user.platform,
            notify_type: user.notify_type,
            push_client_bound: Boolean(extra.push_client_bound),
            push_channel: extra.push_channel || ''
        }
    };
}

/**
 * 对可选字符串字段做裁剪与空值清洗。
 *
 * @param {any} value - 原始值
 * @param {number} maxLength - 最大长度
 * @returns {string|null} 清洗后的值
 */
function sanitizeOptionalText(value, maxLength) {
    if (value === undefined || value === null) return null;

    const normalized = String(value).trim();
    if (!normalized) return null;
    return normalized.slice(0, maxLength);
}

/**
 * 提取 APP 推送设备载荷。
 *
 * @param {Object} payload - 请求体
 * @returns {Object|null} 推送设备数据
 */
function extractAppPushDevicePayload(payload = {}) {
    const pushClientId = sanitizeOptionalText(payload.push_client_id, 128);
    if (!pushClientId) {
        return null;
    }

    return {
        push_client_id: pushClientId,
        push_channel: sanitizeOptionalText(payload.push_channel, 32) || 'unipush',
        device_brand: sanitizeOptionalText(payload.device_brand, 50),
        device_model: sanitizeOptionalText(payload.device_model, 80),
        os_name: sanitizeOptionalText(payload.os_name, 20),
        os_version: sanitizeOptionalText(payload.os_version, 30),
        app_version: sanitizeOptionalText(payload.app_version, 20)
    };
}

/**
 * 构建用户当前推送绑定摘要。
 *
 * @param {number} userId - 用户ID
 * @returns {Promise<{push_client_bound:boolean,push_channel:string}>} 推送绑定摘要
 */
async function getPushBindingSummary(userId) {
    const activePushDevice = await UserPushDevice.findActiveByUserId(userId);
    return {
        push_client_bound: Boolean(activePushDevice?.push_client_id),
        push_channel: activePushDevice?.push_channel || ''
    };
}

/**
 * 在 APP 登录或前台恢复时同步推送设备。
 *
 * @param {number} userId - 用户ID
 * @param {Object} payload - 请求体
 * @returns {Promise<{push_client_bound:boolean,push_channel:string}>} 推送绑定摘要
 */
async function bindAppPushDeviceIfNeeded(userId, payload = {}) {
    const devicePayload = extractAppPushDevicePayload(payload);
    if (!devicePayload) {
        return getPushBindingSummary(userId);
    }

    await UserPushDevice.upsertActiveDevice({
        user_id: userId,
        ...devicePayload
    });

    return getPushBindingSummary(userId);
}

/**
 * 用户登录/注册
 * 使用手机号进行登录，如果用户不存在则自动注册
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function login(req, res, next) {
    try {
        const { phone, platform = 'miniapp', nickname, avatar, wechat_code } = req.body;
        const resolvedNotifyType = platform === 'app' ? 'push' : 'sms';
        let wechatIdentity = null;

        // 小程序手机号登录必须携带 wechat_code，确保本次登录可绑定 openid。
        if (platform === 'miniapp') {
            if (!wechat_code) {
                return res.status(400).json(response.error('小程序登录缺少微信登录凭证，请重试', 400));
            }

            if (!wechatService.isConfigured()) {
                return res.status(500).json(response.error('服务端未配置微信小程序参数，无法完成登录绑定', 500));
            }

            try {
                wechatIdentity = await wechatService.getOpenidByCode(wechat_code);
            } catch (error) {
                return res.status(400).json(response.error(`微信登录凭证无效，请重试：${error.message}`, 400));
            }
        }

        // 同一个 openid 只能绑定一个手机号，避免账号串绑。
        if (wechatIdentity?.openid) {
            const existedByOpenid = await User.findByWechatOpenid(wechatIdentity.openid);
            if (existedByOpenid && existedByOpenid.phone !== phone) {
                return res.status(409).json(response.error('该微信已绑定其他手机号，请使用原手机号登录', 409));
            }
        }

        // 查找用户
        let user = await User.findByPhone(phone);

        if (!user) {
            // 自动注册
            user = await User.create({
                phone,
                platform,
                nickname: nickname || `用户${phone.slice(-4)}`,
                avatar,
                notify_type: resolvedNotifyType,
                wechat_openid: wechatIdentity?.openid,
                wechat_unionid: wechatIdentity?.unionid
            });
            user = await User.findById(user.id);
        } else {
            // 已存在用户时，按最新登录渠道同步平台与通知类型。
            await User.update(user.id, {
                platform,
                notify_type: resolvedNotifyType,
                wechat_openid: wechatIdentity?.openid,
                wechat_unionid: wechatIdentity?.unionid
            });
            user = await User.findById(user.id);
        }

        // 检查用户状态
        if (user.status === 0) {
            return res.status(403).json(response.error('账号已被禁用', 403));
        }

        const pushBindingSummary = platform === 'app'
            ? await bindAppPushDeviceIfNeeded(user.id, req.body)
            : await getPushBindingSummary(user.id);

        res.json(response.success(buildLoginSuccessPayload(user, pushBindingSummary), '登录成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 小程序静默登录
 * 使用 wx.login 的 code 换取 openid，并尝试匹配已绑定手机号用户。
 * @param {Object} req 请求对象。
 * @param {Object} res 响应对象。
 * @param {Function} next next函数。
 */
async function miniappSilentLogin(req, res, next) {
    try {
        const { code } = req.body;

        // 未配置微信参数时返回未绑定状态，不抛业务错误，前端可平滑走手机号登录。
        if (!wechatService.isConfigured()) {
            return res.json(response.success({
                bound: false,
                reason: 'wechat_config_missing'
            }, '未配置微信静默登录'));
        }

        const wechatIdentity = await wechatService.getOpenidByCode(code);
        const user = await User.findByWechatOpenid(wechatIdentity.openid);

        if (!user) {
            return res.json(response.success({
                bound: false
            }, '当前微信未绑定手机号'));
        }

        if (user.status === 0) {
            return res.status(403).json(response.error('账号已被禁用', 403));
        }

        // 静默登录成功后，平台与通知渠道按小程序规则回写，保证后续提醒渠道一致。
        await User.update(user.id, {
            platform: 'miniapp',
            notify_type: 'sms',
            wechat_openid: wechatIdentity.openid,
            wechat_unionid: wechatIdentity.unionid
        });
        const latestUser = await User.findById(user.id);
        const pushBindingSummary = await getPushBindingSummary(user.id);

        res.json(response.success({
            bound: true,
            ...buildLoginSuccessPayload(latestUser, pushBindingSummary)
        }, '静默登录成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取当前用户信息
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getProfile(req, res, next) {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        const pushBindingSummary = await getPushBindingSummary(userId);

        if (!user) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        // 获取用户贷款统计
        const loans = await Loan.findByUserId(userId, { status: 1 });
        const monthlyAmount = await Loan.getMonthlyRepaymentAmount(userId);
        const nextRepayment = await Loan.getNextRepayment(userId);

        res.json(response.success({
            id: user.id,
            phone: maskPhone(user.phone),
            nickname: user.nickname,
            avatar: user.avatar,
            platform: user.platform,
            notify_type: user.notify_type,
            push_client_bound: pushBindingSummary.push_client_bound,
            push_channel: pushBindingSummary.push_channel,
            stats: {
                loanCount: loans.length,
                monthlyAmount,
                nextRepayment: nextRepayment ? {
                    loanName: nextRepayment.loan_name,
                    amount: nextRepayment.monthly_payment,
                    daysRemaining: nextRepayment.days_remaining
                } : null
            }
        }));
    } catch (error) {
        next(error);
    }
}

/**
 * 同步 APP 推送设备。
 * 用途：APP 已登录后在启动/回前台时补传当前设备推送标识。
 *
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - next函数
 * @returns {Promise<void>} 响应结果
 */
async function syncPushDevice(req, res, next) {
    try {
        const userId = req.user.id;
        const devicePayload = extractAppPushDevicePayload(req.body);

        if (!devicePayload) {
            return res.status(400).json(response.error('缺少有效的推送客户端ID', 400));
        }

        await User.update(userId, {
            platform: 'app',
            notify_type: 'push'
        });

        const device = await UserPushDevice.upsertActiveDevice({
            user_id: userId,
            ...devicePayload
        });

        res.json(response.success({
            push_client_bound: true,
            push_channel: device?.push_channel || devicePayload.push_channel,
            device: device || null
        }, 'APP 推送设备已同步'));
    } catch (error) {
        next(error);
    }
}

/**
 * 更新用户信息
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateProfile(req, res, next) {
    try {
        const userId = req.user.id;
        const { nickname, avatar } = req.body;

        const updated = await User.update(userId, {
            nickname,
            avatar
        });

        if (!updated) {
            return res.status(400).json(response.error('更新失败'));
        }

        const user = await User.findById(userId);
        res.json(response.success({
            id: user.id,
            phone: maskPhone(user.phone),
            nickname: user.nickname,
            avatar: user.avatar,
            notify_type: user.notify_type
        }, '更新成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取首页数据
 * 包括本月待还总额和最近还款信息
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getHomeData(req, res, next) {
    try {
        const userId = req.user.id;

        // 获取本月待还总额
        const monthlyAmount = await Loan.getMonthlyRepaymentAmount(userId);

        // 获取最近待还贷款
        const nextRepayment = await Loan.getNextRepayment(userId);

        // 获取活跃贷款数量
        const loans = await Loan.findByUserId(userId, { status: 1 });

        res.json(response.success({
            monthlyAmount,
            loanCount: loans.length,
            nextRepayment: nextRepayment ? {
                id: nextRepayment.id,
                loanName: nextRepayment.loan_name,
                amount: nextRepayment.monthly_payment,
                paymentDay: nextRepayment.payment_day,
                daysRemaining: nextRepayment.days_remaining
            } : null,
            hasLoan: loans.length > 0
        }));
    } catch (error) {
        next(error);
    }
}

// ==================== 后台管理接口 ====================

/**
 * 获取用户列表（后台）
 */
async function getUserList(req, res, next) {
    try {
        const { page = 1, pageSize = 10, phone, platform, status, keyword } = req.query;

        const result = await User.getList({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            phone,
            platform,
            status: (status !== undefined && status !== '') ? parseInt(status) : undefined,
            keyword
        });

        res.json(response.paginate(result.list, result.total, page, pageSize));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取用户详情（后台）
 */
async function getUserDetail(req, res, next) {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        // 获取用户贷款
        const loans = await Loan.findByUserId(id);

        // 获取通知统计
        const notifyStats = await Notification.getUserStats(id);

        res.json(response.success({
            ...user,
            phone: user.phone, // 后台显示完整手机号
            loans,
            notifyStats
        }));
    } catch (error) {
        next(error);
    }
}

/**
 * 更新用户状态（后台）
 */
async function updateUserStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updated = await User.update(id, { status });

        if (!updated) {
            return res.status(400).json(response.error('更新失败'));
        }

        res.json(response.success(null, status === 1 ? '用户已启用' : '用户已禁用'));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取用户统计（后台）
 */
async function getUserStats(req, res, next) {
    try {
        const stats = await User.getStats();
        res.json(response.success(stats));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    login,
    loginValidation,
    wechatLoginValidation,
    miniappSilentLoginValidation,
    syncPushDeviceValidation,
    miniappSilentLogin,
    syncPushDevice,
    getProfile,
    updateProfile,
    getHomeData,
    getUserList,
    getUserDetail,
    updateUserStatus,
    getUserStats
};
