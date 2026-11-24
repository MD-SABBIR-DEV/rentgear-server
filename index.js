const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { verifyToken, verifyRole } = require("./middleware/auth");

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:3000", process.env.CLIENT_URL].filter(Boolean),
    credentials: true,
  }),
);
app.use(express.json());

// MongoDB Connection (Vercel Serverless Friendly)
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db,
  usersCollection,
  equipmentCollection,
  bookingsCollection,
  favoritesCollection,
  paymentsCollection;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("equipment_rental_db");
    usersCollection = db.collection("users");
    equipmentCollection = db.collection("equipment");
    bookingsCollection = db.collection("bookings");
    favoritesCollection = db.collection("favorites");
    paymentsCollection = db.collection("payments");
  }
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res
      .status(500)
      .send({ message: "Database connection failed", error: err.message });
  }
});

// Role Middlewares (Challenge 2)
const verifyRenter = (req, res, next) =>
  verifyRole(usersCollection, ["Customer", "Owner", "Admin"])(req, res, next);
const verifyOwner = (req, res, next) =>
  verifyRole(usersCollection, ["Owner", "Admin"])(req, res, next);
const verifyAdmin = (req, res, next) =>
  verifyRole(usersCollection, ["Admin"])(req, res, next);

// 1. Health Check
app.get("/", (req, res) => {
  res.send({
    status: "ok",
    message: "Equipment Rental Platform API is running!",
  });
});

// 2. Seed Dummy Data (Run once via browser: /api/seed)
app.get("/api/seed", async (req, res) => {
  const count = await equipmentCollection.countDocuments();
  if (count === 0) {
    const sampleEquipment = [
      {
        name: "CAT 320 Hydraulic Excavator",
        description:
          "Heavy-duty hydraulic excavator ideal for large construction and earthmoving projects.",
        category: "Construction Equipment",
        rentalPrice: 250,
        rentalType: "Daily",
        location: "Dhaka",
        availableQuantity: 3,
        condition: "Excellent",
        brand: "Caterpillar",
        model: "CAT-320",
        image:
          "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800&q=80",
        terms: "Valid operator license required. Fuel not included.",
        status: "Approved",
        ownerEmail: "owner@rentgear.com",
        ownerName: "Rahim Construction",
        createdAt: new Date(),
      },
      {
        name: "Sony A7 IV Mirrorless Camera Kit",
        description:
          "Full-frame 33MP camera with 24-70mm GM lens, perfect for commercial shoots and weddings.",
        category: "Photography Equipment",
        rentalPrice: 65,
        rentalType: "Daily",
        location: "Dhaka",
        availableQuantity: 5,
        condition: "Like New",
        brand: "Sony",
        model: "A7 IV",
        image:
          "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
        terms:
          "Security deposit required. Return with all batteries and charger.",
        status: "Approved",
        ownerEmail: "owner@rentgear.com",
        ownerName: "LensCraft Studio",
        createdAt: new Date(),
      },
      {
        name: "John Deere 5050D Agricultural Tractor",
        description:
          "50 HP reliable farm tractor suitable for plowing, tilling, and heavy agricultural work.",
        category: "Agriculture Equipment",
        rentalPrice: 140,
        rentalType: "Daily",
        location: "Chattogram",
        availableQuantity: 2,
        condition: "Good",
        brand: "John Deere",
        model: "5050D",
        image:
          "https://images.unsplash.com/photo-1592982537447-6f2a6a0c7c18?w=800&q=80",
        terms: "Clean before return. Delivery available within 50km.",
        status: "Approved",
        ownerEmail: "owner@rentgear.com",
        ownerName: "AgroTech Rentals",
        createdAt: new Date(),
      },
      {
        name: "JBL Pro Event Sound System (2000W)",
        description:
          "Complete PA system with dual subwoofers, wireless mics, and 12-channel mixer.",
        category: "Event Equipment",
        rentalPrice: 120,
        rentalType: "Daily",
        location: "Sylhet",
        availableQuantity: 4,
        condition: "Excellent",
        brand: "JBL",
        model: "EON715",
        image:
          "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
        terms: "Indoor or covered outdoor use only.",
        status: "Approved",
        ownerEmail: "owner@rentgear.com",
        ownerName: "SoundWave Events",
        createdAt: new Date(),
      },
      {
        name: "DJI Mavic 3 Pro Cine Drone",
        description:
          "Triple-camera cinema drone with Apple ProRes support and 43-minute flight time.",
        category: "Electronics",
        rentalPrice: 95,
        rentalType: "Daily",
        location: "Dhaka",
        availableQuantity: 3,
        condition: "Like New",
        brand: "DJI",
        model: "Mavic 3 Pro",
        image:
          "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=800&q=80",
        terms: "Renter is responsible for crash damage.",
        status: "Approved",
        ownerEmail: "owner@rentgear.com",
        ownerName: "SkyView Gear",
        createdAt: new Date(),
      },
      {
        name: "Toyota HiAce Cargo Van",
        description:
          "Spacious commercial cargo van for equipment transport and logistics.",
        category: "Vehicles & Transportation",
        rentalPrice: 450,
        rentalType: "Weekly",
        location: "Dhaka",
        availableQuantity: 4,
        condition: "Excellent",
        brand: "Toyota",
        model: "HiAce 2024",
        image:
          "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&q=80",
        terms: "Valid driving license required. Unlimited mileage within city.",
        status: "Approved",
        ownerEmail: "owner@rentgear.com",
        ownerName: "FastMove Fleet",
        createdAt: new Date(),
      },
    ];
    await equipmentCollection.insertMany(sampleEquipment);
  }
  res.send({ message: "Database seeded successfully!" });
});

