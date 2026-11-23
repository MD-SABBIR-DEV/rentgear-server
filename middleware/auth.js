const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
};

const verifyRole = (usersCollection, allowedRoles) => {
  return async (req, res, next) => {
    const email = req.user?.email;
    const user = await usersCollection.findOne({ email });
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.dbUser = user;
    next();
  };
};

module.exports = { verifyToken, verifyRole };