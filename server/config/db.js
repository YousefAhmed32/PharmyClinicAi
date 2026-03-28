const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

let gfs; // 👈 هنستخدمه في باقي المشروع

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

    // ✅ إعداد GridFS
    const connection = mongoose.connection;

    connection.once('open', () => {
      gfs = Grid(connection.db, mongoose.mongo);
      gfs.collection('uploads'); // اسم الكوليكشن
      console.log('📁 GridFS initialized');
    });

    // Connection event listeners
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// 👇 مهم جدًا نصدر gfs
module.exports = { connectDB, gfs };