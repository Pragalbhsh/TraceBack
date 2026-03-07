const mongoose = require('mongoose');
mongoose.connect("mongodb+srv://tracebackuser:traceback123@cluster0.5vaf3gr.mongodb.net/?appName=Cluster0")
    .then(()=>{
        console.log("connected to mongodb");
    })
    .catch((err)=>{
        console.log("error connecting to mongodb" , err);
    });

    const itemsSchema = new mongoose.Schema({
        name:String,
        description :String,
        location:String,
        contact :String,
        date:Date
    });
    const item = mongoose.model("items" , itemsSchema);



const express = require('express');
const app = express();
app.use(express.json());

//homepage
app.get('/', (req,res) => {
    res.send("traceback backend runnning");
});

let items  = []; // empty array

// add new items
app.post("/items", async(req,res) => { 
    try{
   const newItem = new item(req.body);
   const savedItem = await newItem.save(); // save data to mongodb
   res.json(savedItem);
    }catch(err){
        console.log(err);
        res.status(500).send("error saving item");
    }
});

// see all items
app.get("/items", async (req,res) => {
    try{
        const items = await item.find();
        res.json(items);
    }catch(err){
        console.log(err);
        res.status(500).send("error fetching items");
    }
});


// see a single item

app.get("/items/:id", async (req,res) => {
    try{
        const founditem = await item.findById(req.params.id);
        res.json(founditem);
    }catch(err){
        console.log(err);
        res.status(500).send("error fetching item");
    }
});

//update items
app.put('/items/:id' , (req,res) => {
const id = parseInt(req.params.id) // getting item id from the url
const index = items.findIndex(items => items.id === id); // check index of the item in our array
if(index === -1){
    return res.status(404).send("item not found");
}
items[index] = { ...items[index] , ...req.body} // update the item as requested
res.send("item updated");
});


// delete items
app.delete('/items/:id', (req,res) =>{
const id = parseInt(req.params.id);
const lengthBefore = items.length;
items = items.filter(i=>i.id !== id); // filter fucntion doesnt harm the items that dont have the given id and deletes the item with the given id
if(lengthBefore === items.length){
    return res.status(400).send("item not found");
}
res.send("item deleted");
});

app.listen(3000, () => {
    console.log("server running on port 3000");
});