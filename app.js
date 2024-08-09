const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

// Create Express app instance
const app = express();

// Initialize HTTP server with Express
const server = http.createServer(app);

// Instantiate Socket.IO on HTTP server
const io = socket(server);

// Initialize Chess.js
const chess = new Chess();

let players = {};

// View engine setup
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
    console.log("A player connected: ", uniquesocket.id);

    // Assign player roles
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    uniquesocket.on("disconnect", function () {
        console.log("A player disconnected: ", uniquesocket.id);
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });

    uniquesocket.on("move", (move) => {
        try {
            // Ensure the move is from the correct player
            if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

            const result = chess.move(move);

            if (result) {
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                console.log("Invalid move: ", move);
                uniquesocket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log("Error processing move: ", move, err);
            uniquesocket.emit("error", "Invalid move");
        }
    });
});

server.listen(3000, function () {
    console.log("Listening on port 3000");
});
