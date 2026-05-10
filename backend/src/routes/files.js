'use strict';

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { uploadToS3, isAllowedType } = require('../services/fileService');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedType(file.mimetype)) cb(null, true);
    else cb(new AppError(`File type ${file.mimetype} not allowed`, 400));
  },
});

router.use(authenticate);

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file provided', 400);

    const { relatedId, relatedType, description, isPublic, folderPath } = req.body;
    const extension = req.file.originalname.split('.').pop();
    const storedName = `${uuidv4()}.${extension}`;
    const key = `uploads/${req.user.institution_id || 'shared'}/${storedName}`;

    const fileUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);

    const result = await query(
      `INSERT INTO file_storage
       (uploaded_by, related_to, related_type, original_name, stored_name,
        file_url, file_type, mime_type, size_bytes, folder_path, is_public, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        req.user.id, relatedId, relatedType,
        req.file.originalname, storedName, fileUrl,
        extension, req.file.mimetype, req.file.size,
        folderPath || '/', isPublic === 'true', description,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const { relatedId, relatedType, folderPath } = req.query;

    const result = await query(
      `SELECT fs.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
       FROM file_storage fs
       JOIN users u ON fs.uploaded_by = u.id
       WHERE ($1::UUID IS NULL OR fs.related_to = $1)
         AND ($2::text IS NULL OR fs.related_type = $2)
         AND ($3::text IS NULL OR fs.folder_path = $3)
         AND (fs.is_public = TRUE OR fs.uploaded_by = $4
              OR EXISTS (
                SELECT 1 FROM research_projects rp
                WHERE rp.id = fs.related_to
                  AND (rp.guide_id = $4 OR rp.scholar_id = $4)
              ))
       ORDER BY fs.created_at DESC`,
      [relatedId || null, relatedType || null, folderPath || null, req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

router.post('/:id/comments', async (req, res, next) => {
  try {
    await query(
      `INSERT INTO file_comments (file_id, user_id, comment) VALUES ($1, $2, $3)`,
      [req.params.id, req.user.id, req.body.comment]
    );
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM file_storage WHERE id = $1 AND uploaded_by = $2 RETURNING stored_name`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) throw new AppError('File not found or unauthorized', 404);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
