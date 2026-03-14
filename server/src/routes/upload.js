/**
 * 上传路由
 * 
 * @module routes/upload
 * @author AI Assistant
 */

const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

// 上传图片
router.post('/image', uploadController.handleImageUpload);

module.exports = router;