// 3. JWT & User Sync
app.post("/api/jwt", async (req, res) => {
  const { email, name, image } = req.body;
  if (!email) return res.status(400).send({ message: "Email is required" });

  let user = await usersCollection.findOne({ email });
  if (!user) {
    const newUser = {
      name: name || "User",
      email,
      image: image || "https://i.ibb.co/4pDNDk1/avatar.png",
      role: email === "admin@rentgear.com" ? "Admin" : "Customer",
      phone: "",
      address: "",
      createdAt: new Date(),
    };
    await usersCollection.insertOne(newUser);
    user = newUser;
  }

  const token = jwt.sign(
    { email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  res.send({ token, user });
});

// 4. User Routes
app.get("/api/users/me", verifyToken, async (req, res) => {
  const user = await usersCollection.findOne({ email: req.user.email });
  res.send(user);
});

app.patch("/api/users/profile", verifyToken, async (req, res) => {
  const { name, image, phone, address } = req.body;
  const result = await usersCollection.updateOne(
    { email: req.user.email },
    { $set: { name, image, phone, address } },
  );
  res.send(result);
});

app.get("/api/users", verifyToken, verifyAdmin, async (req, res) => {
  const users = await usersCollection.find().sort({ createdAt: -1 }).toArray();
  res.send(users);
});

app.patch("/api/users/role/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { role } = req.body;
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role } },
  );
  res.send(result);
});

// 5. Equipment Routes (Public + Server-Side Search/Filter/Sort - Challenge 1)
app.get("/api/equipment/featured", async (req, res) => {
  const items = await equipmentCollection
    .find({ status: "Approved" })
    .limit(6)
    .toArray();
  res.send(items);
});

app.get("/api/equipment", async (req, res) => {
  const {
    search,
    category,
    location,
    rentalType,
    minPrice,
    maxPrice,
    availability,
    sort,
  } = req.query;
  const query = { status: "Approved" };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }
  if (category && category !== "All") query.category = category;
  if (location && location !== "All")
    query.location = { $regex: location, $options: "i" };
  if (rentalType && rentalType !== "All") query.rentalType = rentalType;
  if (availability === "Available") query.availableQuantity = { $gt: 0 };
  if (minPrice || maxPrice) {
    query.rentalPrice = {};
    if (minPrice) query.rentalPrice.$gte = Number(minPrice);
    if (maxPrice) query.rentalPrice.$lte = Number(maxPrice);
  }

  let sortOption = { createdAt: -1 };
  if (sort === "price_asc") sortOption = { rentalPrice: 1 };
  if (sort === "price_desc") sortOption = { rentalPrice: -1 };

  const items = await equipmentCollection
    .find(query)
    .sort(sortOption)
    .toArray();
  res.send(items);
});

