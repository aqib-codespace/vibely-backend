/**
 * Global error handling middleware
 * Standardizes API error responses across the application
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging (can be replaced with proper logging solution in production)
  console.error("Error occurred:", err);

  // Default values
  let statusCode = err.code || 500;
  let message = err.message || "Internal Server Error";

  // Handle different error types
  if (err.name === "ValidationError") {
    statusCode = 400;
  } else if (err.name === "UnauthorizedError") {
    statusCode = 401;
  } else if (err.name === "ForbiddenError") {
    statusCode = 403;
  } else if (err.name === "NotFoundError") {
    statusCode = 404;
  }

  // For development environment, include the stack trace
  const response = {
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

export default errorHandler;
