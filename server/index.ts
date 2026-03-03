import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import chatRouter from "./routes/chat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 3001;
const isProduction = process.env.NODE_ENV === "production";

// In development, allow localhost:3000. In production, frontend is same origin — no CORS needed.
app.use(cors(isProduction ? {} : { origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api", chatRouter);

// Serve the built Vite frontend in production
if (isProduction) {
  const distPath = path.join(__dirname, "../dist");
  app.use(express.static(distPath));
  // SPA fallback: all non-API routes return index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
