import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { connectDB, isDBConnected } from "./server/config/db.js";
import resourceRoutes from "./server/routes/resourceRoutes.js";
import userRoutes from "./server/routes/userRoutes.js";
import aiRoutes from "./server/routes/aiRoutes.js";
import adminRoutes from "./server/routes/adminRoutes.js";

async function startServer(): Promise<void> {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === "production";

  // 1. Connect to MongoDB before starting the server
  await connectDB();

  // Fail startup if production MongoDB is not connected
  if (isProduction && !isDBConnected()) {
    throw new Error(
      "MongoDB connection failed. Check the MONGODB_URI environment variable and Atlas network access.",
    );
  }

  // 2. Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 3. Core middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 4. Serve uploaded files
  app.use("/uploads", express.static(uploadsDir));

  // 5. Health check
  app.get("/api/health", (_req: Request, res: Response) => {
    const connected = isDBConnected();

    res.status(connected ? 200 : 503).json({
      status: connected ? "healthy" : "database_disconnected",
      database: connected ? "connected (MongoDB)" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  });

  // 6. System status
  app.get("/api/status", (_req: Request, res: Response) => {
    const connected = isDBConnected();

    res.status(connected ? 200 : 503).json({
      service: "Academic Resource & PYQ Portal API",
      version: "1.0.0",
      database: {
        connected,
        type: connected ? "MongoDB via Mongoose" : "Disconnected",
        uriConfigured: Boolean(process.env.MONGODB_URI),
      },
      endpoints: [
        {
          method: "POST",
          path: "/api/resources",
          description: "Upload resource metadata link",
        },
        {
          method: "GET",
          path: "/api/resources?semester=&subjectCode=&category=&sort=",
          description: "Filter academic resources and PYQs",
        },
        {
          method: "PATCH",
          path: "/api/resources/:id/upvote",
          description: "Upvote a resource",
        },
        {
          method: "GET",
          path: "/api/users",
          description: "List student and admin users",
        },
        {
          method: "POST",
          path: "/api/users",
          description: "Register a student or admin user",
        },
        {
          method: "GET",
          path: "/api/admin/stats",
          description: "Administrative metrics and statistics",
        },
        {
          method: "GET",
          path: "/api/admin/resources",
          description: "List resources for administration",
        },
        {
          method: "DELETE",
          path: "/api/admin/resources/:id",
          description: "Delete or moderate a resource",
        },
      ],
    });
  });

  // 7. Mount API routes
  app.use("/api/resources", resourceRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/admin", adminRoutes);

  // 8. Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Server Error]", err);

    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

  // 9. Frontend: Vite middleware in development, built files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      throw new Error(
        "Frontend build not found. Run npm run build before starting the server.",
      );
    }

    app.use(express.static(distPath));

    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 10. Start server using Render's assigned port
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Academic Resource & PYQ Portal listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
