"use strict";

console.log("✅ Payment verification JavaScript loaded.");


// ======================================
// GET PESAPAL PARAMETERS
// ======================================

const params =
    new URLSearchParams(window.location.search);

const trackingId =
    params.get("OrderTrackingId") ||
    params.get("orderTrackingId") ||
    params.get("ordertrackingid");

const merchantReference =
    params.get("OrderMerchantReference") ||
    params.get("orderMerchantReference") ||
    params.get("OrderMerchantRef") ||
    params.get("orderMerchantRef");

const statusElement =
    document.getElementById("status");

const dashboardButton =
    document.getElementById("dashboardButton");


// ======================================
// DASHBOARD BUTTON
// ======================================

if (dashboardButton) {

    dashboardButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "dashboard.html";

        }
    );

}


// ======================================
// DEBUG INFORMATION
// ======================================

console.log(
    "Current URL:",
    window.location.href
);

console.log(
    "Order Tracking ID:",
    trackingId
);

console.log(
    "Merchant Reference:",
    merchantReference
);


// ======================================
// GET LOGGED-IN USER
// ======================================

let currentUser = null;

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


// ======================================
// CHECK USER
// ======================================

if (!currentUser || !currentUser.email) {

    statusElement.innerHTML =
        "❌ Your login session could not be found.<br><br>" +
        "Please login again.";

}


// ======================================
// CHECK TRACKING ID
// ======================================

else if (!trackingId) {

    statusElement.innerHTML =
        "⚠️ Pesapal did not return an Order Tracking ID.<br><br>" +
        "The payment cannot be verified.";

    console.error(
        "❌ No OrderTrackingId received."
    );

}


// ======================================
// VERIFY PAYMENT
// ======================================

else {

    statusElement.innerHTML =
        "🔄 Contacting WeOneFX payment server...";


    fetch(
        "/api/confirm-payment",
        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json"

            },

            body: JSON.stringify({

                orderTrackingId:
                    trackingId,

                email:
                    currentUser.email

            })

        }
    )

    .then(async response => {

        let data;

        try {

            data =
                await response.json();

        } catch (error) {

            throw new Error(
                "The payment server returned an invalid response."
            );

        }

        console.log(
            "WeOneFX confirmation response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Payment verification failed."
            );

        }

        return data;

    })


    // ======================================
    // HANDLE PAYMENT RESULT
    // ======================================

    .then(data => {

        if (data.success === true) {

            statusElement.innerHTML =
                "✅ <strong>Payment Verified Successfully!</strong>" +
                "<br><br>" +
                "Your WeOneFX wallet has been credited.";


            if (
                typeof data.balance !== "undefined"
            ) {

                currentUser.balance =
                    Number(data.balance);

                localStorage.setItem(
                    "loggedUser",
                    JSON.stringify(currentUser)
                );

                console.log(
                    "New wallet balance:",
                    data.balance
                );

            }

        }

        else {

            const payment =
                data.payment || {};

            const paymentStatus =
                data.paymentStatus ||
                payment.payment_status_description ||
                "Not completed";

            statusElement.innerHTML =
                "⚠️ <strong>Payment has not been completed.</strong>" +
                "<br><br>" +
                "Payment status: " +
                paymentStatus +
                "<br><br>" +
                "If you have already paid, please wait a moment and try again.";

        }

    })


    // ======================================
    // ERROR
    // ======================================

    .catch(error => {

        console.error(
            "❌ Payment verification error:",
            error
        );

        statusElement.innerHTML =
            "❌ <strong>Unable to verify your payment.</strong>" +
            "<br><br>" +
            error.message +
            "<br><br>" +
            "Please try again.";

    });

}