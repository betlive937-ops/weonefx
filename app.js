// ===============================
// WeOneFX App Functions
// ===============================

// Get logged in user
function getLoggedUser() {
    return JSON.parse(localStorage.getItem("loggedUser"));
}

// Save logged in user
function saveLoggedUser(user) {
    localStorage.setItem("loggedUser", JSON.stringify(user));
}

// Get all users
function getUsers() {
    return JSON.parse(localStorage.getItem("users")) || [];
}

// Save all users
function saveUsers(users) {
    localStorage.setItem("users", JSON.stringify(users));
}

// Update current user
function updateCurrentUser(user) {

    let users = getUsers();

    let index = users.findIndex(function(u) {
        return u.email === user.email;
    });

    if (index !== -1) {
        users[index] = user;
    }

    saveUsers(users);
    saveLoggedUser(user);
}
    function updateCurrentUser(user) {

    let users = getUsers();

    let index = users.findIndex(function(u) {
        return u.email === user.email;
    });

    if (index !== -1) {
        users[index] = user;
    }

    saveUsers(users);
    saveLoggedUser(user);

}


// Show balance
function showBalance(elementId) {

    let user = getLoggedUser();

    if (!user) return;

    document.getElementById(elementId).innerHTML =
        Number(user.balance || 0).toFixed(2);

}
// ===============================
// Trade History Functions
// ===============================

function getTradeHistory() {

    let user = getLoggedUser();

    if (!user) return [];

    return JSON.parse(localStorage.getItem("history_" + user.email)) || [];

}

function saveTradeHistory(history) {

    let user = getLoggedUser();

    if (!user) return;

    localStorage.setItem(
        "history_" + user.email,
        JSON.stringify(history)
    );

}

function addTrade(direction, amount, result) {

    let history = getTradeHistory();

    let trade = {
        date: new Date().toLocaleString(),
        direction: direction,
        amount: amount,
        result: result
    };

    history.unshift(trade);

    saveTradeHistory(history);

    let allTrades = JSON.parse(localStorage.getItem("trades")) || [];

    allTrades.unshift(trade);

    localStorage.setItem("trades", JSON.stringify(allTrades));
}

function loadTradeHistory(tableId) {

    let table = document.getElementById(tableId);

    if (!table) return;

    let history = getTradeHistory();

    table.innerHTML = "";

    history.forEach(function(trade){

        table.innerHTML += `
        <tr>
            <td>${trade.date}</td>
            <td>${trade.direction}</td>
            <td>$${Number(trade.amount).toFixed(2)}</td>
            <td>${trade.result}</td>
        </tr>
        `;

    });

}

function clearHistory() {

    let user = getLoggedUser();

    if (!user) return;

    localStorage.removeItem("history_" + user.email);

}

function exportHistoryCSV() {

    let history = getTradeHistory();

    let csv = "Date,Direction,Amount,Result\n";

    history.forEach(function(t){

        csv += `${t.date},${t.direction},${t.amount},${t.result}\n`;

    });

    let blob = new Blob([csv], {type:"text/csv"});

    let a = document.createElement("a");

    a.href = URL.createObjectURL(blob);

    a.download = "trade_history.csv";

    a.click();

}
// ===============================
// Trading Functions
// ===============================

function updateBalance(amount){

    let user = getLoggedUser();

    if(!user) return;

    user.balance += amount;

    updateCurrentUser(user);

}

function executeTrade(direction, amount){

    amount = Number(amount);

    let user = getLoggedUser();

    if(!user) return false;

    if(amount <= 0){
        alert("Enter a valid amount.");
        return false;
    }

    if(amount > user.balance){
        alert("Insufficient balance.");
        return false;
    }

    // Deduct stake
    user.balance -= amount;

    // Random result (demo)
    let win = Math.random() > 0.5;

    if(win){

        let profit = amount * 1.8;

        user.balance += profit;

        addTrade(direction, amount, "WIN");

if (!user.trades) {
    user.trades = [];
}

user.trades.push({
    time: new Date().toLocaleString(),
    direction: direction,
    amount: amount,
    result: "WIN"
});

        alert("🎉 You WON $" + profit.toFixed(2));

    }else{

        addTrade(direction, amount, "LOSS");

if (!user.trades) {
    user.trades = [];
}

user.trades.push({
    time: new Date().toLocaleString(),
    direction: direction,
    amount: amount,
    result: "LOSS"
});

        alert("❌ You LOST");

    }

    updateCurrentUser(user);

    return win;

}

// ===============================
// Admin Functions
// ===============================

