import express, { type Express } from "express";
import cors from "cors";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import router from "./routes";

const app: Express = express();

const UPLOADS_DIR = join(process.cwd(), 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/uploads', express.static(UPLOADS_DIR));
app.use("/api", router);

export default app;
