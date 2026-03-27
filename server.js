require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const itemRoutes = require('./routes/items');  // 👈 bring in our routes

const app = express();
app.use(express.json());
app.use(cors());  

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(" Connected to MongoDB"))
    .catch((err) => console.log(" MongoDB error:", err));

// Routes
app.get('/', (req, res) => {
    res.send("Traceback backend running 🚀");
});

app.use('/items', itemRoutes);  // 👈 all /items routes go here

// Global error handler
app.use((err, req, res, next) => {
    console.error("Error:", err?.message);
    res.status(500).json({ error: err?.message || "Something went wrong" });
});

app.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
});