const express = require('express');
const cors = require('cors'); // เพิ่มเข้ามา
const validUrl = require('valid-url');
const shortid = require('shortid');

const sequelize = require('./config/database');
const Url = require('./models/Url');

const app = express();
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Middleware
app.use(cors()); // เพิ่มเข้ามา
app.use(express.json());

// Sync database
sequelize.sync().then(() => console.log('Database synced!'));

// *** ROUTE ที่แก้ไข ***
app.post('/api/shorten', async (req, res) => {
  const { longUrl, customCode } = req.body; // รับ customCode เพิ่ม

  if (!validUrl.isUri(longUrl)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    let urlCode;
    if (customCode) {
      // ถ้ามี customCode, เช็คว่าซ้ำมั้ย
      const existing = await Url.findOne({ where: { urlCode: customCode } });
      if (existing) {
        return res.status(400).json({ error: 'Custom name already taken' });
      }
      urlCode = customCode;
    } else {
      // ถ้าไม่มี ก็สุ่มเหมือนเดิม
      urlCode = shortid.generate();
    }

    const shortUrl = `${BASE_URL}/${urlCode}`;
    const url = await Url.create({ longUrl, shortUrl, urlCode });
    res.status(201).json(url);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// *** ROUTE ที่สร้างใหม่ ***
app.get('/api/stats/:code', async (req, res) => {
    try {
        const url = await Url.findOne({ where: { urlCode: req.params.code } });
        if (url) {
            res.status(200).json({
                longUrl: url.longUrl,
                shortUrl: url.shortUrl,
                clicks: url.clicks
            });
        } else {
            res.status(404).json({ error: 'No URL found for this code' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Route สำหรับ redirect (อันนี้เหมือนเดิม)
app.get('/:code', async (req, res) => {
  try {
    const url = await Url.findOne({ where: { urlCode: req.params.code } });

    if (url) {
      url.clicks++;
      await url.save();
      return res.redirect(url.longUrl);
    } else {
      return res.status(404).json({ error: 'No URL found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});