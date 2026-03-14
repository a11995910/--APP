/**
 * Banner控制器
 * 处理Banner广告相关的API请求
 * 
 * @module controllers/bannerController
 * @author AI Assistant
 */

const { body, param } = require('express-validator');
const Banner = require('../models/Banner');
const response = require('../utils/response');
const { handleValidation } = require('../middlewares/validator');

/**
 * 创建Banner验证规则
 */
const createValidation = [
    body('title').notEmpty().withMessage('标题不能为空')
        .isLength({ max: 100 }).withMessage('标题最多100个字符'),
    body('image_url').notEmpty().withMessage('图片URL不能为空'),
    body('link_url').optional(),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('排序值必须大于等于0'),
    handleValidation
];

/**
 * 更新Banner验证规则
 */
const updateValidation = [
    param('id').isInt().withMessage('Banner ID不正确'),
    body('title').optional().isLength({ max: 100 }).withMessage('标题最多100个字符'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('排序值必须大于等于0'),
    handleValidation
];

/**
 * 获取Banner列表（前端用）
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getActiveBanners(req, res, next) {
    try {
        const banners = await Banner.getActiveBanners();
        res.json(response.success(banners));
    } catch (error) {
        next(error);
    }
}

// ==================== 后台管理接口 ====================

/**
 * 获取Banner列表（后台）
 */
async function getBannerList(req, res, next) {
    try {
        const { page = 1, pageSize = 10, status } = req.query;

        const result = await Banner.getList({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            status: (status !== undefined && status !== '') ? parseInt(status) : undefined
        });

        res.json(response.paginate(result.list, result.total, page, pageSize));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取Banner详情（后台）
 */
async function getBannerDetail(req, res, next) {
    try {
        const { id } = req.params;
        const banner = await Banner.findById(id);

        if (!banner) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        res.json(response.success(banner));
    } catch (error) {
        next(error);
    }
}

/**
 * 创建Banner（后台）
 */
async function createBanner(req, res, next) {
    try {
        const { title, image_url, link_url, sort_order = 0, status = 1 } = req.body;

        const banner = await Banner.create({
            title,
            image_url,
            link_url,
            sort_order,
            status
        });

        res.status(201).json(response.success(banner, 'Banner创建成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 更新Banner（后台）
 */
async function updateBanner(req, res, next) {
    try {
        const { id } = req.params;

        const banner = await Banner.findById(id);
        if (!banner) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        const { title, image_url, link_url, sort_order, status } = req.body;

        const updated = await Banner.update(id, {
            title,
            image_url,
            link_url,
            sort_order,
            status
        });

        if (!updated) {
            return res.status(400).json(response.error('更新失败'));
        }

        const updatedBanner = await Banner.findById(id);
        res.json(response.success(updatedBanner, 'Banner更新成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 删除Banner（后台）
 */
async function deleteBanner(req, res, next) {
    try {
        const { id } = req.params;

        const banner = await Banner.findById(id);
        if (!banner) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        await Banner.delete(id);
        res.json(response.success(null, 'Banner删除成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 切换Banner状态（后台）
 */
async function toggleBannerStatus(req, res, next) {
    try {
        const { id } = req.params;

        const banner = await Banner.findById(id);
        if (!banner) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        const newStatus = banner.status === 1 ? 0 : 1;
        await Banner.update(id, { status: newStatus });

        res.json(response.success(null, newStatus === 1 ? 'Banner已上架' : 'Banner已下架'));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createValidation,
    updateValidation,
    getActiveBanners,
    getBannerList,
    getBannerDetail,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleBannerStatus
};
