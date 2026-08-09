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

const path = require("path");

const app = express();

// Railway runs behind a reverse proxy
app.set("trust proxy", 1);

// ================================
// Middleware
// ================================
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                scriptSrcAttr: ["'none'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", "https:", "data:"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                frameAncestors: ["'self'"]
            }
        }
    })
);

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// Serve frontend files
app.use(express.static(__dirname));


// Cookies
app.use(cookieParser());


// Rate limiter
const limiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 100,

    message: {
        success: false,
        message: "Too many requests, try again later."
    }

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


const db = mysql.createPool({

    host: process.env.DB_HOST,

    user: process.env.DB_USER,

    password: process.env.DB_PASSWORD,

    database: process.env.DB_NAME,

    port: Number(process.env.DB_PORT),

    waitForConnections: true,

    connectionLimit: 10,

    maxIdle: 10,

    idleTimeout: 60000,

    queueLimit: 0,

    enableKeepAlive: true,

    keepAliveInitialDelay: 0

});


// Test MySQL Connection

db.getConnection((err, connection) => {

    if (err) {

        console.error(
            "❌ MySQL Connection Error:",
            err.message
        );

        return;

    }


    console.log("✅ Connected to MySQL");


    connection.ping((pingErr) => {

        if (pingErr) {

            console.error(
                "❌ MySQL Ping Failed:",
                pingErr.message
            );

        } else {

            console.log(
                "✅ MySQL Ping Successful"
            );

        }

    });


    connection.release();

});


// Handle MySQL errors

