// ======================================
// WeOneFX Registration
// ======================================

const API_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://weonefx-production.up.railway.app";

console.log("✅ WeOneFX Registration JavaScript loaded.");


// ======================================
// REGISTER USER
// ======================================

async function registerUser() {

    const button =
        document.getElementById("registerButton");

    const fullName =
        document.getElementById("fullname").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;


    // ======================================
    // VALIDATE FIELDS
    // ======================================

    if (
        fullName === "" ||
        email === "" ||
        password === ""
    ) {

        alert("Please fill in all fields.");

        return;
    }


    button.innerText = "Creating account...";
    button.disabled = true;


    try {

        console.log(
            "Connecting to WeOneFX backend..."
        );


        const response =
            await fetch(
                API_URL + "/api/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        fullname:
                            fullName,

                        email:
                            email,

                        password:
                            password

                    })
                }
            );


        console.log(
            "Server response:",
            response.status
        );


        const data =
            await response.json();


        console.log(
            "Registration response:",
            data
        );


        // ======================================
        // SUCCESS
        // ======================================

        if (
            response.ok &&
            data.success
        ) {

            alert(
                "Registration successful! You can now log in."
            );

            window.location.href =
                "login.html";

            return;
        }


        // ======================================
        // SERVER ERROR
        // ======================================

        alert(
            data.message ||
            "Registration failed."
        );


    } catch (error) {

        console.error(
            "REGISTRATION ERROR:",
            error
        );


        alert(
            "Unable to connect to WeOneFX server."
        );


    } finally {

        button.innerText =
            "Create Account";

        button.disabled =
            false;

    }

}
document
    .getElementById("registerButton")
    .addEventListener(
        "click",
        registerUser
    );