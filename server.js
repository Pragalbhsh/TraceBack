require('dotenv').config();
const cloudinary = require("cloudinary").v2;
const {CloudinaryStorage}= require("multer-storage-cloudinary");
const multer = require ("multer");


// cloudinary implementation
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



// mongodb schema
const mongoose = require('mongoose');
console.log("MONGO_URI:", process.env.MONGO_URI);
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
        image:String
    });
    const item = mongoose.model("items" , itemsSchema);


// crud operations + matching logic
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

// matching logic
   const savedItem = await newItem.save(); // save data to mongodb
   const allItems = await item.find({
    type : newItem.type === "lost" ? "found" : "lost"
   });


    const scoredMatches = allItems.map(i => {
    let score = 0;
// if new items location is found the same in any of the already existing items :
    if(i.location === newItem.location) score += 5;
    return { ...i.toObject() ,score };
   });

    scoredMatches.sort((a,b) => b.score-a.score);
    res.json({
      savedItem,
      possibleMatches :scoredMatches
    });

    }catch(err){
        console.error("ERR message:", err?.message);
        console.error("ERR name:", err?.name);
        console.error("ERR stack:", err?.stack);
        console.error("ERR raw:", err);
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
app.use((err, req, res, next) => {
    console.error("GLOBAL ERR message:", err?.message);
    console.error("GLOBAL ERR name:", err?.name);
    console.error("GLOBAL ERR stack:", err?.stack);
    console.error("GLOBAL ERR raw:", err);
    res.status(500).json({ error: err?.message || "Upload failed" });
  });
  
app.listen(3000, () => {
    console.log("server running on port 3000");
});