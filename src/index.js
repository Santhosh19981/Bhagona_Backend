const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

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
const customerEventsRouter = require("./routes/customer/events");
const customerServicesRouter = require("./routes/customer/services");
const menuCategoriesRouter = require("./routes/menuCategories");
const menuSubcategoriesRouter = require("./routes/menuSubcategories");
const customerPartnersRouter = require("./routes/customer/partners");
const customerServiceItemsRouter = require("./routes/customer/serviceItems");
const bannersRouter = require("./routes/banners");
const offersRouter = require("./routes/offers");
const razorpayRouter = require("./routes/razorpay_payments");
const vendorAccountsRouter = require("./routes/vendor_accounts");
const dashboardRouter = require("./routes/dashboard");
const orderProofsRouter = require("./routes/order_proofs");



const envFile = process.env.ENV_FILE || (process.env.NODE_ENV === 'production' ? '.env.production' : (process.env.NODE_ENV === 'qa' ? '.env.qa' : '.env'));
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
console.log(`[Config] Loaded environment file: ${envFile} (NODE_ENV=${process.env.NODE_ENV || 'default'})`);
const app = express();

// Trust nginx so req.protocol / host reflect the public URL (used for image URLs)
app.set("trust proxy", true);

// Gzip JSON responses (optional dependency: server still starts if it is not installed)
try {
  const compression = require("compression");
  app.use(compression({ threshold: 1024 }));
} catch (e) {
  console.warn("[Perf] 'compression' not installed - responses will not be gzipped. Run npm install.");
}

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Normalise "undefined" / "null" placeholder values in body & query
app.use(require("./lib/validation").cleanRequest);

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// CORS Configuration
const allowedOrigins = [
  // Local Development
  "http://localhost:4200",
  "http://localhost:4201",
  "http://localhost:4202",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost",
  "http://localhost:8080",
  "capacitor://localhost",
  // Production Environment
  "https://bhagona.in",
  "https://www.bhagona.in",
  "https://admin.bhagona.in",
  "https://partner.bhagona.in",
  "https://api.bhagona.in",
  // QA / Testing Environment
  "https://qa.bhagona.in",
  "https://qa-admin.bhagona.in",
  "https://qa-partner.bhagona.in",
  "https://qa-api.bhagona.in"
];

// Add any extra origins defined in process.env.CORS_ORIGINS (comma-separated)
if (process.env.CORS_ORIGINS) {
  process.env.CORS_ORIGINS.split(",").forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);

// Test & Health route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Bhagona Backend API connected successfully!",
    environment: process.env.NODE_ENV || "development",
    database: process.env.DB_NAME || "default",
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use("/banners", bannersRouter);
app.use("/offers", offersRouter);
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
app.use("/razorpay", razorpayRouter);
app.use("/vendor-accounts", vendorAccountsRouter);
app.use("/dashboard", dashboardRouter);
app.use("/order-proofs", orderProofsRouter);


// Customer Routes
app.use("/customer/events", customerEventsRouter);
app.use("/customer/services", customerServicesRouter);
app.use("/menu-categories", menuCategoriesRouter);
app.use("/menu-subcategories", menuSubcategoriesRouter);
app.use("/customer/partners", customerPartnersRouter);
app.use("/customer/service-items", customerServiceItemsRouter);


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
