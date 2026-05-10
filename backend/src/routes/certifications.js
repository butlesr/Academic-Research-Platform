'use strict';

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const crypto = require('crypto');

router.use(authenticate);

// Issue certificate
router.post('/', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const { userId, type, title, description, courseId, validUntil } = req.body;

    const certNumber = `ARP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const qrData = JSON.stringify({ certNumber, userId, type, issuedAt: new Date().toISOString() });
    const qrCode = await QRCode.toDataURL(qrData);

    const result = await query(
      `INSERT INTO certificates
       (user_id, issued_by, institution_id, type, title, description, certificate_number, qr_code, course_id, valid_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [userId, req.user.id, req.user.institution_id, type, title, description, certNumber, qrCode, courseId, validUntil]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// Get my certificates
router.get('/my', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.first_name || ' ' || u.last_name AS issued_by_name, i.name AS institution_name
       FROM certificates c
       JOIN users u ON c.issued_by = u.id
       JOIN institutions i ON c.institution_id = i.id
       WHERE c.user_id = $1 AND c.is_revoked = FALSE
       ORDER BY c.issued_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// Verify certificate by number
router.get('/verify/:certNumber', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.first_name || ' ' || u.last_name AS recipient_name, u.email AS recipient_email,
              issuer.first_name || ' ' || issuer.last_name AS issued_by_name,
              i.name AS institution_name
       FROM certificates c
       JOIN users u ON c.user_id = u.id
       JOIN users issuer ON c.issued_by = issuer.id
       JOIN institutions i ON c.institution_id = i.id
       WHERE c.certificate_number = $1`,
      [req.params.certNumber]
    );
    if (!result.rows.length) throw new AppError('Certificate not found', 404);

    const cert = result.rows[0];
    res.json({
      success: true,
      data: {
        ...cert,
        isValid: !cert.is_revoked && (!cert.valid_until || new Date(cert.valid_until) > new Date()),
      },
    });
  } catch (err) { next(err); }
});

// Download certificate PDF
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.first_name || ' ' || u.last_name AS recipient_name,
              u.enrollment_number, issuer.first_name || ' ' || issuer.last_name AS issued_by_name,
              issuer.designation AS issuer_designation, i.name AS institution_name
       FROM certificates c
       JOIN users u ON c.user_id = u.id
       JOIN users issuer ON c.issued_by = issuer.id
       JOIN institutions i ON c.institution_id = i.id
       WHERE c.id = $1 AND (c.user_id = $2 OR $3 = ANY(ARRAY['professor','super_admin','admin']))`,
      [req.params.id, req.user.id, req.user.role]
    );
    if (!result.rows.length) throw new AppError('Certificate not found', 404);

    const cert = result.rows[0];
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.certificate_number}.pdf"`);
    doc.pipe(res);

    // Background gradient
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#fafafa');
    doc.rect(0, 0, doc.page.width, 20).fill('#1e3a5f');
    doc.rect(0, doc.page.height - 20, doc.page.width, 20).fill('#1e3a5f');
    doc.rect(0, 0, 20, doc.page.height).fill('#1e3a5f');
    doc.rect(doc.page.width - 20, 0, 20, doc.page.height).fill('#1e3a5f');

    // Inner border
    doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70).stroke('#c5a028');

    // Title
    doc.fillColor('#1e3a5f').fontSize(14).font('Helvetica').text(cert.institution_name?.toUpperCase(), 0, 60, { align: 'center' });
    doc.fontSize(36).font('Helvetica-Bold').text('CERTIFICATE', 0, 90, { align: 'center' });
    doc.fontSize(18).font('Helvetica').fillColor('#555').text(cert.title, 0, 140, { align: 'center' });

    doc.fontSize(14).fillColor('#333').text('This is to certify that', 0, 200, { align: 'center' });
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#1e3a5f').text(cert.recipient_name, 0, 225, { align: 'center' });

    if (cert.description) {
      doc.fontSize(13).font('Helvetica').fillColor('#444').text(cert.description, 100, 270, { align: 'center', width: doc.page.width - 200 });
    }

    // Date and number
    doc.fontSize(12).fillColor('#666')
       .text(`Issued: ${new Date(cert.issued_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 100, 330)
       .text(`Certificate No: ${cert.certificate_number}`, doc.page.width - 300, 330, { align: 'right' });

    // Signature
    doc.moveTo(100, 370).lineTo(280, 370).stroke('#333');
    doc.fontSize(11).fillColor('#333').text(cert.issued_by_name, 100, 375);
    doc.fontSize(10).fillColor('#666').text(cert.issuer_designation || 'Faculty', 100, 390);

    doc.end();
  } catch (err) { next(err); }
});

module.exports = router;
