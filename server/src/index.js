import express from "express";
import cors from "cors";
import ticketRoutes from "./routes/ticketRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/tickets", ticketRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
