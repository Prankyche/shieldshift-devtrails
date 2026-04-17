const { Pool } = require("pg");

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
      }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || "shieldshift",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "12345",
      }
);

pool.on("connect", () => {
  if (process.env.NODE_ENV !== "test") {
    console.log("✅  PostgreSQL pool connected");
  }
});

pool.on("error", (err) => {
  console.error("❌  PostgreSQL pool error:", err.message);
});

module.exports = pool;