db.on("error", (err) => {

    console.error(
        "❌ MySQL Pool Error:",
        err.message
    );

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
    console.log("==================================");


    try {

        // ======================================
        // Get request data
        // ======================================

        const {
            amount,
            currency,
            name,
            email,
            phone
        } = req.body;


        console.log("Amount:", amount);
        console.log("Currency:", currency);
        console.log("Email:", email);


        // ======================================
        // Validate request
        // ======================================

        if (!amount || Number(amount) < 500) {

            return res.status(400).json({

                success: false,

                message:
                    "Minimum deposit is KES 500."

            });

        }


        if (Number(amount) > 250000) {

            return res.status(400).json({

                success: false,

                message:
                    "Maximum deposit is KES 250,000."

            });

        }


        if (!email) {

            return res.status(400).json({

                success: false,

                message:
                    "Email is required."

            });

        }


        if (!phone) {

            return res.status(400).json({

                success: false,

                message:
                    "Phone number is required."

            });

        }


        // ======================================
        // Check Pesapal credentials
        // ======================================

        if (
            !process.env.PESAPAL_CONSUMER_KEY ||
            !process.env.PESAPAL_CONSUMER_SECRET
        ) {

            console.error(
                "❌ Pesapal credentials are missing."
            );

            return res.status(500).json({

                success: false,

                message:
                    "Pesapal is not configured on the server."

            });

        }


        // ======================================
        // Get Pesapal Access Token
        // ======================================

        console.log(
            "🔐 Requesting Pesapal access token..."
        );


        const auth = await axios.post(

            "https://pay.pesapal.com/v3/api/Auth/RequestToken",

            {

                consumer_key:
                    process.env.PESAPAL_CONSUMER_KEY,

                consumer_secret:
                    process.env.PESAPAL_CONSUMER_SECRET

            },

            {

                headers: {

                    "Content-Type":
                        "application/json",

                    Accept:
                        "application/json"

                },

                timeout: 30000

            }

        );


        const token =
            auth.data?.token;


        if (!token) {

            console.error(
                "❌ Pesapal did not return a token."
            );

            console.error(
                auth.data
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to obtain Pesapal access token."

            });

        }


        console.log(
            "✅ Pesapal token received."
        );


        // ======================================
        // Create merchant reference
        // ======================================

        const merchantReference =
            "WOFX-" + Date.now();


        // ======================================
        // Save pending transaction
        // ======================================

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

                email.trim().toLowerCase(),

                Number(amount),

                currency || "KES",

                "PENDING"

            ],

            (err) => {

                if (err) {

                    console.error(
                        "❌ Transaction Insert Error:",
                        err
                    );

                    // We continue because the
                    // Pesapal request can still be
                    // processed and logged.

                } else {

                    console.log(
                        "✅ Pending transaction saved:",
                        merchantReference
                    );

                }

            }

        );


        // ======================================
        // Pesapal Order
        // ======================================

        const order = {

            id:
                merchantReference,

            currency:
                currency || "KES",

            amount:
                Number(amount),

            description:
                "WeOneFX Wallet Deposit",

            callback_url:
    "https://weonefx-production.up.railway.app/payment-success.html",

            notification_id:
                process.env.PESAPAL_IPN_ID,

            billing_address: {

                email_address:
                    email.trim().toLowerCase(),

                phone_number:
                    phone,

                country_code:
                    "KE",

                first_name:
                    name || "WeOneFX",

                last_name:
                    "Customer"

            }

        };


        console.log(
            "📦 Sending order to Pesapal..."
        );


        // ======================================
        // Submit Pesapal Order
        // ======================================

        const payment = await axios.post(

            "https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest",

            order,

            {

                headers: {

                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json",

                    Accept:
                        "application/json"

                },

                timeout: 30000

            }

        );


        console.log(
            "✅ PESAPAL PAYMENT CREATED"
        );

        console.log(
            "Merchant Reference:",
            merchantReference
        );

        console.log(
            "Pesapal Response:",
            payment.data
        );


        // ======================================
        // Send response to frontend
        // ======================================

        return res.json({

            success: true,

            merchant_reference:
                merchantReference,

            payment:
                payment.data,

            redirect_url:
                payment.data?.redirect_url ||
                payment.data?.redirectUrl ||
                null

        });


    } catch (error) {

        // ======================================
        // Payment Error
        // ======================================

        console.error(
            "❌ PESAPAL PAYMENT ERROR"
        );


        if (error.response) {

            console.error(
                "HTTP Status:",
                error.response.status
            );

            console.error(
                "Pesapal Error:",
                error.response.data
            );


            return res.status(
                error.response.status >= 400
                    ? 500
                    : 500
            ).json({

                success: false,

                message:
                    "Pesapal payment request failed.",

                error:
                    error.response.data

            });

        }


        console.error(
            error.message
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to create Pesapal payment.",

            error:
                error.message

        });

    }

});
// ======================================
// Verify Pesapal Payment & Credit Wallet
// ======================================
app.post("/api/confirm-payment", async (req, res) => {

    const {
        orderTrackingId,
        orderMerchantReference,
        email
    } = req.body;

    if (!orderTrackingId || !email) {
        return res.status(400).json({
            success: false,
            message: "Missing payment information."
        });
    }

    try {

        // ======================================
        // Get Pesapal Access Token
        // ======================================

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
                },
                timeout: 30000
            }
        );

        const token = auth.data?.token;

        if (!token) {
            return res.status(500).json({
                success: false,
                message: "Unable to authenticate with Pesapal."
            });
        }


        // ======================================
        // Get Payment Status From Pesapal
        // ======================================

        const statusResponse = await axios.get(
            `https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                },
                timeout: 30000
            }
        );

        const payment = statusResponse.data;

        console.log(
            "Pesapal payment status:",
            payment.payment_status_description
        );


        // ======================================
        // Payment Not Completed
        // ======================================

        if (
            payment.payment_status_description !== "Completed"
        ) {

            return res.json({
                success: false,
                message: "Payment has not been completed.",
                paymentStatus:
                    payment.payment_status_description || "Unknown"
            });

        }


        // ======================================
        // Find Pending Transaction
        // ======================================

        const findTransaction = (callback) => {

            if (orderMerchantReference) {

                db.query(
                    `SELECT *
                     FROM transactions
                     WHERE merchant_reference=?
                     AND email=?
                     LIMIT 1`,
                    [
                        orderMerchantReference,
                        email.trim().toLowerCase()
                    ],
                    callback
                );

            } else {

                db.query(
                    `SELECT *
                     FROM transactions
                     WHERE email=?
                     AND status='PENDING'
                     ORDER BY id DESC
                     LIMIT 1`,
                    [
                        email.trim().toLowerCase()
                    ],
                    callback
                );

            }

        };


        findTransaction((err, transactionRows) => {

            if (err) {

                console.error(
                    "Transaction lookup error:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Unable to find payment transaction."
                });

            }


            if (transactionRows.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Payment transaction not found."
                });

            }


            const transaction =
                transactionRows[0];


            // ======================================
            // Prevent Double Credit
            // ======================================

            if (transaction.status === "COMPLETED") {

                return res.json({
                    success: true,
                    message: "Payment already credited."
                });

            }


            // ======================================
            // Verify Amount
            // ======================================

            const depositAmount =
                Number(payment.amount);

            const transactionAmount =
                Number(transaction.amount);


            if (
                !depositAmount ||
                depositAmount !== transactionAmount
            ) {

                console.error(
                    "Payment amount mismatch:",
                    {
                        transactionAmount,
                        depositAmount
                    }
                );

                return res.status(400).json({
                    success: false,
                    message: "Payment amount does not match the deposit request."
                });

            }


            // ======================================
            // Find User
            // ======================================

            db.query(
                "SELECT id,balance FROM users WHERE email=?",
                [
                    email.trim().toLowerCase()
                ],
                (err, userRows) => {

                    if (err) {

                        return res.status(500).json({
                            success: false,
                            message: "Unable to find user."
                        });

                    }


                    if (userRows.length === 0) {

                        return res.status(404).json({
                            success: false,
                            message: "User not found."
                        });

                    }


                    const userId =
                        userRows[0].id;

                    const currentBalance =
                        Number(userRows[0].balance || 0);

                    const newBalance =
                        currentBalance + depositAmount;


                    // ======================================
                    // Credit Wallet
                    // ======================================

                    db.query(
                        "UPDATE users SET balance=? WHERE id=?",
                        [
                            newBalance,
                            userId
                        ],
                        async (updateErr) => {

                            if (updateErr) {

                                console.error(
                                    "Wallet update error:",
                                    updateErr
                                );

                                return res.status(500).json({
                                    success: false,
                                    message: "Unable to update wallet."
                                });

                            }


                            // ======================================
                            // Mark Transaction Completed
                            // ======================================

                            db.query(
                                `UPDATE transactions
                                 SET order_tracking_id=?,
                                     status='COMPLETED'
                                 WHERE id=?`,
                                [
                                    orderTrackingId,
                                    transaction.id
                                ],
                                async (transErr) => {

                                    if (transErr) {

                                        console.error(
                                            "Transaction update error:",
                                            transErr
                                        );

                                        return res.status(500).json({
                                            success: false,
                                            message: "Wallet credited but transaction update failed."
                                        });

                                    }


                                    // ======================================
                                    // Save Wallet Transaction
                                    // ======================================

                                    try {

                                        await saveWalletTransaction(
                                            userId,
                                            "deposit",
                                            depositAmount,
                                            payment.currency || transaction.currency || "KES",
                                            "Pesapal",
                                            orderTrackingId,
                                            "Completed"
                                        );


                                        console.log(
                                            "✅ WALLET CREDITED:",
                                            email,
                                            depositAmount
                                        );


                                        return res.json({

                                            success: true,

                                            message:
                                                "Wallet credited successfully.",

                                            balance:
                                                newBalance

                                        });


                                    } catch (walletErr) {

                                        console.error(
                                            "Wallet transaction log error:",
                                            walletErr
                                        );

                                        return res.status(500).json({
                                            success: false,
                                            message: "Payment was completed but wallet transaction logging failed."
                                        });

                                    }

                                }
                            );

                        }
                    );

                }
            );

        });

    } catch (err) {

        console.error(
            "❌ PESAPAL CONFIRM PAYMENT ERROR:",
            err.response?.data || err.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify Pesapal payment.",
            error:
                err.response?.data || err.message
        });

    }

});
// ======================================
// Start Server
// ======================================
app.get("/", (req, res) => {
    res.send("WeOneFX Server is running");
});
app.get("/", (req, res) => {
    res.status(200).send("WeOneFX is alive");
});
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {

    console.log(`🚀 WeOneFX running on port ${PORT}`);

});
