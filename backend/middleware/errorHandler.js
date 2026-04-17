
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === "development";

  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`);

  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A record with those details already exists.",
    });
  }

  if (err.code === "23514") {
    return res.status(400).json({
      success: false,
      message: "Invalid value provided for one of the fields.",
    });
  }

  if (
    err.code === "ECONNREFUSED" ||
    err.message?.includes("ECONNREFUSED") ||
    (err.name === "AggregateError" &&
      Array.isArray(err.errors) &&
      err.errors.some((inner) => inner?.code === "ECONNREFUSED"))
  ) {
    return res.status(503).json({
      success: false,
      message: "Database connection refused. Ensure PostgreSQL is running and accessible.",
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error.",
    ...(isDev && { stack: err.stack }),
  });
};


const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

module.exports = { errorHandler, notFound };