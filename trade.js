"use strict";

// ======================================
// WEONEFX TRADING PAGE
// ======================================

const assetSelect = document.getElementById("asset");
const upButton = document.getElementById("upBtn");
const downButton = document.getElementById("downBtn");
const openTable = document.getElementById("openTrades");
const stakeInput = document.getElementById("stake");
const durationSelect = document.getElementById("duration");
const statusElement = document.getElementById("status");
const timerElement = document.getElementById("timer");

// ======================================
// SHOW BALANCE
// ======================================

if (typeof showBalance === "function") {
showBalance("balance");
}

// ======================================
// LOAD LAST SELECTED ASSET
// ======================================

let selectedAsset =
localStorage.getItem("selectedAsset") || "FX:EURUSD";

if (assetSelect) {
assetSelect.value = selectedAsset;
}

// ======================================
// TRADINGVIEW CHART
// ======================================

function loadTradingViewChart() {

if (typeof TradingView === "undefined") {

    console.error(
        "TradingView library was not loaded."
    );

    return;
}

const chartContainer =
    document.getElementById("tradingview_chart");

if (!chartContainer) {

    console.error(
        "TradingView chart container was not found."
    );

    return;
}

new TradingView.widget({

    width: "100%",

    height: 500,

    symbol: selectedAsset,

    interval: "1",

    timezone: "Africa/Nairobi",

    theme: "dark",

    style: "1",

    locale: "en",

    toolbar_bg: "#1f1f1f",

    enable_publishing: false,

    allow_symbol_change: true,

    container_id: "tradingview_chart"

});

}

// ======================================
// LOAD CHART
// ======================================

loadTradingViewChart();

// ======================================
// CHANGE ASSET
// ======================================

if (assetSelect) {

assetSelect.addEventListener(
    "change",
    function () {

        localStorage.setItem(
            "selectedAsset",
            assetSelect.value
        );

        window.location.reload();

    }
);

}

// ======================================
// CLEAR OPEN TRADES MESSAGE
// ======================================

function clearOpenTradesMessage() {

if (
    openTable &&
    openTable.rows.length === 1 &&
    openTable.rows[0].cells.length === 1
) {

    openTable.innerHTML = "";

}

}

// ======================================
// UP BUTTON
// ======================================

if (upButton) {

upButton.addEventListener(
    "click",
    function () {

        startTrade("UP");

    }
);

}

// ======================================
// DOWN BUTTON
// ======================================

if (downButton) {

downButton.addEventListener(
    "click",
    function () {

        startTrade("DOWN");

    }
);

}

// ======================================
// START TRADE
// ======================================

