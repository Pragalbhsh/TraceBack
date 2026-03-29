const grid = document.querySelector(".items-grid");
const filters = document.querySelector(".filters");

let allItems = []; // store all items globally so filters can use them

const reportBtn = document.getElementById("report-btn");
reportBtn.addEventListener("click", () => {
    window.location.href = "post.html";
});

// fetch all items from backend
fetch("http://localhost:3000/items")
.then(res => res.json())
.then(data => {
    allItems = data;
    displayItems(allItems);
});

// display items on the page
function displayItems(items) {
    grid.innerHTML = ""; // clear the grid first

    if(items.length === 0) {
        grid.innerHTML = "<p>No items found.</p>";
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        card.classList.add("item");
        card.innerHTML = `
            <span class="badge ${item.type}">${item.type ? item.type.toUpperCase() : "?"}</span>
            <h3>${item.name || "Unnamed item"}</h3>
            <p>📍 ${item.location || "No location"}</p>
            <p class="desc">${item.description ? item.description.slice(0,60) + "..." : ""}</p>
        `;
        card.onclick = () => {
            window.location.href = `item.html?id=${item._id}`;
        };
        grid.appendChild(card);
    });
}

// filter buttons
filters.addEventListener("click", (e) => {
    if(e.target.tagName !== "BUTTON") return;
    const type = e.target.innerText.toLowerCase();
    if(type === "all") {
        displayItems(allItems);
    } else {
        displayItems(allItems.filter(i => i.type === type));
    }
});
