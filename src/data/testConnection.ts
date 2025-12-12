import mongoose from 'mongoose';
import config from '../config/config';

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI:', config.mongodbUri);
    
    await mongoose.connect(config.mongodbUri || 'mongodb://localhost:27017/sevadaan');
    console.log('✅ MongoDB connection successful');
    
    // Test creating a simple document
    const testCollection = mongoose.connection.db?.collection('test');
    if (testCollection) {
      await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
      console.log('✅ Document creation test successful');
      await testCollection.deleteOne({ test: 'connection' });
      console.log('✅ Document deletion test successful');
    }
    
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnection successful');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

testConnection();
