const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/:filename', async (req, res) => {
  try {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });

    const files = await mongoose.connection.db
      .collection('uploads.files')
      .find({ filename: req.params.filename })
      .toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.set('Content-Type', files[0].contentType);

    const downloadStream = bucket.openDownloadStreamByName(req.params.filename);

    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;