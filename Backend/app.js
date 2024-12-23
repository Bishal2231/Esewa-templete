const dotenv = require("dotenv");
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const { generateHmacSha256Hash, safeStringify } = require("./src/utlis/esewaSecurity.js");
const Transaction = require("./src/model/Transaction.model.js");
const connectDB = require("./src/DB/db.config.js");
// Load environment variables from .env file
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
connectDB();
// const corsOptions = {
//   origin:"http://localhost:5173   ",credentials:true,};


const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow the origin
    } else {
      callback(new Error('Not allowed by CORS')); // Deny the origin
    }
  },credentials:true,
};

app.use(cors(corsOptions));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Route to initiate payment
app.post("/initiate-payment", async (req, res) => {
  const { amount, productId } = req.body;
  let paymentData = {
    amount,
    failure_url: process.env.FAILURE_URL,
    product_delivery_charge: "0",
    product_service_charge: "0",
    product_code: process.env.MERCHANT_ID,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    success_url: process.env.SUCCESS_URL,
    tax_amount: "0",
    total_amount: amount,
    transaction_uuid: productId,
  };
  const data = `total_amount=${paymentData.total_amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`;
  const signature = generateHmacSha256Hash(data, process.env.SECRET);
  paymentData = { ...paymentData, signature };
  try {
    const payment = await axios.post(process.env.ESEWAPAYMENT_URL, null, {
      params: paymentData,
    });
    const reqPayment = JSON.parse(safeStringify(payment));
    if (reqPayment.status === 200) {
      const transaction = new Transaction({
        product_id: productId,
        amount: amount,
      });
      await transaction.save();
      return res.send({
        url: reqPayment.request.res.responseUrl,
      });
    }
  } catch (error) {
    res.send(error);
  }
});
// Route to handle payment status update
app.post("/payment-status", async (req, res) => {
  const { product_id } = req.body; // Extract data from request body
  try {
    // Find the transaction by its signature
    const transaction = await Transaction.findOne({ product_id });
    if (!transaction) {
      return res.status(400).json({ message: "Transaction not found" });
    }
    const paymentData = {
      product_code: "EPAYTEST",
      total_amount: transaction.amount,
      transaction_uuid: transaction.product_id,
    };
    const response = await axios.get(
      process.env.ESEWAPAYMENT_STATUS_CHECK_URL,
      {
        params: paymentData,
      }
    );
    const paymentStatusCheck = JSON.parse(safeStringify(response));
    if (paymentStatusCheck.status === 200) {
      // Update the transaction status
      transaction.status = paymentStatusCheck.data.status;
      await transaction.save();
      res
        .status(200)
        .json({ message: "Transaction status updated successfully" });
    }
  } catch (error) {
    console.error("Error updating transaction status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});