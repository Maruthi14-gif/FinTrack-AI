import mongoose from 'mongoose';
import env from './env.js';

const connectDB = async (): Promise<void> => {
  await mongoose.connect(env.mongoUri);
  console.log('Connected to MongoDB');
};

export default connectDB;
