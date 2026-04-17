require("dotenv").config();
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const pool = require("./config/db");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

const policiesRoutes = require("./routes/policies");
const claimsRoutes = require("./routes/claims");
const settingsRoutes = require("./routes/settings");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://[::1]:5173"];
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? Array.from(
      new Set([
        ...process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim()),
        ...defaultOrigins,
      ])
    )
  : defaultOrigins;

const isLocalDevOrigin = (origin) =>
  typeof origin === "string" &&
  (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin.startsWith("http://[::1]:"));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow access from ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/policies", policiesRoutes);
app.use("/api/claims",   claimsRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ShieldShift API running on http://localhost:${PORT}`);
  console.log(`ENV: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;