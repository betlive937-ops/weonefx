// ======================================
// WeOneFX Login
// ======================================

const API_URL =
    "https://weonefx-production.up.railway.app";


// ======================================
// Login Function
// ======================================

async function loginUser() {

    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");

    const loginButton =
        document.getElementById("loginButton");

    const loginMessage =
        document.getElementById("loginMessage");


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    loginMessage.innerHTML = "";


    // ======================================
    // Validate
    // ======================================

    if (!email || !password) {

        loginMessage.innerHTML =
            "Please enter your email and password.";

        return;

    }


    loginButton.disabled = true;

    loginButton.innerText =
        "Logging in...";


    try {

        console.log(
            "Connecting to WeOneFX backend..."
        );


        const response = await fetch(

            API_URL + "/api/login",

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"

                },

                body: JSON.stringify({

                    email: email,

                    password: password

                })

            }

        );


        console.log(
            "Server response:",
            response.status
        );


        // ======================================
        // Read response
        // ======================================

        const data =
            await response.json();


        console.log(
            "Login response:",
            data
        );


        // ======================================
        // Login failed
        // ======================================

        if (!data.success) {

            loginMessage.innerHTML =
                data.message ||
                "Invalid email or password.";

            loginButton.disabled = false;

            loginButton.innerText =
                "Login";

            return;

        }


        // ======================================
        // JWT check
        // ======================================

        if (!data.token) {

            loginMessage.innerHTML =
                "Login succeeded, but no JWT token was received.";

            loginButton.disabled = false;

            loginButton.innerText =
                "Login";

            return;

        }


        // ======================================
        // Save JWT
        // ======================================

        localStorage.setItem(
            "token",
            data.token
        );


        // ======================================
        // Save user
        // ======================================

        if (data.user) {

            localStorage.setItem(

                "loggedUser",

                JSON.stringify(data.user)

            );

        }


        console.log(
            "JWT saved successfully."
        );


        loginMessage.innerHTML =
            "✅ Login successful. Opening dashboard...";


        // ======================================
        // Open dashboard
        // ======================================

        setTimeout(function () {

            window.location.href =
                "dashboard.html";

        }, 500);


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        loginMessage.innerHTML =
            "❌ Unable to connect to the WeOneFX server.";


        loginButton.disabled = false;

        loginButton.innerText =
            "Login";

    }

}


// ======================================
// Login Button
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const loginButton =
            document.getElementById("loginButton");


        if (!loginButton) {

            console.error(
                "Login button not found."
            );

            return;

        }


        loginButton.addEventListener(
            "click",
            loginUser
        );


        console.log(
            "✅ Login JavaScript loaded."
        );

    }
);