function loadAdmin() {

    let users = getUsers();

    let table = document.getElementById("usersTable");
    let totalUsers = document.getElementById("totalUsers");
    let totalBalance = document.getElementById("totalBalance");
    let totalTrades = document.getElementById("totalTrades");

    if (table) table.innerHTML = "";

    let balance = 0;

    let allTrades = JSON.parse(localStorage.getItem("trades")) || [];

    users.forEach(function(user, index) {

        balance += Number(user.balance || 0);

        if (table) {

            table.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td>$${Number(user.balance || 0).toFixed(2)}</td>
                <td>
                    <button onclick="addFunds(${index})">+$100</button>
                    <button onclick="removeFunds(${index})">-$100</button>
                    <button onclick="deleteUser(${index})">Delete</button>
                </td>
            </tr>
            `;

        }

    });

    if (totalUsers) {
        totalUsers.innerHTML = users.length;
    }

    if (totalBalance) {
        totalBalance.innerHTML = "$" + balance.toFixed(2);
    }

    if (totalTrades) {
        totalTrades.innerHTML = allTrades.length;
    }

}
// ===============================
// Deposit Function
// ===============================
function deposit(amount) {

    let user = getLoggedUser();

    if (!user) {
        alert("Please login again.");
        window.location.href = "login.html";
        return false;
    }

    amount = Number(amount);

    user.balance += amount;

    updateCurrentUser(user);

    return true;
}

// ===============================
// Withdraw Function
// ===============================
function withdraw(amount) {

    let user = getLoggedUser();

    if (!user) {
        alert("Please login again.");
        window.location.href = "login.html";
        return false;
    }

    amount = Number(amount);

    if (user.balance < amount) {
        return false;
    }

    user.balance -= amount;

    updateCurrentUser(user);

    return true;
}
// ===============================
// Admin Withdrawal Functions
// ===============================

function approveWithdrawal(index){

    let withdrawals = JSON.parse(localStorage.getItem("withdrawals")) || [];
    let users = getUsers();

    if(withdrawals[index].status !== "Pending"){
        alert("This request has already been processed.");
        return;
    }

    let email = withdrawals[index].email;

    let userIndex = users.findIndex(function(u){
        return u.email === email;
    });

    if(userIndex !== -1){

        users[userIndex].balance -= Number(withdrawals[index].amount);

        saveUsers(users);

        let logged = getLoggedUser();

        if(logged && logged.email === email){
            logged.balance = users[userIndex].balance;
            saveLoggedUser(logged);
        }

    }

    withdrawals[index].status = "Approved";

    localStorage.setItem("withdrawals", JSON.stringify(withdrawals));

    alert("Withdrawal approved.");

    loadWithdrawals();

}

function rejectWithdrawal(index){

    let withdrawals = JSON.parse(localStorage.getItem("withdrawals")) || [];

    if(withdrawals[index].status !== "Pending"){
        alert("This request has already been processed.");
        return;
    }

    withdrawals[index].status = "Rejected";

    localStorage.setItem("withdrawals", JSON.stringify(withdrawals));

    alert("Withdrawal rejected.");

    loadWithdrawals();

}
// ===============================
// Admin Deposit Functions
// ===============================

function approveDeposit(index){

    let deposits = JSON.parse(localStorage.getItem("deposits")) || [];
    let users = getUsers();

    if(deposits[index].status !== "Pending"){
        alert("This request has already been processed.");
        return;
    }

    let email = deposits[index].email;

    let userIndex = users.findIndex(function(u){
        return u.email === email;
    });

    if(userIndex !== -1){

        users[userIndex].balance += Number(deposits[index].amount);

        saveUsers(users);

        let logged = getLoggedUser();

        if(logged && logged.email === email){
            logged.balance = users[userIndex].balance;
            saveLoggedUser(logged);
        }

    }

    deposits[index].status = "Approved";

    localStorage.setItem("deposits", JSON.stringify(deposits));

    alert("Deposit approved.");

    loadDeposits();

}

function rejectDeposit(index){

    let deposits = JSON.parse(localStorage.getItem("deposits")) || [];

    if(deposits[index].status !== "Pending"){
        alert("This request has already been processed.");
        return;
    }

    deposits[index].status = "Rejected";

    localStorage.setItem("deposits", JSON.stringify(deposits));

    alert("Deposit rejected.");

    loadDeposits();

}
// ===============================
// Admin User Management
// ===============================

function loadUsers(){

    let users = getUsers();

    let search = "";

    let searchBox = document.getElementById("search");

    if(searchBox){
        search = searchBox.value.toLowerCase();
    }

    let table = document.getElementById("usersTable");

    if(!table) return;

    table.innerHTML = "";

    users.forEach(function(user,index){

        let name = (user.fullName || "").toLowerCase();
        let email = (user.email || "").toLowerCase();

        if(name.includes(search) || email.includes(search)){

            table.innerHTML += `
            <tr>
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td>$${Number(user.balance || 0).toFixed(2)}</td>
                <td>${user.frozen ? "❄️ Frozen" : "✅ Active"}</td>
               <td>
    <button onclick="editBalance(${index})">
        Edit Balance
    </button>

    <button onclick="toggleUser(${index})">
        ${user.frozen ? "Unfreeze" : "Freeze"}
    </button>

    <button onclick="deleteUser(${index})">
        Delete
    </button>
</td>
            </tr>
            `;
        }

    });

}

function toggleUser(index){

    let users = getUsers();

    users[index].frozen = !users[index].frozen;

    saveUsers(users);

    loadUsers();

}

function deleteUser(index){

    if(!confirm("Delete this user?")){
        return;
    }

    let users = getUsers();

    users.splice(index,1);

    saveUsers(users);

    loadUsers();

}
function editBalance(index){

    let users = getUsers();

    let amount = prompt(
        "Enter new balance for " + users[index].fullName,
        users[index].balance
    );

    if(amount === null){
        return;
    }

    amount = Number(amount);

    if(isNaN(amount) || amount < 0){
        alert("Invalid balance.");
        return;
    }

    users[index].balance = amount;

    saveUsers(users);

    // Update logged-in user if it's the same account
    let loggedUser = getLoggedUser();

    if(loggedUser && loggedUser.email === users[index].email){
        saveLoggedUser(users[index]);
    }

    alert("Balance updated successfully.");

    loadUsers();

}
function setTradeMode(mode){

    localStorage.setItem("tradeMode", mode);

    alert("Trade mode set to: " + mode);

}
// ===============================
// Notification Functions
// ===============================

function addNotification(email, message){

    let notifications =
    JSON.parse(localStorage.getItem("notifications_" + email)) || [];

    notifications.push({

        message: message,

        date: new Date().toLocaleString()

    });

    localStorage.setItem(
        "notifications_" + email,
        JSON.stringify(notifications)
    );

}