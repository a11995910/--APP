/**
 * 贷款路由
 * 
 * @module routes/loan
 * @author AI Assistant
 */

const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { authMiddleware } = require('../middlewares/auth');

// 所有贷款接口都需要认证
router.use(authMiddleware);

router.get('/', loanController.getMyLoans);
router.get('/:id/schedule', loanController.getLoanSchedule);
router.get('/:id', loanController.getLoanDetail);
router.post('/', loanController.createValidation, loanController.createLoan);
router.put('/:id', loanController.updateValidation, loanController.updateLoan);
router.delete('/:id', loanController.deleteLoan);
router.post('/:id/complete', loanController.markAsCompleted);

module.exports = router;
