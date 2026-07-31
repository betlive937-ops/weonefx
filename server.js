require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mysql = require("mysql2");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("."));

// ======================================
// MySQL Connection
// ======================================
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.log("❌ MySQL Error:", err);
    } else {
        console.log("✅ Connected to MySQL");
    }
});

// ======================================
// Home
// ======================================
app.get("/", (req, res) => {
    res.send("✅ WeOneFX Backend Running");
});

// ======================================
// Wallet Transaction Helper
// ======================================
async function saveWalletTransaction(
    userId,
    transactionType,
    amount,
    currency,
    paymentMethod,
    reference,
    status
) {
    return new Promise((resolve, reject) => {

        const sql = `
        INSERT INTO wallet_transactions
        (
            user_id,
            transaction_type,
            amount,
            currency,
            payment_method,
            transaction_reference,
            status
        )
        VALUES (?,?,?,?,?,?,?)
        `;

        db.query(
            sql,
            [
                userId,
                transactionType,
                amount,
                currency,
                paymentMethod,
                reference,
                status
            ],
            (err, result) => {

                if (err) {
                    return reject(err);
                }

                resolve(result);

            }
        );

    });
}

// ======================================
// Register User
// ======================================
app.post("/api/register", (req, res) => {

    const { fullname, email, password } = req.body;

    db.query(
        "INSERT INTO users(fullname,email,password) VALUES(?,?,?)",
        [fullname, email, password],
        (err) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            res.json({
                success: true,
                message: "Registration successful."
            });

        }
    );

});

// ======================================
// Login User
// ======================================
app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email=? AND password=?",
        [email, password],
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (results.length === 0) {
                return res.json({
                    success: false,
                    message: "Invalid email or password."
                });
            }

            res.json({
                success: true,
                user: results[0]
            });

        }
    );

});

// ======================================
// Get Pesapal Access Token
// ======================================
app.get("/api/token", async (req, res) => {

    try {

        const response = await axios.post(
            "https://pay.pesapal.com/v3/api/Auth/RequestToken",
            {
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            }
        );

        res.json(response.data);

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.response?.data || error.message
        });

    }

});
// ======================================
// Create Pesapal Payment
// ======================================
app.post("/api/pay", async (req, res) => {

    try {

        const { amount, currency, name, email, phone } = req.body;

        // Get Pesapal Access Token
        const auth = await axios.post(
            "https://pay.pesapal.com/v3/api/Auth/RequestToken",
            {
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            }
        );

        const token = auth.data.token;

        const merchantReference = "WOFX-" + Date.now();

        // Save pending transaction
        db.query(
            `INSERT INTO transactions
            (merchant_reference,email,amount,currency,status)
            VALUES (?,?,?,?,?)`,
            [
                merchantReference,
                email,
                amount,
                currency,
                "PENDING"
            ],
            (err) => {
                if (err) {
                    console.log("Transaction Save Error:", err.message);
                }
            }
        );

        const order = {

            id: merchantReference,

            currency: currency,

            amount: Number(amount),

            description: "WeOneFX Wallet Deposit",

           callback_url: "https://truthful-motivation-production-2515.up.railway.app/payment-success.html",

            notification_id: process.env.PESAPAL_IPN_ID,

            billing_address: {
                email_address: email,
                phone_number: phone,
                country_code: "KE",
                first_name: name,
                last_name: "Customer"
            }

        };

        const payment = await axios.post(
            "https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest",
            order,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json"
                }
            }
        );

        res.json(payment.data);

    } catch (error) {

        console.log(error.response?.data || error.message);

        res.status(500).json({
            success: false,
            error: error.response?.data || error.message
        });

    }

});
// ======================================
// Verify Payment & Credit Wallet
// ======================================
app.post("/api/confirm-payment", async (req, res) => {

    const { orderTrackingId, email } = req.body;

    if (!orderTrackingId || !email) {
        return res.status(400).json({
            success: false,
            message: "Missing orderTrackingId or email."
        });
    }

    try {

        // Get Pesapal token
        const auth = await axios.post(
            "https://pay.pesapal.com/v3/api/Auth/RequestToken",
            {
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            }
        );

        const token = auth.data.token;

        // Check payment status
        const statusResponse = await axios.get(
            `https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                }
            }
        );

        const payment = statusResponse.data;

        if (payment.payment_status_description !== "Completed") {
            return res.json({
                success: false,
                payment
            });
        }

        db.query(
            "SELECT * FROM transactions WHERE order_tracking_id=?",
            [orderTrackingId],
            (err, transactionRows) => {

                if (err) {
                    return res.status(500).json({
                        success: false,
                        error: err.message
                    });
                }

                if (
                    transactionRows.length > 0 &&
                    transactionRows[0].status === "COMPLETED"
                ) {
                    return res.json({
                        success: true,
                        message: "Payment already credited."
                    });
                }

                db.query(
                    "SELECT id, balance FROM users WHERE email=?",
                    [email],
                    async (err, userRows) => {

                        if (err) {
                            return res.status(500).json({
                                success: false,
                                error: err.message
                            });
                        }

                        if (userRows.length === 0) {
                            return res.status(404).json({
                                success: false,
                                message: "User not found."
                            });
                        }

                        const userId = userRows[0].id;
                        const currentBalance = Number(userRows[0].balance);
                        const depositAmount = Number(payment.amount);
                        const newBalance = currentBalance + depositAmount;

                        db.query(
                            "UPDATE users SET balance=? WHERE id=?",
                            [newBalance, userId],
                            async (updateErr) => {

                                if (updateErr) {
                                    return res.status(500).json({
                                        success: false,
                                        error: updateErr.message
                                    });
                                }

                               
db.query(
    `UPDATE transactions
     SET order_tracking_id=?, status='COMPLETED'
     WHERE email=?`,
    [orderTrackingId, email],
    async (transErr) => {

        if (transErr) {
            return res.status(500).json({
                success: false,
                error: transErr.message
            });
        }

        try {

            await saveWalletTransaction(
                userId,
                "deposit",
                depositAmount,
                payment.currency,
                "Pesapal",
                orderTrackingId,
                "Completed"
            );

            return res.json({
                success: true,
                message: "Wallet credited successfully.",
                balance: newBalance
            });

        } catch (walletErr) {

            return res.status(500).json({
                success: false,
                error: walletErr.message
            });

        }

    }
);

                    }
                );
            }
        );
    }
);

} catch (err) {

        console.log(err.response?.data || err.message);

        return res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });

    }

});

// ======================================
// Start Server
// ======================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 WeOneFX running on port ${PORT}`);
});