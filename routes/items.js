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

router.get("/:id", async (req, res) => {
    try {
        const foundItem = await Item.findById(req.params.id);
        res.json(foundItem);
    } catch(err) {
        res.status(500).send("error fetching item");
    }
});
module.exports = router;
