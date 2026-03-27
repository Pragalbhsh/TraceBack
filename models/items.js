const mongoose = require('mongoose');

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
    const Item = mongoose.model("items" , itemsSchema);

    module.exports = Item;