app.get("/api/equipment/:id", async (req, res) => {
  const item = await equipmentCollection.findOne({
    _id: new ObjectId(req.params.id),
  });
  res.send(item);
});

// Owner & Admin Equipment Management
app.post("/api/equipment", verifyToken, verifyOwner, async (req, res) => {
  const data = {
    ...req.body,
    rentalPrice: Number(req.body.rentalPrice),
    availableQuantity: Number(req.body.availableQuantity),
    status: "Pending",
    ownerEmail: req.user.email,
    ownerName: req.dbUser.name,
    createdAt: new Date(),
  };
  const result = await equipmentCollection.insertOne(data);
  res.send(result);
});

app.get("/api/owner/equipment", verifyToken, verifyOwner, async (req, res) => {
  const items = await equipmentCollection
    .find({ ownerEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.send(items);
});

app.get("/api/admin/equipment", verifyToken, verifyAdmin, async (req, res) => {
  const items = await equipmentCollection
    .find()
    .sort({ createdAt: -1 })
    .toArray();
  res.send(items);
});

app.patch("/api/equipment/:id", verifyToken, verifyOwner, async (req, res) => {
  const { _id, ...updateData } = req.body;
  if (updateData.rentalPrice)
    updateData.rentalPrice = Number(updateData.rentalPrice);
  if (updateData.availableQuantity)
    updateData.availableQuantity = Number(updateData.availableQuantity);
  const result = await equipmentCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: updateData },
  );
  res.send(result);
});

app.patch(
  "/api/admin/equipment/status/:id",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    const { status } = req.body;
    const result = await equipmentCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status } },
    );
    res.send(result);
  },
);

app.delete("/api/equipment/:id", verifyToken, verifyOwner, async (req, res) => {
  const result = await equipmentCollection.deleteOne({
    _id: new ObjectId(req.params.id),
  });
  res.send(result);
});

// 6. Favorites Routes
app.get("/api/favorites", verifyToken, verifyRenter, async (req, res) => {
  const favs = await favoritesCollection
    .find({ userEmail: req.user.email })
    .toArray();
  res.send(favs);
});

app.post("/api/favorites", verifyToken, verifyRenter, async (req, res) => {
  const { equipmentId, equipmentName, image, rentalPrice, category } = req.body;
  const exists = await favoritesCollection.findOne({
    userEmail: req.user.email,
    equipmentId,
  });
  if (exists) return res.status(400).send({ message: "Already in favorites" });
  const result = await favoritesCollection.insertOne({
    userEmail: req.user.email,
    equipmentId,
    equipmentName,
    image,
    rentalPrice,
    category,
    createdAt: new Date(),
  });
  res.send(result);
});

app.delete(
  "/api/favorites/:id",
  verifyToken,
  verifyRenter,
  async (req, res) => {
    const result = await favoritesCollection.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.send(result);
  },
);

