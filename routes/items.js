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

router.get("/type/:type", async (req, res) => {
    try {
        const items = await Item.find({ type: req.params.type });
        res.json(items);
    } catch(err) {
        res.status(500).send("error fetching items");
    }
});

router.get("/:id", async (req, res) => {
    try {
        const foundItem = await Item.findById(req.params.id);
        res.json(foundItem);
    } catch(err) {
        res.status(500).send("error fetching item");
    }
});

router.post("/", upload.single("image"), async (req, res) => {
    try {
        const newItem = new Item({ ... req.body, image: req.file ? req.file.path : null}); //...req.body is just a shorter way to write all the data in one shot.
        const savedItem = await newItem.save();
        const oppositeType = savedItem.type === "lost" ? "found" : "lost"
        const allItems  = await Item.find({type: oppositeType});
        const scoredMatches = allItems.map(i => {
            let score = 0;
            //location match
            if(i.location === savedItem.location) score+=5;
            //name match
            const newName = savedItem.name?.toLowerCase() || "";
            const existingName = i.name?.toLowerCase() || "";
            if(newName && existingName && newName.includes(existingName) || existingName.includes(newName)) score+=3;
            //description match
            const newDescription = savedItem.description?.toLowerCase().split(" ") || [];
            const existingDescription = i.description?.toLowerCase().split(" ") || [];
            const commonWords = newDescription.filter(words => words.length > 3 && existingDescription.includes(words));
            score += commonWords.length*2;
            return { ...i.toObject(), score };
        })
            const topMatches = scoredMatches
            .filter(i => i.score> 0)
            .sort((a,b) => b.score-a.score)
            res.json({savedItem, possibleMatches: topMatches});
    }
    catch(err) {
        console.error(err);
        res.status(500).send("error saving item");
    }
});


router.put("/:id", async (req, res) => {
    try {
        const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedItem);
    } catch(err) {
        res.status(500).send("error updating item");
    }
});



router.delete("/:id", async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.json({ message: "item deleted" });
    } catch(err) {
        res.status(500).send("error deleting item");
    }
});

module.exports = router;
