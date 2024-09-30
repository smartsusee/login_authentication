const express = require("express");

const app = express();
const bcrpt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const nodemailer = require("nodemailer");
const crypto = require("crypto");
const cors = require("cors");

const multer = require("multer");
const fs = require("fs");
const path = require("path");

app.use(express.json());
app.use(cors());
const mongoose = require("mongoose");
const { finished } = require("stream");
const { log } = require("console");

mongoose
  .connect("mongodb://localhost:27017/imageViewer", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("db is connected");
  })
  .catch(() => {
    console.log("db is not connected");
  });

const myStr = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../frontend/src/studentPage/assets/images"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: myStr,
  //   fileFilter,
});

// student details
const itemSchema = new mongoose.Schema({
  name: String,
  email: String,
  imageUrl: String,
});

const Item = mongoose.model("Item", itemSchema);

app.post("/imageAdd", upload.single("image"), async (req, res) => {
  try {
    const { name, email } = req.body;
    const imageUrl = req.file ? req.file.filename : null;

    const imageItem = new Item({ name, email, imageUrl });

    await imageItem.save();
    res.status(201).json({
      msg: "Image uploaded",
      imageItem,
    });
  } catch (error) {
    console.log("error");
  }
});

app.put("/items/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, email } = req.body;
    const id = req.params.id;

    // Find the existing item
    const existingItem = await Item.findById(id);
    if (!existingItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    let imageUrl = existingItem.imageUrl;

    // If a new image file is provided, delete the old image
    if (req.file) {
      // Remove the old image file
      const oldImagePath = path.join(
        __dirname,
        "../frontend/src/studentPage/assets/images",
        imageUrl
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      imageUrl = req.file.filename;
    }

    // Update the item
    const updatedItem = await Item.findByIdAndUpdate(
      id,
      { name, email, imageUrl },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/items/:id", async (req, res) => {
  try {
    // Find the item to get its image URL
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Delete the image file if it exists
    if (item.imageUrl) {
      const imagePath = path.join(
        __dirname,
        "../frontend/src/studentPage/assets/images",
        item.imageUrl
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the item from the database
    await Item.findByIdAndDelete(req.params.id);

    res.json({ message: "Item and associated image deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/items", async (req, res) => {
  try {
    const items = await Item.find({});
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/items/particular/:id", async (req, res) => {
  try {
    const items = await Item.findById(req.params.id);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ____________________ student details finish _______________________

// ________________Master details ________________________

const MasterSchema = new mongoose.Schema({
  staffname: String,
  Price: Number,
});

const MasterItem = mongoose.model("masterItem", MasterSchema);
app.post("/masterAdd", async (req, res) => {
  try {
    // Check if a document already exists
    const existingData = await MasterItem.findOne();

    if (existingData) {
      return res.status(400).json({ msg: "Only one entry is allowed." });
    }

    // Create a new entry if no document exists
    const masterData = new MasterItem({
      ...req.body,
    });
    const SaveMasterData = await masterData.save();

    res.json({ SaveMasterData, msg: "Data Added" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while adding data." });
  }
});

app.get("/masterGetData", async (req, res) => {
  const Getdata = await MasterItem.find({});

  res.json({ Getdata, msg: "!Data recived successfully " });
});

app.put("/masterUpdate/:id", async (req, res) => {
  const UpdateData = await MasterItem.findByIdAndUpdate(
    req.params.id,
    {
      $set: req.body,
    },
    { new: true }
  );

  res.json({
    UpdateData,
    msg: "!Data Update successfullly",
  });
});

app.delete("/masterDelete/:id", async (req, res) => {
  const Deletedata = await MasterItem.findByIdAndDelete(req.params.id);

  res.json({
    Deletedata,
    msg: "!Data Deleted successfullly",
  });
});

// __________________________login data___________________

const LoginSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

const loginAuth = mongoose.model("Login", LoginSchema);

app.post("/loginauth", async (req, res) => {
  try {
    const email = await loginAuth.findOne({ email: req.body.email });
    if (email) return res.json("email already exist");

    // Check if a document already exists
    const existingData = await loginAuth.findOne();

    if (existingData) {
      return res.status(400).json({ msg: "Only one entry is allowed." });
    }

    const hasspass = await bcrpt.hash(req.body.password, 7);
    // Create a new entry if no document exists
    const LoginData = new loginAuth({
      ...req.body,
      password: hasspass,
    });

    const SaveLoginData = await LoginData.save();

    res.json({ SaveLoginData, msg: "Data create succesfully" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while adding data." });
  }
});

// forget pass

// app.post("/verifyOtp", async (req, res) => {
//   const { email, otp } = req.body;
//   // Verify the OTP here
//   if ((email, otp)) {
//     const token = Math.random().toString(36).slice(-8); // Create a secure token
//     res.json({ success: true, token });
//   } else {
//     res.json({ success: false, message: "Invalid OTP" });
//   }
// });

app.post("/forgotPassword", async (req, res) => {
  const email = await loginAuth.findOne({ email: req.body.email });
  if (!email) return res.json("Email not found!");

  // Generate a token for password reset
  // const resetToken = crypto.randomBytes(32).toString("hex");
  const token = Math.random().toString(36).slice(-8);

  // Store the token in the database (you should add a field for this in your user schema)
  email.resetPasswordToken = token;
  email.resetPasswordExpires = Date.now() + 36000; // 1 hour
  await email.save();

  const transporter = nodemailer.createTransport({
    service: "Gmail", // or another email provider
    auth: {
      user: "susee37432@gmail.com", // Your email
      pass: "kafvmbfupnthpdmc", // Your email password or app password
    },
  });

  // Send the email
  const mailOptions = {
    from: "susee37432@gmail.com",
    to: email.email,
    subject: "Password Reset",
    html: `<p>Hello, ${email.name}</p>
           <p>You requested a password reset. Please click the link below to reset your password token:${token}</p>
           
           <p>If you did not request this, please ignore this email.</p>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: "Error sending email", error });
    }
    res.json({
      message: `Reset link sent to your email ${token}`,
      token,
    });
  });
});

app.post("/resetPassword/:token", async (req, res) => {
  const user = await loginAuth.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }, // Check if token is still valid
  });
  // const user = await loginAuth.findOne({});

  console.log(user);

  if (!user)
    return res.json({
      msg: "Password reset token is invalid or has expired",
      data: user,
    });

  // Update the user's password
  const hashedPassword = await bcrpt.hash(req.body.password, 10); // Hash new password
  user.password = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.json({ message: "Password has been reset successfully" });
});

// ______________

app.post("/loginAllowed", async (req, res) => {
  const email = await loginAuth.findOne({ email: req.body.email });
  if (!email) return res.json("!email not valid");

  const password = await bcrpt.compare(req.body.password, email.password);
  if (!password) return res.json("!password not valid");

  const token = await jwt.sign({ email: email.email }, "ragasiyam", {
    expiresIn: "1d",
  });

  res.json({
    msg: `Token created:mr.${email.name}, This is  product routed , and then you'r token ,${token} `,
    message: "login successfully",
    token,
  });
});

//  server create
app.listen(3003, () => {
  console.log("server is running port:3003");
});
