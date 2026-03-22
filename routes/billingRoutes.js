const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const billingController = require('../controllers/billingController');
const { logPhiAccess } = require('../middleware/phiAuditLogger');

// All routes require authentication
router.use(authMiddleware);

// Create invoice (doctors only)
router.post('/invoices', logPhiAccess('billing'), billingController.createInvoice);

// Get all invoices for logged-in doctor
router.get('/invoices', logPhiAccess('billing'), billingController.getInvoices);

// Get patients that the doctor has treated
router.get('/treated-patients', logPhiAccess('patient_profile'), billingController.getTreatedPatients);

// Get invoices for logged-in patient (sent + paid only)
router.get('/patient-invoices', logPhiAccess('billing'), billingController.getPatientInvoices);

// Patient submits UPI payment reference/UTR
router.post('/invoices/:id/payment-ref', logPhiAccess('billing'), billingController.submitPaymentRef);

// Get invoice by ID
router.get('/invoices/:id', logPhiAccess('billing'), billingController.getInvoiceById);

// Lightweight status check for payment auto-detection polling
router.get('/invoices/:id/status', billingController.getInvoiceStatus);

// Update invoice
router.patch('/invoices/:id', logPhiAccess('billing'), billingController.updateInvoice);

// Delete invoice (only drafts)
router.delete('/invoices/:id', logPhiAccess('billing'), billingController.deleteInvoice);

// Mark invoice as paid
router.patch('/invoices/:id/mark-paid', logPhiAccess('billing'), billingController.markAsPaid);

// Export invoice as PDF
router.get('/invoices/:id/pdf', logPhiAccess('billing'), billingController.exportInvoicePDF);

module.exports = router;
