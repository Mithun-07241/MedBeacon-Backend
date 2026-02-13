const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const billingController = require('../controllers/billingController');

// All routes require authentication
router.use(authMiddleware);

// Create invoice (doctors only)
router.post('/invoices', billingController.createInvoice);

// Get all invoices for logged-in doctor
router.get('/invoices', billingController.getInvoices);

// Get invoice by ID
router.get('/invoices/:id', billingController.getInvoiceById);

// Update invoice
router.patch('/invoices/:id', billingController.updateInvoice);

// Delete invoice (only drafts)
router.delete('/invoices/:id', billingController.deleteInvoice);

// Mark invoice as paid
router.patch('/invoices/:id/mark-paid', billingController.markAsPaid);

// Export invoice as PDF
router.get('/invoices/:id/pdf', billingController.exportInvoicePDF);

module.exports = router;
