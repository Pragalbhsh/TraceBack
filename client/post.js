const form = document.getElementById("post-form");
const submitBtn = document.getElementById("submit-btn");

submitBtn.addEventListener("click", () => {
const formData = new FormData(form);
fetch("http://localhost:3000/items", {
    method: "POST",
    body: formData
})
.then(res => res.json())
.then(data => {
    window.location.href = "index.html";
})

});