import jwt from "jsonwebtoken";

async function generateToken(payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET_TOKEN, {
    expiresIn: process.env.JWT_TOKEN_EXPIREY,
  });
  return token;
}

async function generateRefreshToken(payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET_TOKEN, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIREY,
  });
  return token;
}

async function verifyToken(payload) {
  return jwt.verify(payload, process.env.JWT_SECRET_TOKEN);
}

export { generateToken, generateRefreshToken, verifyToken };
