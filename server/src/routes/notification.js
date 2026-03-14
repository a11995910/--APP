/**
 * 通知路由
 * 
 * @module routes/notification
 * @author AI Assistant
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middlewares/auth');

// 需要认证
router.use(authMiddleware);

router.get('/', notificationController.getMyNotifications);

module.exports = router;
