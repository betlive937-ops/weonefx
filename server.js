require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const validator = require("validator");

const app = express();


// Security middleware
app.use(helmet());


// Allow requests
app.use(cors());


// Read JSON data
app.use(express.json());


// Read form data
app.use(express.urlencoded({ extended: true }));


// Serve HTML/CSS/JS files
app.use(express.static(__dirname));


// Cookies
app.use(cookieParser());


// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

app.use(limiter);

// ======================================
// Home
// ======================================
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// =====================================
// MySQL Connection
// =====================================

console.log("DB_HOST =", process.env.DB_HOST);
console.log("DB_USER =", process.env.DB_USER);
console.log("DB_NAME =", process.env.DB_NAME);
console.log("DB_PORT =", process.env.DB_PORT);

const db = mysql.createConnection({

    host: process.env.DB_HOST,

    user: process.env.DB_USER,

    password: process.env.DB_PASSWORD,

    database: process.env.DB_NAME,

    port: process.env.DB_PORT

});
db.connect((err) => {
    if (err) {
        console.error("❌ MySQL Connection Error:", err);
        return;
    }

    console.log("✅ Connected to MySQL");
});
// ======================================
// JWT Authentication Middleware
// ======================================

function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Please log in."
        });
    }


    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {

        if (err) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired token."
            });
        }


        // Save logged-in user details
        req.user = user;

        next();

    });

}



// ======================================
// ADMIN AUTHORIZATION MIDDLEWARE
// ======================================

function requireAdmin(req, res, next) {

    // Check if user exists
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }


    // Check user role
    if (req.user.role !== "admin") {

        return res.status(403).json({
            success: false,
            message: "Admin access required."
        });

    }


    // Continue if admin
    next();

}
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
app.post("/api/register", async (req, res) => {

    const { fullname, email, password } = req.body;

   if (
    !fullname ||
    !email ||
    !password
) {
    return res.status(400).json({
        success: false,
        message: "All fields are required."
    });
}

if (!validator.isEmail(email)) {
    return res.status(400).json({
        success: false,
        message: "Invalid email address."
    });
}

if (fullname.length < 3 || fullname.length > 100) {
    return res.status(400).json({
        success: false,
        message: "Full name must be between 3 and 100 characters."
    });
}

if (!validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0
})) {
    return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and include uppercase, lowercase and a number."
    });
}
const hashedPassword = await bcrypt.hash(password, 12);
    db.query(
        "SELECT id FROM users WHERE email=?",
        [email],
        (err, rows) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            if (rows.length > 0) {
                return res.json({
                    success: false,
                    message: "Email already exists."
                });
            }

            db.query(
                "INSERT INTO users(fullname,email,password,balance) VALUES(?,?,?,0)",
                [fullname, email, hashedPassword],
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

        }
    );

});

app.post("/api/login", async (req, res) => {

    const { email, password } = req.body;


    db.query(
        "SELECT * FROM users WHERE email=?",
        [email],
        async (err, results) => {


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


            const user = results[0];


            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );


            if (!passwordMatch) {

                return res.json({
                    success: false,
                    message: "Invalid email or password."
                });

            }



            // ======================================
            // Generate JWT Token
            // Including User Role
            // ======================================

            const token = jwt.sign(

                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },

                process.env.JWT_SECRET,

                {
                    expiresIn: "7d"
                }

            );



            // ======================================
            // Send Login Response
            // ======================================

            res.json({

                success: true,

                message: "Login successful",

                token: token,


                user: {

                    id: user.id,

                    fullname: user.fullname,

                    email: user.email,

                    role: user.role,

                    balance: user.balance

                }

            });


        }

    );


});
// ======================================
// Get Pesapal Access Token
// ======================================
app.get("/api/token", async (req, res) => {

    try {

        console.log("🔑 Requesting Pesapal Token...");

        const response = await axios.post(
            "https://pay.pesapal.com/v3/api/Auth/RequestToken",
            {
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            }
        );

        console.log("✅ Pesapal Token Received");

        res.json(response.data);

    } catch (error) {

        console.error("❌ TOKEN ERROR");

      if (error.response) {
    console.error("=== PESAPAL ERROR ===");
    console.error("Status:", error.response.status);
    console.error("Headers:", error.response.headers);
    console.error("Body:", error.response.data);
    console.error("Message:", error.message);
} else {
    console.error(error.message);
}

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
console.log("🔥 /api/pay route was called");
    console.log("==================================");
    console.log("💰 NEW DEPOSIT REQUEST");
    console.log(req.body);
    console.log("==================================");

    try {

        const {
            amount,
            currency,
            name,
            email,
            phone
        } = req.body;

        // =============================
        // Get Access Token
        // =============================
        const auth = await axios.post(
            "https://pay.pesapal.com/v3/api/Auth/RequestToken",
            {
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                }
            }
        );

        console.log("✅ TOKEN RESPONSE");
        console.log(auth.data);

        const token = auth.data.token;

        if (!token) {

            return res.status(500).json({
                success: false,
                message: "Failed to obtain Pesapal token."
            });

        }

        const merchantReference = "WOFX-" + Date.now();

        // Save Pending Transaction
        db.query(
            `INSERT INTO transactions
            (
                merchant_reference,
                email,
                amount,
                currency,
                status
            )
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
                    console.error("Transaction Insert Error");
                    console.error(err);
                }

            }
        );

        const order = {

            id: merchantReference,

            currency: currency,

            amount: Number(amount),

            description: "WeOneFX Wallet Deposit",

            callback_url:
                "https://truthful-motivation-production-2515.up.railway.app/payment-success.html",

            notification_id: process.env.PESAPAL_IPN_ID,

            billing_address: {

                email_address: email,

                phone_number: phone,

                country_code: "KE",

                first_name: name,

                last_name: "Customer"

            }

        };

        console.log("📦 Sending Order To Pesapal");

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

        console.log("✅ PAYMENT CREATED");
        console.log(payment.data);

        res.json(payment.data);

    } catch (error) {

        console.error("❌ PAYMENT ERROR");

        if (error.response) {

            console.error("Status:", error.response.status);
            console.error(error.response.data);

        } else {

            console.error(error.message);

        }

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

        // Get Pesapal Token
        const auth = await axios.post(
            "https://pay.pesapal.com/v3/api/Auth/RequestToken",
            {
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            }
        );

        const token = auth.data.token;

        // Get Payment Status
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
                    "SELECT id,balance FROM users WHERE email=?",
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

        console.error(err.response?.data || err.message);

        return res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });

    }

});
// ======================================
// Start Server
// ======================================

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {

    console.log(`🚀 WeOneFX running on port ${PORT}`);

});