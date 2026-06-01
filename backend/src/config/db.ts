import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('MONGO_URI not found in .env');
      process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (err: any) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
};

export default connectDB;
