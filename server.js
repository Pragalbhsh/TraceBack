const cloudinary = require("cloudinary").v2;
const {CloudinaryStorage}= require("multer-storage-cloudinary");
const multer = require ("multer");

cloudinary.config({
    cloud_name : process.env.CLOUD_NAME,
    api_key : process.env.API_KEY,
    api_secret : process.env.API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary:cloudinary,
    params: {
        folder: "traceback",
        allowed_formats: ["jpg", "png", "jpeg"]
    }
});
const upload = multer({ storage : storage });

const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
    .then(()=>{
        console.log("connected to mongodb");
    })
    .catch((err)=>{
        console.log("error connecting to mongodb" , err);
    });

    const itemsSchema = new mongoose.Schema({
        type: {
            type : String,
            enum : ['lost' , 'found']
        },
        name:String,
        description :String,
        location:String,
        contact :String,
        date:{
            type:Date,
            default:Date.now
        },
        image: String
    });
    const item = mongoose.model("items" , itemsSchema);



const express = require('express');
const app = express();
app.use(express.json());

//homepage
app.get('/', (req,res) => {
    res.send("traceback backend runnning");
});


// add new items
app.post("/items", upload.single("image"), async (req, res) =>{ 
    console.log("route hit");
console.log("file:", req.file);
console.log("body:", req.body);
    try{
        const newItem = new item({
            ...req.body,
            image: req.file ? req.file.path : null 
        });
   const savedItem = await newItem.save(); // save data to mongodb
   const matches =  await item.find({
    type : newItem.type === "lost" ? "found" : "lost",
    location : newItem.location,
    name: newItem.name
    ? { $regex: newItem.name, $options: "i" }
    : undefined
   })
   res.json({
    savedItem,
    possibleMatches: matches
   });
    }catch(err){
        console.log(err);
        res.status(500).send("error saving item");
    }
});


// see all item
app.get("/items", async (req,res) => {
    try{
        const items = await item.find();
        res.json(items);
    }catch(err){
        res.status(500).send("error fetching items");
    }
});


// see all items according to type
app.get("/items/type/:type", async (req,res) => {
    try{
        const items = await item.find({type:req.params.type});
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
app.put('/items/:id' , async(req,res) => {
    try{
        const updatedItem = await item.findByIdAndUpdate(req.params.id, req.body, {new:true});
        res.json(updatedItem);
    }catch(err){
        console.log(err);
        res.status(500).send("error updating item");
    }
});

// delete items
app.delete('/items/:id', async (req,res) =>{
    try{
        await item.findByIdAndDelete(req.params.id);
        res.send("item deleted");
    }catch(err){
        console.log(err);
        res.status(500).send("error deleting item");
    }
});
app.listen(3000, () => {
    console.log("server running on port 3000");
});