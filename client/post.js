const form = document.getElementById("post-form");
const submitBtn = document.getElementById("submit-btn");

submitBtn.addEventListener("click", () => {
const formData = new FormData(form);
const name = formData.get("name");
const location = formData.get("location");
const contact = formData.get("contact");

if(!name || !location || !contact) {
    alert("Please fill in all fields");
    return;
}

fetch("http://localhost:3000/items", {
    method: "POST",
    body: formData
})
.then(res => res.json())
.then(data => {
    if ((data.possibleMatches) && (data.possibleMatches.length > 0)) {
        alert(`🎉 ${data.possibleMatches.length} possible match(es) found!`);
    }
    window.location.href = "index.html";
})

});