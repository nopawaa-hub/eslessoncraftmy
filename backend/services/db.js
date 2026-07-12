import mongoose from "mongoose";

let connectionPromise = null;

export async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lessoncraft_my";

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoUri, { serverSelectionTimeoutMS: 3000 })
      .then(() => {
        console.log(`MongoDB connected: ${mongoose.connection.name}`);
        return mongoose.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        console.error(`MongoDB connection failed: ${error.message}`);
        throw error;
      });
  }

  return connectionPromise;
}

export function requireDatabase(_req, _res, next) {
  if (mongoose.connection.readyState !== 1) {
    return next(Object.assign(new Error("Database is not connected. Start MongoDB and check MONGO_URI."), { statusCode: 503 }));
  }

  return next();
}
