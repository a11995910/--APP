/**
 * 用户路由
 * 
 * @module routes/user
 * @author AI Assistant
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/auth');

// 公开接口
router.post('/login', userController.loginValidation, userController.login);
router.post('/miniapp/silent-login', userController.miniappSilentLoginValidation, userController.miniappSilentLogin);

// 需要认证的接口
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.get('/home', authMiddleware, userController.getHomeData);
router.post('/push-device', authMiddleware, userController.syncPushDeviceValidation, userController.syncPushDevice);

module.exports = router;
