// crud operations + matching logic
const express = require('express');
const router = express.Router();  // 👈 like a mini app just for routes
const Item = require('../models/items');
const upload = require('../middleware/upload');

//homepage
router.get("/", async (req, res) => {
    try{
    const items = await Item.find();
    res.json(items);
    }
    catch(err) {
    res.status(500).send("error fetching items");
    }
});
module.exports = router;

// router.get("/items/:id", async (req,res) => {
//     try{
//         const founditem = await item.findById(req.params.id);
//         res.json(founditem);
//     }catch(err){
//         console.log(err);
//         res.status(500).send("error fetching item");
//     }
// });


// // add new items
// router.post("/items", upload.single("image"), async (req, res) =>{ 
//     console.log("route hit");
// console.log("file:", req.file);
// console.log("body:", req.body);
//     try{
//         const newItem = new item({
//             ...req.body,
//             image: req.file ? req.file.path : null 
//         });

// // matching logic
//    const oppositeType = newItem.type === "lost" ? "found" : "lost" // save data to mongodb
//    const allItems = await item.find({ type: oppositeType
//    })
    
   


//     const scoredMatches = allItems.map(i => {
//     let score = 0;
// // if new items location is found the same in any of the already existing items :
//     if(i.location === newItem.location) score += 5;
   
// // if same name is found :
//    const newName = newItem.name?.toLowerCase() || " ";
//    const existingName = i.Item?.toLowerCase() || " ";
//    if(newName && existingName &&
//     (newName.includes(existingName) || existingName.includes(newName)))
//     score += 3;

// // if same description is found
//    const newDesc = newItem.description?.toLowerCase().split(" ") || [];
//    const existDesc = i.description?.toLowerCase().split(" ") || [];
//    const commonWords = newDesc.filter(word =>
//     word.length > 3 && existDesc.includes(word)  // ignore tiny words like "a", "the"
// );
//    score += commonWords.length * 2;
//    return { ...i.toObject(), score };
// });
//    // sorting
//    const topMatches = scoredMatches.filter(i => i.score > 0).sort((a,b) => b.score - a.score)

//    res.json({
//     savedItem,
//     possibleMatches: topMatches
// });

// } catch (err) {
//     console.error(err);
//     res.status(500).send("error saving item");
// }
// });


// // see all item
// router.get("/items", async (req,res) => {
//     try{
//         const items = await item.find();
//         res.json(items);
//     }catch(err){
//         res.status(500).send("error fetching items");
//     }
// });


// // see all items according to type
// router.get("/items/type/:type", async (req,res) => {
//     try{
//         const items = await item.find({type:req.params.type});
//         res.json(items);
//     }catch(err){
//         console.log(err);
//         res.status(500).send("error fetching items");
//     }
// });


// // see a single item
// router.get("/items/:id", async (req,res) => {
//     try{
//         const founditem = await item.findById(req.params.id);
//         res.json(founditem);
//     }catch(err){
//         console.log(err);
//         res.status(500).send("error fetching item");
//     }
// });

// //update items
// router.put('/items/:id' , async(req,res) => {
//     try{
//         const updatedItem = await item.findByIdAndUpdate(req.params.id, req.body, {new:true});
//         res.json(updatedItem);
//     }catch(err){
//         console.log(err);
//         res.status(500).send("error updating item");
//     }
// });

// // delete items
// router.delete('/items/:id', async (req,res) =>{
//     try{
//         await item.findByIdAndDelete(req.params.id);
//         res.send("item deleted");
//     }catch(err){
//         console.log(err);
//         res.status(500).send("error deleting item");
//     }
// });

// module.exports = router;