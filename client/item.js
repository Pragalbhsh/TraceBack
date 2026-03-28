const detail = document.getElementById("item-detail");

// get id from URL
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
console.log("id:", id);

// fetch that specific item
fetch(`http://localhost:3000/items/${id}`)
.then(res => res.json())
.then(item => {
    detail.innerHTML = `
        <button onclick="window.location.href='index.html'">← Back</button>
        <span class="badge ${item.type}">${item.type ? item.type.toUpperCase() : "?"}</span>
        <h2>${item.name || "Unnamed item"}</h2>
        <p>📍 ${item.location || "No location"}</p>
        <p>📅 ${new Date(item.date).toLocaleDateString()}</p>
        <p>${item.description || ""}</p>
        <div class="contact-box">
            <h4>Contact</h4>
            <p>${item.contact || "No contact info"}</p>
        </div>
        ${item.image ? `<img src="${item.image}" alt="${item.name}"/>` : ""}
    `;
});