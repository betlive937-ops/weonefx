require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mysql = require("mysql2");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("."));

// ===============================
// MySQL Connection
// ===============================
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL");
    }
});

// ===============================
// Home
// ===============================
app.get("/", (req, res) => {
    res.send("WeOneFX Backend Running");
});
// ===============================
// Get Pesapal Token
// ===============================
app.get("/api/token", async (req, res) => {
    try {

        const response = await axios.post(
            "https://pay.pesapal.com/v3/api/Auth/RequestToken",
            {
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            }
        );

        console.log("TOKEN RESPONSE:", response.data);

        res.json(response.data);

    } catch (error) {

        console.error("TOKEN ERROR:", error.response?.data || error.message);

        res.status(500).json({
            success: false,
            error: error.response?.data || error.message
        });

    }
});
// ===============================
// Create Pesapal Payment Order
// ===============================
app.post("/api/pay", async (req, res) => {
    try {

        // Get Access Token
        const auth = await axios.post(
            "https://pay.pesapal.com/v3/api/Auth/RequestToken",
            {
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            }
        );

        const token = auth.data.token;

        console.log("TOKEN:", token);

        const { amount, currency, name, email, phone } = req.body;

        const order = {
            id: "WOFX-" + Date.now(),
            currency: currency,
            amount: Number(amount),
            description: "WeOneFX Wallet Deposit",
            callback_url: "http://localhost:3000/payment-success",
            notification_id: process.env.PESAPAL_IPN_ID,
            billing_address: {
                email_address: email,
                phone_number: phone,
                country_code: "KE",
                first_name: name,
                last_name: "Customer"
            }
        };

        console.log("ORDER:", order);

        const payment = await axios.post(
            "https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest",
            order,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("PAYMENT RESPONSE:", payment.data);

        res.json(payment.data);

    } catch (err) {

        console.error("PAYMENT ERROR:", err.response?.data || err.message);

        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });

    }
});
// ===============================
// Register User
// ===============================
app.post("/api/register", (req, res) => {

    const { fullname, email, password } = req.body;

    const sql = "INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)";

    db.query(sql, [fullname, email, password], (err) => {

        if (err) {
            return res.status(500).json(err);
        }

        res.json({
            success: true,
            message: "Registration successful"
        });

    });

});

// ===============================
// Login User
// ===============================
app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email=? AND password=?",
        [email, password],
        (err, results) => {

            if (err) {
                return res.status(500).json(err);
            }

            if (results.length > 0) {

                res.json({
                    success: true,
                    user: results[0]
                });

            } else {

                res.json({
                    success: false,
                    message: "Invalid email or password"
                });

            }

        }
    );

});