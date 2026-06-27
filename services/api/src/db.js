import mongoose from 'mongoose';

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    throw new Error('MONGO_URL is required to connect to MongoDB.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUrl);

  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
