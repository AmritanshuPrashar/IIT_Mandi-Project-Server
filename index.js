const express = require('express');
const app = express();
const PORT = 4000;
const db = require('./config/database');
const userRoutes = require('./routes/userRoutes')
const sensorRoutes = require('./routes/sensorRoutes');
const actuatorRoutes = require('./routes/actuatorRoutes')
const session = require('express-session');
const passport = require('passport');
const cors = require("cors");
const cookieParser = require('cookie-parser');
const csv = require('csv-parser');
const fs = require('fs');
app.use(cookieParser());
require('dotenv').config();


app.use(cors(
  origin = '*', 
  methods = 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials = true
));
app.get('/', (req, res) => {
  res.json({
    message: {
      Created_By : "Amritanshu Prashar 'https://devbyamri.tech'",
      new_URL : "Please forward to 'https://research.iitmandi.ac.in/cca'"
    }
  })
})
app.use(express.json());
app.use('/sensor', sensorRoutes);
app.use('/user', userRoutes);
app.use('/act',actuatorRoutes)

app.listen(PORT, () => {
  console.log(`API listening on PORT ${PORT}`);
});
