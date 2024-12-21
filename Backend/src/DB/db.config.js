const { connect } = require("mongoose");
const connectDB = () => {
  try {
    connect('mongodb://127.0.0.1:27017/mydatabase').then((res) => {
      console.log("MongoDB connected successfully");
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};
module.exports = connectDB;