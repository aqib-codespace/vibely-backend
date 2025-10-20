import { Server as SocketIoServer } from "socket.io";
import { verifyToken } from "./token.js";
import User from "../modules/users/model.js";

let io;

export const initSocketIo = (server) => {
  io = new SocketIoServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = await verifyToken(token);
      if (!decoded) {
        return next(new Error("Invalid token"));
      }

      const user = await User.findOne({ email: decoded.email }).select(
        "-password"
      );
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user._id;
      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}`);

    socket.emit("connected");
    socket.join(socket.userId.toString());

    socket.on("join chat", (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat: ${chatId}`);
    });

    socket.on("typing", (chatId) => {
      socket.to(chatId).emit("typing", {
        chatId,
        userId: socket.userId,
      });
    });

    socket.on("stop typing", (chatId) => {
      socket.to(chatId).emit("stop typing", {
        chatId,
        userId: socket.userId,
      });
    });

    socket.on("join product chat", (productChatId) => {
      socket.join(productChatId);
      console.log(
        `User ${socket.userId} joined product chat: ${productChatId}`
      );
    });

    socket.on("product typing", (productChatId) => {
      socket.to(productChatId).emit("product typing", {
        productChatId,
        userId: socket.userId,
      });
    });

    socket.on("stop product typing", (productChatId) => {
      socket.to(productChatId).emit("stop product typing", {
        productChatId,
        userId: socket.userId,
      });
    });

    socket.on("join marketplace chat", (marketplaceChatId) => {
      socket.join(marketplaceChatId);
      console.log(
        `User ${socket.userId} joined marketplace chat: ${marketplaceChatId}`
      );
    });

    socket.on("leave marketplace chat", (marketplaceChatId) => {
      socket.leave(marketplaceChatId);
      console.log(
        `User ${socket.userId} left marketplace chat: ${marketplaceChatId}`
      );
    });

    socket.on("marketplace typing", (marketplaceChatId) => {
      socket.to(marketplaceChatId).emit("marketplace typing", {
        marketplaceChatId,
        userId: socket.userId,
        user: socket.user,
      });
    });

    socket.on("stop marketplace typing", (marketplaceChatId) => {
      socket.to(marketplaceChatId).emit("stop marketplace typing", {
        marketplaceChatId,
        userId: socket.userId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
