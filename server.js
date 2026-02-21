const express = require('express');
const app = express();
app.use(express.json());

//homepage
app.get('/', (req,res) => {
    res.send("traceback backend runnning");
});

let items  = []; // empty array

// add new items
app.post("/items", (req,res) => { 
   const newitem = req.body; // read data
   items.push(newitem); // add data to array
   res.send("item added");
});

// see all items
app.get("/items", (req,res) => {
res.json(items);
});

//update items
app.put('/items/:id' , (req,res) => {
const id = parseInt(req.params.id) // getting item id from the url
const index = items.findIndex(item => item.id === id); // check index of the item in our array
if(index === -1){
    return res.status(404).send("item not found");
}
item[index] = {... item[index] , ...req.body} // update the item as requested
res.send("item updated");
});


// delete items
app.delete('/items/:id', (req,res) =>{
const id = parseInt(req.params.id);
const lengthBefore = items.length();
items = items.filter(item=>item.id !== id); // filter fucntion doesnt harm the items that dont have the given id and deletes the item with the given id
if(lengthBefore === item.length()){
    return res.status(400).send("item not found");
}
res.send("item deleted");
});

app.listen(3000, () => {
    console.log("server running on port 3000");
});