function startTrade(direction) {

const amount =
    Number(
        stakeInput ? stakeInput.value : 0
    );

if (amount <= 0) {

    alert(
        "Enter a valid trade amount."
    );

    return;
}

const user =
    typeof getLoggedUser === "function"
        ? getLoggedUser()
        : null;

if (!user) {

    alert(
        "Please login."
    );

    window.location.href =
        "login.html";

    return;
}

if (user.frozen) {

    alert(
        "Your account has been frozen."
    );

    return;
}

const currentBalance =
    Number(user.balance) || 0;

if (amount > currentBalance) {

    alert(
        "Insufficient balance."
    );

    return;
}

// ======================================
// DEDUCT TRADE STAKE
// ======================================

user.balance =
    currentBalance - amount;

if (
    typeof updateCurrentUser === "function"
) {

    updateCurrentUser(user);

}

if (
    typeof showBalance === "function"
) {

    showBalance("balance");

}

// ======================================
// GET TRADE DURATION
// ======================================

let seconds =
    Number(
        durationSelect
            ? durationSelect.value
            : 60
    );

if (seconds <= 0) {
    seconds = 60;
}

// ======================================
// GET SELECTED ASSET
// ======================================

const asset =
    assetSelect;

const assetName =
    asset &&
    asset.selectedIndex >= 0
        ? asset.options[
            asset.selectedIndex
        ].text
        : "Unknown Asset";

clearOpenTradesMessage();

// ======================================
// CREATE UNIQUE TRADE ID
// ======================================

const tradeId =
    "trade_" +
    Date.now() +
    "_" +
    Math.floor(
        Math.random() * 100000
    );

// ======================================
// ADD OPEN TRADE
// ======================================

if (openTable) {

    openTable.innerHTML += `

        <tr id="${tradeId}">

            <td>${assetName}</td>

            <td>${direction}</td>

            <td>$${amount.toFixed(2)}</td>

            <td id="${tradeId}_time">
                ${seconds}
            </td>

            <td id="${tradeId}_status">
                Running
            </td>

        </tr>

    `;
}

if (statusElement) {

    statusElement.textContent =
        "Trade running (" +
        direction +
        ")";

}

if (timerElement) {

    timerElement.textContent =
        seconds;

}

// ======================================
// COUNTDOWN
// ======================================

const countdown =
    setInterval(
        function () {

            seconds--;

            const timeCell =
                document.getElementById(
                    tradeId + "_time"
                );

            if (timeCell) {

                timeCell.textContent =
                    seconds;

            }

            if (timerElement) {

                timerElement.textContent =
                    seconds;

            }

            // ======================================
            // TRADE FINISHED
            // ======================================

            if (seconds <= 0) {

                clearInterval(countdown);

                // ======================================
                // DETERMINE RESULT
                // ======================================

                const mode =
                    localStorage.getItem(
                        "tradeMode"
                    ) || "RANDOM";

                let win;

                if (mode === "WIN") {

                    win = true;

                } else if (
                    mode === "LOSS"
                ) {

                    win = false;

                } else {

                    win =
                        Math.random() < 0.5;

                }

                const statusCell =
                    document.getElementById(
                        tradeId +
                        "_status"
                    );

                // ======================================
                // WIN
                // ======================================

                if (win) {

                    user.balance =
                        Number(user.balance) +
                        amount +
                        (amount * 0.9);

                    if (
                        typeof addTrade === "function"
                    ) {

                        addTrade(
                            direction,
                            amount,
                            "WIN"
                        );

                    }

                    if (statusCell) {

                        statusCell.textContent =
                            "WIN";

                        statusCell.style.color =
                            "lime";

                    }

                }

                // ======================================
                // LOSS
                // ======================================

                else {

                    if (
                        typeof addTrade === "function"
                    ) {

                        addTrade(
                            direction,
                            amount,
                            "LOSS"
                        );

                    }

                    if (statusCell) {

                        statusCell.textContent =
                            "LOSS";

                        statusCell.style.color =
                            "red";

                    }

                }

                // ======================================
                // SAVE UPDATED BALANCE
                // ======================================

                if (
                    typeof updateCurrentUser === "function"
                ) {

                    updateCurrentUser(user);

                }

                if (
                    typeof showBalance === "function"
                ) {

                    showBalance("balance");

                }

                if (timerElement) {

                    timerElement.textContent =
                        "0";

                }

                if (statusElement) {

                    statusElement.textContent =
                        win
                            ? "Trade finished - WIN"
                            : "Trade finished - LOSS";

                }

                // ======================================
                // REMOVE OPEN TRADE
                // ======================================

                setTimeout(
                    function () {

                        const row =
                            document.getElementById(
                                tradeId
                            );

                        if (row) {
                            row.remove();
                        }

                        if (
                            openTable &&
                            openTable.rows.length === 0
                        ) {

                            openTable.innerHTML =
                                `
                                <tr>
                                    <td colspan="5">
                                        No open trades.
                                    </td>
                                </tr>
                                `;

                        }

                    },
                    3000
                );

            }

        },
        1000
    );

}

// ======================================
// INITIAL PAGE MESSAGE
// ======================================

console.log(
"WeOneFX trading JavaScript loaded successfully."
);