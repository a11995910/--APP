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
const logger = require('../utils/logger');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedImageTypes = {
    'image/jpeg': {
        extensions: ['.jpg', '.jpeg'],
        storageExtension: '.jpg'
    },
    'image/jpg': {
        extensions: ['.jpg', '.jpeg'],
        storageExtension: '.jpg'
    },
    'image/png': {
        extensions: ['.png'],
        storageExtension: '.png'
    },
    'image/gif': {
        extensions: ['.gif'],
        storageExtension: '.gif'
    },
    'image/webp': {
        extensions: ['.webp'],
        storageExtension: '.webp'
    }
};

/**
 * 生成唯一文件名
 * @param {string} mimetype - 经过白名单校验的 MIME 类型
 * @returns {string} 新文件名
 */
function generateFileName(mimetype) {
    const ext = allowedImageTypes[mimetype].storageExtension;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}_${random}${ext}`;
}

/**
 * 删除已落盘的异常上传文件，避免校验失败的文件残留在公开目录。
 * @param {string} filePath - 文件绝对路径
 */
function removeUploadedFile(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        // 删除失败不影响本次响应，但不能吞掉现场信息，方便后续排查磁盘或权限问题。
        logger.error('删除异常上传文件失败', { filePath, error: error.message });
    }
}

/**
 * 校验图片真实文件头，防止仅伪造 Content-Type 或扩展名上传脚本文件。
 * @param {string} filePath - 文件绝对路径
 * @param {string} mimetype - 上传文件 MIME 类型
 * @returns {boolean} 是否为真实图片文件
 */
function isValidImageSignature(filePath, mimetype) {
    const buffer = fs.readFileSync(filePath);

    if (buffer.length < 12) {
        return false;
    }

    if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (mimetype === 'image/png') {
        return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }

    if (mimetype === 'image/gif') {
        const signature = buffer.subarray(0, 6).toString('ascii');
        return signature === 'GIF87a' || signature === 'GIF89a';
    }

    if (mimetype === 'image/webp') {
        return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    }

    return false;
}

/**
 * 文件过滤器 - 只允许图片文件
 */
const imageFilter = (req, file, cb) => {
    const imageType = allowedImageTypes[file.mimetype];
    if (!imageType) {
        cb(new Error('只支持上传 JPG、PNG、GIF、WEBP 格式的图片'), false);
        return;
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!imageType.extensions.includes(ext)) {
        cb(new Error('文件扩展名与图片格式不匹配'), false);
        return;
    }

    cb(null, true);
};

/**
 * Multer 配置 - 图片上传
 */
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, generateFileName(file.mimetype));
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

        if (!isValidImageSignature(req.file.path, req.file.mimetype)) {
            removeUploadedFile(req.file.path);
            return res.status(400).json(response.error('文件内容不是有效图片'));
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
