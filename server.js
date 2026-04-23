require('dotenv').config();
const express = require('express');
const cors = require('cors');
const checkRoute = require('./routes/check');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/check', checkRoute);

app.get('/', (req, res) => {
  res.json({ status: 'AI Truth Checker API running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});