// // indexed db
// window.indexedDB = window.indexedDB || window.mozIndexedDb || window.webkitIndexedDB || window.msIndexedDB

// //  Open db and indicate name/version of db
// let request = window.indexedDB.open("BudgetTrackerDB", 1), db, tx, store,index;

// request.onupgradeneeded = e =>{
//   let db = request.result,

//   //setup store (store is the structure of our db)

//   store = db.createObjectStore("budgetStore", {autoIncrement: true}),

//   index = store.createIndex("name", "name", {unique: false});


// }
// // error handler
// request.onerror = e =>{
//   console.log("there was an error:" + e.target.errorCode)
// };


// //success handler

// let nameEl = document.querySelector("#t-name");
// let amountEl = document.querySelector("#t-amount");
// request.onsuccess = e =>{
//   // result of opening db. request comes from variable above.
//   db= request.result
//   tx = db.transaction("budgetStore", "readwrite");
//   store = tx.objectStore("budgetStore");
//   index = store.index("name");

//   db.onerror = e =>{
//     console.log("ERROR" + e.target.errorCode)
//   }

// // let obj = {
// //   name: nameEl.value.toString(), value: amountEl.value, date: new Date().toISOString()
// // }

// //   store.add(obj)



//   // //retrieve data

//   // let q1 = store.get(1);
//   // let qs = index.get("movie");

//   // // async so add on success and return result
//   // q1.onsuccess = () =>{
//   //   console.log(q1.result)
//   //   console.log(q1.result.name)
//   // };

//   // qs.onsuccess = () =>{
//   //   console.log(qs.result.name)
//   // };
//   tx.oncomplete = ()=>{
//     db.close();
//   }
// }

// function saveRecord(record) {
//   // create a transaction on the pending db with readwrite access
//   const transaction = db.transaction(["pending"], "readwrite");

//   // access your pending object store
//   const store = transaction.objectStore("pending");

//   // add record to your store with add method.
//   store.add(record);
// }







let transactions = [];
let myChart;

fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    transactions = data;

    populateTotal();
    populateTable();
    populateChart();
  });

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();
  
  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  })
  .then(data => {
    if (data.errors) {
      errorEl.textContent = "Missing Information";
    }
    else {
      // clear form
      nameEl.value = "";
      amountEl.value = "";
    }
  })
  .catch(err => {
    // fetch failed, so save in indexed db
    saveRecord(transaction);

    // clear form
    nameEl.value = "";
    amountEl.value = "";
  });
}






document.querySelector("#add-btn").onclick = function(event) {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function(e) {

  sendTransaction(false);
};

