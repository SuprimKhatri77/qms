import express, { Router } from "express";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import { loginSchema, signupSchema } from "@repo/types";
import { validate } from "./middlewares/validate";
import { requireAuth } from "./middlewares/require-auth";
import { loginController } from "./controllers/auth/login.controller";
import { signupController } from "./controllers/auth/signup.controller";
import { meController } from "./controllers/auth/me.controller";
import { logoutController } from "./controllers/auth/logout.controller";

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const app = express();
const v1 = Router();

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.all("/api/auth/{*any}", toNodeHandler(auth));
app.use(express.json());

app.use("/api/v1", v1);

v1.get("/health", (req, res) => {
  res.status(200).json({ message: "API is running." });
});

v1.post("/auth/login", validate(loginSchema), loginController);
v1.post("/auth/signup", validate(signupSchema), signupController);
v1.get("/auth/me", requireAuth, meController);
v1.post("/auth/logout", logoutController);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
