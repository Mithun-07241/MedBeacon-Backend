const express = require('express');
const router = express.Router();
const {
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    getCallHistory
} = require('../controllers/callController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/initiate', initiateCall);
router.post('/:id/accept', acceptCall);
router.post('/:id/reject', rejectCall);
router.post('/:id/end', endCall);
router.get('/history', getCallHistory);

module.exports = router;
