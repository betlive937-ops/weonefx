"use strict";

// ======================================
// DASHBOARD
// ======================================

// Check if user is logged in
const user = getLoggedUser();

if (!user) {

alert("Please login first.");

window.location.href = "login.html";

} else {

// ======================================
// SHOW USER NAME
// ======================================

const welcomeElement =
    document.getElementById("welcome");

if (welcomeElement) {

    welcomeElement.textContent =
        "Welcome, " +
        (user.fullName || "User");

}


// ======================================
// SHOW BALANCE
// ======================================

showBalance("balance");


// ======================================
// REFRESH BALANCE
// ======================================

setInterval(function () {

    showBalance("balance");

}, 1000);

}