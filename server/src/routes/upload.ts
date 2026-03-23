import { Router } from 'express';
import multer from 'multer';
import { parseFile } from '../utils/fileParser.js';
import { UPLOAD_MAX_SIZE } from '../config.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, XLSX, and XLS files are allowed'));
    }
  },
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const result = parseFile(req.file.buffer, req.file.originalname);
  res.json(result);
});

export default router;
