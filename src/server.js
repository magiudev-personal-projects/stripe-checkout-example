const express = require("express");
const { port } = require("./config");

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.listen(port, console.log("Server listening on port: ", port));
