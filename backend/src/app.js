const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

// routes
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes")); // if you have categories route