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

const updateOnlineStatus = async (userMail, userStatus, socketId) => {
  await client
    .db("chatApp")
    .collection("users")
    .updateOne(
      { isActivated: true, email: userMail },
      { $set: { isOnline: userStatus, socketId: socketId } }
    );
};

const updateOfflineStatus = async (userStatus, socketId) => {
  await client
    .db("chatApp")
    .collection("users")
    .updateOne(
      { isActivated: true, socketId: socketId },
      { $set: { isOnline: userStatus, lastSeen: Date.now() } }
    );
};

const getRoomMessages = async (room) => {
  return await client
    .db("chatApp")
    .collection("messages")
    .find({ to: room })
    .toArray();
};

const saveMessage = async (data) => {
  await client.db("chatApp").collection("messages").insertOne(data);
};

io.on("connection", async (socket) => {
  // save every connecting in online users
  console.log("a user conn in socket ID", socket.id);
  socket.on("new_user", async (userMail) => {
    await updateOnlineStatus(userMail, true, socket.id);
    const all = await client
      .db("chatApp")
      .collection("users")
      .find(
        { isActivated: true },
        { projection: { password: 0, isActivated: 0 } }
      )
      .toArray();
    // console.log("all", all);
    socket.emit("updated_users", all);
  });

  socket.on("join_room", async (room) => {
    socket.join(room);
    console.log("joined Room", room);
    socket.emit("room_messages", await getRoomMessages(room));
  });

  socket.on("message_room", async (data) => {
    console.log("new message to room", data);
    await saveMessage(data);
    io.to(data.to).emit(
      "receive_room_messages",
      await getRoomMessages(data.to)
    );
    console.log("emited Data room messages", await getRoomMessages(data.to));
  });

  socket.on("disconnect", async function () {
    console.log("A user disconnected", socket.id);
    await updateOfflineStatus(false, socket.id);
  });

  socket.on("connect_error", (error) => {
    console.log("connection error", error);
  });
});

app.use("/user", userRouter);
