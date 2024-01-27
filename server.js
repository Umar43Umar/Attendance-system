// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config()


// Create Express app
const app = express();
const PORT = 4000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL);

// Define MongoDB schemas for User and Attendance
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  profilePicture: String,
});

const attendanceSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  date: { type: Date, default: Date.now },
  present: Boolean,
});

const User = mongoose.model('User', userSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

// Middleware
app.use(bodyParser.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, 'secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

// Routes
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username, password });
    await user.save();
    res.sendStatus(201);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const accessToken = jwt.sign({ username: user.username }, 'secret');
    res.json({ accessToken });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/mark-attendance', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const today = new Date().setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({ userId, date: today });
    if (existingAttendance) {
      return res.status(400).json({ error: 'Attendance already marked for today.' });
    }

    const newAttendance = new Attendance({ userId, present: true });
    await newAttendance.save();
    res.sendStatus(201);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/view-attendance', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const attendance = await Attendance.find({ userId });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.patch('/edit-profile-picture', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { profilePicture } = req.body;

    await User.updateOne({ _id: userId }, { profilePicture });
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});