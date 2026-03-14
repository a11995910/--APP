/**
 * 后台管理路由
 * 
 * @module routes/admin
 * @author AI Assistant
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const loanController = require('../controllers/loanController');
const bannerController = require('../controllers/bannerController');
const notificationController = require('../controllers/notificationController');
const smsController = require('../controllers/smsController');
const { adminAuthMiddleware } = require('../middlewares/auth');

// ==================== 公开接口 ====================
router.post('/login', adminController.loginValidation, adminController.login);

// ==================== 需要管理员认证的接口 ====================
router.use(adminAuthMiddleware);

// 管理员信息
router.get('/profile', adminController.getProfile);
router.put('/password', adminController.changePassword);

// 仪表盘
router.get('/dashboard', adminController.getDashboard);

// 管理员管理
router.get('/admins', adminController.getAdminList);
router.post('/admins', adminController.createValidation, adminController.createAdmin);
router.put('/admins/:id', adminController.updateAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);

// 用户管理
router.get('/users', userController.getUserList);
router.get('/users/stats', userController.getUserStats);
router.get('/users/:id', userController.getUserDetail);
router.put('/users/:id/status', userController.updateUserStatus);

// 贷款管理
router.get('/loans', loanController.getLoanList);
router.get('/loans/stats', loanController.getLoanStats);
router.get('/loans/:id', loanController.getAdminLoanDetail);

// Banner管理
router.get('/banners', bannerController.getBannerList);
router.get('/banners/:id', bannerController.getBannerDetail);
router.post('/banners', bannerController.createValidation, bannerController.createBanner);
router.put('/banners/:id', bannerController.updateValidation, bannerController.updateBanner);
router.delete('/banners/:id', bannerController.deleteBanner);
router.post('/banners/:id/toggle', bannerController.toggleBannerStatus);

// 通知管理
router.get('/notifications', notificationController.getNotificationList);
router.get('/notifications/stats', notificationController.getNotificationStats);

// 短信平台管理
router.get('/sms/configs', smsController.getSmsConfigList);
router.get('/sms/configs/:id', smsController.getSmsConfigDetail);
router.post('/sms/configs', smsController.createValidation, smsController.createSmsConfig);
router.put('/sms/configs/:id', smsController.updateSmsConfig);
router.delete('/sms/configs/:id', smsController.deleteSmsConfig);
router.put('/sms/configs/:id/balance', smsController.updateBalance);
router.get('/sms/stats', smsController.getSmsStats);

module.exports = router;
