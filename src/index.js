const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Routers
const usersRouter = require("./routes/users");
const addUserRouter = require("./routes/addUser");
const eventsRouter = require("./routes/events");
const servicesRouter = require("./routes/services");
const serviceItemsRouter = require("./routes/service_items");
const bookingsRouter = require("./routes/bookings");
const menuRouter = require("./routes/menuItems");
const chefsRouter = require("./routes/chefs");
const vendorsRouter = require("./routes/vendors");
const reviewsRouter = require("./routes/reviews");
const ordersRouter = require("./routes/orders");
const paymentsRouter = require("./routes/payments");
const loginRouter = require("./routes/login");
const approvalsRouter = require("./routes/approvals");
const profilesRoutes = require("./routes/profiles");

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Temporarily disabled for Vercel (read-only filesystem)
// app.use("/uploads", express.static("uploads"));

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:4200",
      "https://bhagona.in",
      "https://admin.bhagona.in",
      "https://partner.bhagona.in"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Test route
app.get("/", (req, res) => {
  res.status(200).json({ message: "Backend connected successfully!" });
});

// Routes
app.use("/users", usersRouter);
app.use("/addUser", addUserRouter);
app.use("/events", eventsRouter);
app.use("/services", servicesRouter);
app.use("/service-items", serviceItemsRouter);
app.use("/login", loginRouter);
app.use("/bookings", bookingsRouter);
app.use("/menu-items", menuRouter);
app.use("/chefs", chefsRouter);
app.use("/vendors", vendorsRouter);
app.use("/reviews", reviewsRouter);
app.use("/orders", ordersRouter);
app.use("/payments", paymentsRouter);
app.use("/approvals", approvalsRouter);
app.use("/profiles", profilesRoutes);

// 404 Not Found
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
