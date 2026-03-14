/**
 * 文件上传控制器
 * 处理文件上传相关的API请求
 * 
 * @module controllers/uploadController
 * @author AI Assistant
 */

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const response = require('../utils/response');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * 生成唯一文件名
 * @param {string} originalName - 原始文件名
 * @returns {string} 新文件名
 */
function generateFileName(originalName) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}_${random}${ext}`;
}

/**
 * 文件过滤器 - 只允许图片文件
 */
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('只支持上传 JPG、PNG、GIF、WEBP 格式的图片'), false);
    }
};

/**
 * Multer 配置 - 图片上传
 */
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, generateFileName(file.originalname));
    }
});

const uploadImage = multer({
    storage: imageStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
}).single('file');

/**
 * 上传图片
 * 
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function handleImageUpload(req, res, next) {
    uploadImage(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json(response.error('文件大小不能超过5MB'));
                }
                return res.status(400).json(response.error(err.message));
            }
            return res.status(400).json(response.error(err.message));
        }

        if (!req.file) {
            return res.status(400).json(response.error('请选择要上传的图片'));
        }

        // 构建访问 URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        res.json(response.success({
            url: fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size
        }, '上传成功'));
    });
}

module.exports = {
    handleImageUpload
};
