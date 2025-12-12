import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initSocketIo } from "./utils/socket.io.js";
import { verifyTransporter } from "./utils/emailService.js";
import { connectDB } from "./config/db.js";
import routes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 4000;
dotenv.config();

app.use(cors());
app.use(express.json());

routes(app);

app.use(errorHandler);

async function startServer() {
  try {
    await connectDB(process.env.MONGODB_URI);
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    const io = initSocketIo(server);
    app.set("io", io);
    // Verify SMTP transporter connectivity (logs — non-fatal)
    verifyTransporter()
      .then((res) => {
        if (!res.ok) {
          console.warn("Email transporter verify returned:", res.message);
        } else {
          console.log("Email transporter verified successfully");
        }
      })
      .catch((err) => {
        console.error("Email transporter verification failed:", err);
      });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}
startServer();
