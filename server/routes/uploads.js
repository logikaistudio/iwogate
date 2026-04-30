import express from 'express';
import { createPresignUpload } from '../lib/storage.js';

export const setupUploadRoutes = (app) => {
  app.post('/api/uploads/presign', async (req, res) => {
    try {
      const { fileName, contentType } = req.body;
      if (!fileName || !contentType) return res.status(400).json({ message: 'fileName and contentType required' });
      const presign = await createPresignUpload({ fileName, contentType });
      return res.json(presign);
    } catch (err) {
      console.error('Presign failed', err);
      return res.status(500).json({ message: 'Failed to create presigned URL' });
    }
  });
};
