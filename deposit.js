"use strict";

console.log("✅ Deposit JavaScript loaded.");


// ======================================
// GET ELEMENTS
// ======================================

const pesapalButton =
    document.getElementById("pesapalButton");

const copyWalletButton =
    document.getElementById("copyWalletButton");

const cryptoDepositButton =
    document.getElementById("cryptoDepositButton");

const message =
    document.getElementById("message");

const cryptoMessage =
    document.getElementById("cryptoMessage");


// ======================================
// LOAD BALANCE
// ======================================

if (typeof showBalance === "function") {

    showBalance("balance");

} else {

    console.warn(
        "showBalance() was not found in app.js"
    );

}


// ======================================
// PESAPAL DEPOSIT
// ======================================

async function requestDeposit() {

    console.log("🔥 Pesapal deposit button clicked.");

    const phone =
        document
            .getElementById("phone")
            .value
            .trim();

    const amount =
        Number(
            document
                .getElementById("amount")
                .value
        );


    // ======================================
    // VALIDATE PHONE
    // ======================================

    if (phone === "") {

        message.textContent =
            "Please enter your phone number.";

        return;

    }


    // ======================================
    // VALIDATE AMOUNT
    // ======================================

    if (!amount || amount < 500) {

        message.textContent =
            "Minimum deposit is KES 500.";

        return;

    }


    if (amount > 250000) {

        message.textContent =
            "Maximum deposit is KES 250,000.";

        return;

    }


    // ======================================
    // GET LOGGED USER
    // ======================================

    let currentUser = null;


    if (typeof getLoggedUser === "function") {

        currentUser = getLoggedUser();

    } else {

        try {

            currentUser =
                JSON.parse(
                    localStorage.getItem("loggedUser")
                );

        } catch (error) {

            console.error(
                "Unable to read logged user:",
                error
            );

        }

    }


    // ======================================
    // CHECK LOGIN
    // ======================================

    if (!currentUser) {

        alert("Please login first.");

        window.location.href =
            "login.html";

        return;

    }


    // ======================================
    // CHECK EMAIL
    // ======================================

    if (!currentUser.email) {

        message.textContent =
            "Your account email could not be found. Please login again.";

        return;

    }


    // ======================================
    // DISABLE BUTTON
    // ======================================

    pesapalButton.disabled = true;

    pesapalButton.textContent =
        "Creating Pesapal payment...";

    message.textContent =
        "Connecting to Pesapal...";


    try {


        // ======================================
        // SEND PAYMENT REQUEST
        // ======================================

        const response = await fetch(
            "/api/pay",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    amount: amount,

                    currency: "KES",

                    phone: phone,

                    name:
                        currentUser.fullname ||
                        currentUser.fullName ||
                        "WeOneFX Customer",

                    email:
                        currentUser.email

                })

            }
        );


        console.log(
            "Pesapal HTTP status:",
            response.status
        );


        // ======================================
        // READ RESPONSE
        // ======================================

        let data;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "The server returned an invalid response."
            );

        }


        console.log(
            "Pesapal Response:",
            data
        );


        // ======================================
        // SERVER ERROR
        // ======================================

        if (!response.ok) {

            const serverMessage =
                data.message ||
                data.error ||
                "Unable to create Pesapal payment.";

            message.textContent =
                "❌ " + serverMessage;

            return;

        }


        // ======================================
        // FIND PESAPAL REDIRECT URL
        // ======================================

        const redirectUrl =
            data.redirect_url ||
            data.redirectUrl ||
            data.payment?.redirect_url ||
            data.payment?.redirectUrl;


        // ======================================
        // REDIRECT TO PESAPAL
        // ======================================

        if (redirectUrl) {

            message.textContent =
                "✅ Payment created. Redirecting to Pesapal...";

            window.location.href =
                redirectUrl;

            return;

        }


        // ======================================
        // NO REDIRECT URL
        // ======================================

        message.textContent =
            "Pesapal responded, but no payment URL was returned.";

        console.error(
            "No Pesapal redirect URL:",
            data
        );


    } catch (error) {


        console.error(
            "❌ Pesapal request failed:",
            error
        );


        message.textContent =
            "❌ Unable to connect to the WeOneFX payment server.";

    } finally {


        // ======================================
        // ENABLE BUTTON AGAIN
        // ======================================

        pesapalButton.disabled = false;

        pesapalButton.textContent =
            "💳 Deposit via Pesapal";

    }

}


// ======================================
// COPY WALLET ADDRESS
// ======================================

async function copyWallet() {

    const wallet =
        document.getElementById(
            "walletAddress"
        );


    try {


        await navigator.clipboard.writeText(
            wallet.value
        );


        cryptoMessage.textContent =
            "✅ Wallet address copied.";


    } catch (error) {


        // Fallback for browsers
        wallet.select();

        wallet.setSelectionRange(
            0,
            99999
        );


        document.execCommand("copy");


        cryptoMessage.textContent =
            "✅ Wallet address copied.";

    }

}


// ======================================
// CRYPTO DEPOSIT SUBMISSION
// ======================================

function submitCryptoDeposit() {

    const txid =
        document
            .getElementById("txid")
            .value
            .trim();


    if (txid === "") {

        cryptoMessage.textContent =
            "Please paste your Transaction Hash (TXID).";

        return;

    }


    const depositData = {

        wallet:
            "0x1a81d4765c26f932726d345dbe0cf08d000cb628",

        txid: txid,

        status:
            "Pending Verification",

        date:
            new Date().toLocaleString()

    };


    localStorage.setItem(
        "cryptoDeposit",
        JSON.stringify(depositData)
    );


    cryptoMessage.textContent =
        "✅ Your crypto deposit request has been submitted and is awaiting verification.";

}


// ======================================
// BUTTON EVENT LISTENERS
// ======================================

if (pesapalButton) {

    pesapalButton.addEventListener(
        "click",
        requestDeposit
    );

}


if (copyWalletButton) {

    copyWalletButton.addEventListener(
        "click",
        copyWallet
    );

}


if (cryptoDepositButton) {

    cryptoDepositButton.addEventListener(
        "click",
        submitCryptoDeposit
    );

}


console.log(
    "✅ Deposit page event listeners ready."
);