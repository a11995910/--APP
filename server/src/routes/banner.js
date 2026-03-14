/**
 * Banner路由
 * 
 * @module routes/banner
 * @author AI Assistant
 */

const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');

// 公开接口 - 获取Banner列表
router.get('/', bannerController.getActiveBanners);

module.exports = router;
