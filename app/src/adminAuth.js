import jwt from "jsonwebtoken";

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const ADMIN_USER = mustGetEnv("ADMIN_USER");
const ADMIN_PASS = mustGetEnv("ADMIN_PASS");
const JWT_SECRET = mustGetEnv("ADMIN_JWT_SECRET");
const JWT_EXPIRES = process.env.ADMIN_JWT_EXPIRES || "12h";

export function loginAdmin({ username, password }) {
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return null;
  }

  const token = jwt.sign({ sub: "admin", role: "admin" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });

  return token;
}

export function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const [type, token] = auth.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
