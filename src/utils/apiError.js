class apiError extends Error {

  constructor(code, message) {
    const errorMessage =
      typeof message === "object" && message !== null
        ? message.message || JSON.stringify(message)
        : message;

    super(errorMessage);

    this.name = this.constructor.name;
    this.code = code;
    this.message = errorMessage;

    Error.captureStackTrace(this, this.constructor);
  }

  static unauthorized(msg) {
    return new apiError(401, msg);
  }

  static badRequest(msg) {
    return new apiError(400, msg);
  }

  static notFound(msg) {
    return new apiError(404, msg);
  }

  static internal(msg) {
    return new apiError(500, msg);
  }

  static forbidden(msg) {
    return new apiError(403, msg);
  }
}

export default apiError;