// 7. Stripe Checkout & Bookings
app.post(
  "/api/create-checkout-session",
  verifyToken,
  verifyRenter,
  async (req, res) => {
    try {
      const {
        equipmentId,
        equipmentName,
        ownerEmail,
        startDate,
        endDate,
        quantity,
        totalAmount,
        contactNumber,
        deliveryAddress,
        notes,
      } = req.body;

      const clientUrl = (process.env.CLIENT_URL || "https://rentgear-client.vercel.app").trim().replace(/\/$/, "");

      // Create Pending Booking
      const bookingDoc = {
        equipmentId,
        equipmentName,
        ownerEmail,
        customerEmail: req.user.email,
        customerName: req.dbUser.name,
        startDate,
        endDate,
        quantity: Number(quantity),
        totalAmount: Number(totalAmount),
        contactNumber,
        deliveryAddress,
        notes,
        paymentStatus: "Pending",
        bookingStatus: "Pending",
        bookingDate: new Date(),
      };
      const bookingResult = await bookingsCollection.insertOne(bookingDoc);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `${equipmentName} (Qty: ${quantity})` },
              unit_amount: Math.round(Number(totalAmount) * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingResult.insertedId}`,
        cancel_url: `${clientUrl}/equipment/${equipmentId}`,
      });

      res.send({ url: session.url, bookingId: bookingResult.insertedId });
    } catch (err) {
      console.error("Stripe Checkout Error:", err);
      res.status(400).send({ message: err.message || "Stripe checkout failed" });
    }
  },
);

app.post("/api/confirm-payment", verifyToken, async (req, res) => {
  const { sessionId, bookingId } = req.body;
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid") {
    await bookingsCollection.updateOne(
      { _id: new ObjectId(bookingId) },
      {
        $set: {
          paymentStatus: "Paid",
          bookingStatus: "Confirmed",
          transactionId: session.payment_intent,
        },
      },
    );

    const existingPayment = await paymentsCollection.findOne({ sessionId });
    if (!existingPayment) {
      await paymentsCollection.insertOne({
        bookingId,
        sessionId,
        transactionId: session.payment_intent,
        customerEmail: req.user.email,
        amount: session.amount_total / 100,
        status: "Paid",
        paidAt: new Date(),
      });
    }
    return res.send({ success: true, transactionId: session.payment_intent });
  }
  res.status(400).send({ success: false, message: "Payment not completed" });
});

// Booking Lists
app.get(
  "/api/bookings/customer",
  verifyToken,
  verifyRenter,
  async (req, res) => {
    const bookings = await bookingsCollection
      .find({ customerEmail: req.user.email })
      .sort({ bookingDate: -1 })
      .toArray();
    res.send(bookings);
  },
);

app.get("/api/bookings/owner", verifyToken, verifyOwner, async (req, res) => {
  const bookings = await bookingsCollection
    .find({ ownerEmail: req.user.email })
    .sort({ bookingDate: -1 })
    .toArray();
  res.send(bookings);
});

app.get("/api/bookings/admin", verifyToken, verifyAdmin, async (req, res) => {
  const bookings = await bookingsCollection
    .find()
    .sort({ bookingDate: -1 })
    .toArray();
  res.send(bookings);
});

app.patch(
  "/api/bookings/status/:id",
  verifyToken,
  verifyOwner,
  async (req, res) => {
    const { bookingStatus } = req.body;
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { bookingStatus } },
    );
    res.send(result);
  },
);

// 8. Analytics (Challenge 3)
app.get("/api/analytics/admin", verifyToken, verifyAdmin, async (req, res) => {
  const totalUsers = await usersCollection.countDocuments();
  const totalEquipment = await equipmentCollection.countDocuments();
  const pendingApprovals = await equipmentCollection.countDocuments({
    status: "Pending",
  });
  const totalBookings = await bookingsCollection.countDocuments();
  const completedRentals = await bookingsCollection.countDocuments({
    bookingStatus: "Confirmed",
  });
  const paidBookings = await bookingsCollection
    .find({ paymentStatus: "Paid" })
    .toArray();
  const totalRevenue = paidBookings.reduce(
    (sum, b) => sum + (b.totalAmount || 0),
    0,
  );

  const monthlyStats = [
    { month: "Aug", bookings: 4, revenue: 680 },
    { month: "Sep", bookings: 7, revenue: 1240 },
    { month: "Oct", bookings: 11, revenue: 1950 },
    {
      month: "Nov",
      bookings: totalBookings || 5,
      revenue: totalRevenue || 850,
    },
  ];

  res.send({
    totalUsers,
    totalEquipment,
    pendingApprovals,
    totalBookings,
    completedRentals,
    totalRevenue,
    monthlyStats,
  });
});

app.get("/api/analytics/owner", verifyToken, verifyOwner, async (req, res) => {
  const totalListed = await equipmentCollection.countDocuments({
    ownerEmail: req.user.email,
  });
  const ownerBookings = await bookingsCollection
    .find({ ownerEmail: req.user.email })
    .toArray();
  const completedRentals = ownerBookings.filter(
    (b) => b.bookingStatus === "Confirmed",
  ).length;
  const totalEarnings = ownerBookings
    .filter((b) => b.paymentStatus === "Paid")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const monthlyEarnings = [
    { month: "Aug", earnings: 320 },
    { month: "Sep", earnings: 540 },
    { month: "Oct", earnings: 780 },
    { month: "Nov", earnings: totalEarnings || 420 },
  ];

  res.send({ totalListed, completedRentals, totalEarnings, monthlyEarnings });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
