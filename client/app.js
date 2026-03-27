const grid = document.querySelector(".items-grid");

const filters = document.querySelector(".filters");

fetch("http://localhost:3000/items")
.then( res => res.json())
.then( data => {
    console.log(data);
})