const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const labReportController = require('../controllers/labReportController');
const { logPhiAccess } = require('../middleware/phiAuditLogger');

// All routes require authentication
router.use(authMiddleware);

// ⚠️  Static paths MUST come before /:id wildcard

// Patient: get own reports
router.get('/patient/my-reports', logPhiAccess('report'), labReportController.getPatientLabReports);

// Doctor: treated patients list (for dropdown in create form)
router.get('/treated-patients', logPhiAccess('patient_profile'), labReportController.getTreatedPatients);

// Doctor: CRUD
router.post('/', logPhiAccess('report'), labReportController.createLabReport);
router.get('/', logPhiAccess('report'), labReportController.getLabReports);
router.get('/:id', logPhiAccess('report'), labReportController.getLabReportById);
router.patch('/:id', logPhiAccess('report'), labReportController.updateLabReport);
router.delete('/:id', logPhiAccess('report'), labReportController.deleteLabReport);

module.exports = router;

