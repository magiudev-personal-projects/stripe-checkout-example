const express = require("express");
const cors = require("cors");
const {port, clientUrl} = require("./config");
const {createCheckoutSession, getCards} = require("./controllers");

const app = express();
app.use(cors({origin: clientUrl}));
app.use(express.static("front"))
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.post("/create-checkout-session", createCheckoutSession);
app.post("/cards", getCards);

app.listen(port, console.log("Server listening on port: ", port));
