import express from "express";
import * as dotenv from "dotenv";
dotenv.config();
import { MongoClient } from "mongodb";
import cors from "cors";
import userRouter from "./routes/user.routes.js";
import { Server } from "socket.io";
import http from "http";

const app = express();
app.use(cors());

export const client = new MongoClient(process.env.MONGO_URL);
await client.connect();
console.log("mongo connected");

// const expressServer = app.listen(process.env.PORT, () =>
//   console.log("exp server started in PORT", process.env.PORT)
// );

// const io = new Server(expressServer);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_API },
});

httpServer.listen(process.env.PORT, () =>
  console.log("http server started in PORT", process.env.PORT)
);

app.get("/", (request, response) => {
  response.send("Welcome to Chat API");
});

io.on("connection", (socket) => {
  // save every connecting in online users
  console.log(socket.id);
  socket.on("connection", (data) => {
    console.log("socket connection", data);
  });
  socket.on("chatPage", async function (userMail, callback) {
    console.log("cp", userMail);
    const users = await client
      .db("chatApp")
      .collection("users")
      .find(
        { isActivated: true, email: { $ne: userMail } },
        { projection: { password: 0, isActivated: 0 } }
      )
      .toArray();
    callback(users);
  });
  socket.on("disconnect", function () {
    console.log("A user disconnected");
  });
  socket.on("connection", function () {
    console.log("A user disconnected");
  });
  socket.on("new-user", () => {
    io.emit("new-user", "hi, new user connected");
  });
  io.emit("check", "checking content");
  socket.on("connect_error", (error) => {
    console.log("connection error", error);
  });
});

app.use("/user", userRouter);
