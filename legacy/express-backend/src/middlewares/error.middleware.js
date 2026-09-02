// // src/middlewares/error.middleware.js
// function errorHandler(err, req, res, next) {
//   console.error(err);
//   const status = err.status || 500;
//   res.status(status).json({ error: err.message || "Internal server error" });
// }

// module.exports = { errorHandler };

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error" });
}
