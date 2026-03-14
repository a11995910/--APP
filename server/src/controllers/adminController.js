/**
 * 管理员控制器
 * 处理管理员相关的API请求
 * 
 * @module controllers/adminController
 * @author AI Assistant
 */

const { body } = require('express-validator');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Notification = require('../models/Notification');
const { generateAdminToken } = require('../config/jwt');
const response = require('../utils/response');
const { handleValidation } = require('../middlewares/validator');

/**
 * 登录验证规则
 */
const loginValidation = [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空'),
    handleValidation
];

/**
 * 创建管理员验证规则
 */
const createValidation = [
    body('username').notEmpty().withMessage('用户名不能为空')
        .isLength({ min: 3, max: 50 }).withMessage('用户名长度3-50个字符'),
    body('password').notEmpty().withMessage('密码不能为空')
        .isLength({ min: 6 }).withMessage('密码至少6个字符'),
    body('name').optional().isLength({ max: 50 }).withMessage('姓名最多50个字符'),
    body('role').optional().isIn(['admin', 'operator']).withMessage('角色类型不正确'),
    handleValidation
];

/**
 * 管理员登录
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function login(req, res, next) {
    try {
        const { username, password } = req.body;

        // 查找管理员
        const admin = await Admin.findByUsername(username);
        if (!admin) {
            return res.status(401).json(response.error('用户名或密码错误', 401));
        }

        // 检查状态
        if (admin.status === 0) {
            return res.status(403).json(response.error('账号已被禁用', 403));
        }

        // 验证密码
        const isValid = await Admin.verifyPassword(password, admin.password);
        if (!isValid) {
            return res.status(401).json(response.error('用户名或密码错误', 401));
        }

        // 更新最后登录时间
        await Admin.updateLastLogin(admin.id);

        // 生成token
        const token = generateAdminToken({
            id: admin.id,
            username: admin.username,
            role: admin.role,
            isAdmin: true
        });

        res.json(response.success({
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: admin.role
            }
        }, '登录成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取当前管理员信息
 */
async function getProfile(req, res, next) {
    try {
        const admin = await Admin.findById(req.admin.id);
        if (!admin) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        res.json(response.success(admin));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取仪表盘数据
 */
async function getDashboard(req, res, next) {
    try {
        const [userStats, loanStats, notifyStats] = await Promise.all([
            User.getStats(),
            Loan.getStats(),
            Notification.getStats()
        ]);

        res.json(response.success({
            users: userStats,
            loans: loanStats,
            notifications: notifyStats
        }));
    } catch (error) {
        next(error);
    }
}

/**
 * 获取管理员列表
 */
async function getAdminList(req, res, next) {
    try {
        const { page = 1, pageSize = 10, role, status } = req.query;

        const result = await Admin.getList({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            role,
            status: (status !== undefined && status !== '') ? parseInt(status) : undefined
        });

        res.json(response.paginate(result.list, result.total, page, pageSize));
    } catch (error) {
        next(error);
    }
}

/**
 * 创建管理员
 */
async function createAdmin(req, res, next) {
    try {
        const { username, password, name, role = 'operator' } = req.body;

        // 检查用户名是否已存在
        const existing = await Admin.findByUsername(username);
        if (existing) {
            return res.status(400).json(response.error('用户名已存在'));
        }

        const admin = await Admin.create({
            username,
            password,
            name,
            role
        });

        res.status(201).json(response.success(admin, '管理员创建成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 更新管理员
 */
async function updateAdmin(req, res, next) {
    try {
        const { id } = req.params;
        const { name, password, role, status } = req.body;

        const admin = await Admin.findById(id);
        if (!admin) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        const updated = await Admin.update(id, {
            name,
            password,
            role,
            status
        });

        if (!updated) {
            return res.status(400).json(response.error('更新失败'));
        }

        res.json(response.success(null, '更新成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 删除管理员
 */
async function deleteAdmin(req, res, next) {
    try {
        const { id } = req.params;

        // 不能删除自己
        if (parseInt(id) === req.admin.id) {
            return res.status(400).json(response.error('不能删除自己'));
        }

        const admin = await Admin.findById(id);
        if (!admin) {
            return res.status(404).json(response.errors.NOT_FOUND);
        }

        await Admin.delete(id);
        res.json(response.success(null, '删除成功'));
    } catch (error) {
        next(error);
    }
}

/**
 * 修改密码
 */
async function changePassword(req, res, next) {
    try {
        const { oldPassword, newPassword } = req.body;
        const adminId = req.admin.id;

        const admin = await Admin.findByUsername(req.admin.username);

        // 验证旧密码
        const isValid = await Admin.verifyPassword(oldPassword, admin.password);
        if (!isValid) {
            return res.status(400).json(response.error('原密码错误'));
        }

        // 更新密码
        await Admin.update(adminId, { password: newPassword });

        res.json(response.success(null, '密码修改成功'));
    } catch (error) {
        next(error);
    }
}

module.exports = {
    loginValidation,
    createValidation,
    login,
    getProfile,
    getDashboard,
    getAdminList,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    changePassword
};
