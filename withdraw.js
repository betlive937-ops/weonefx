"use strict";

// ======================================
// WITHDRAW PAGE
// ======================================

// ======================================
// SHOW CURRENT BALANCE
// ======================================

showBalance("balance");

// ======================================
// WITHDRAW BUTTON
// ======================================

const withdrawButton =
document.getElementById("withdrawButton");

if (withdrawButton) {

withdrawButton.addEventListener(
    "click",
    requestWithdrawal
);

}

// ======================================
// WITHDRAWAL REQUEST
// ======================================

function requestWithdrawal() {

const phone =
    document.getElementById("phone").value.trim();

const amount =
    parseFloat(
        document.getElementById("amount").value
    );

const message =
    document.getElementById("message");


// ======================================
// PHONE VALIDATION
// ======================================

if (phone === "") {

    message.textContent =
        "Please enter your phone number.";

    return;

}


// ======================================
// AMOUNT VALIDATION
// ======================================

if (isNaN(amount)) {

    message.textContent =
        "Please enter a valid withdrawal amount.";

    return;

}


if (amount < 2000) {

    message.textContent =
        "Minimum withdrawal is KES 2,000.";

    return;

}


if (amount > 100000) {

    message.textContent =
        "Maximum withdrawal is KES 100,000.";

    return;

}


// ======================================
// GET USER
// ======================================

const user =
    getLoggedUser();


if (!user) {

    alert("Please login first.");

    window.location.href =
        "login.html";

    return;

}


// ======================================
// CHECK FROZEN ACCOUNT
// ======================================

if (user.frozen) {

    alert(
        "Your account has been frozen."
    );

    return;

}


// ======================================
// CHECK BALANCE
// ======================================

const balance =
    Number(user.balance);


if (amount > balance) {

    message.textContent =
        "Insufficient wallet balance.";

    return;

}


// ======================================
// SAVE WITHDRAWAL REQUEST
// ======================================

let withdrawals =
    JSON.parse(
        localStorage.getItem("withdrawals")
    ) || [];


withdrawals.push({

    fullName:
        user.fullName ||
        user.fullname,

    email:
        user.email,

    phone:
        phone,

    amount:
        amount,

    status:
        "Pending",

    date:
        new Date().toLocaleString()

});


localStorage.setItem(
    "withdrawals",
    JSON.stringify(withdrawals)
);


// ======================================
// SUCCESS MESSAGE
// ======================================

message.textContent =
    "✅ Withdrawal request submitted successfully. Waiting for admin approval.";


document.getElementById("phone").value =
    "";

document.getElementById("amount").value =
    "";


// ======================================
// RETURN TO DASHBOARD
// ======================================

setTimeout(function () {

    window.location.href =
        "dashboard.html";

}, 1500);

}