import jwt from "jsonwebtoken";
const auth = (req, res, next) => {
  try {
    const token = req.headers.logintoken;
    const decoded = jwt.verify(token, process.env.JSON_TOKEN_SECRET_KEY);
    next();
  } catch (err) {
    res.status(401).send({ message: err.message });
  }
};

export { auth };
