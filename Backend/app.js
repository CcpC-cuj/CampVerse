/*
 * This is the main backend entry file.
 * It serves as the parent file that connects all backend routes and middleware.
 */
const express = require("express");
const server = express();
const User = require("./Routes/User");
// server.get("/user/", User);
server.listen(8080 , (req, res) => {
    console.log(`Server listening on port 8080`);
});