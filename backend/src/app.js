import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import declarationRoutes from "./routes/declaration.routes.js";
import referenceRoutes from "./routes/reference.routes.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
if (env.NODE_ENV !== "test") app.use(morgan("dev"));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/declarations", declarationRoutes);
app.use("/api", referenceRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;