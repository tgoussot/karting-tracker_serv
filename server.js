const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());

app.get('/api/karting/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const response = await axios.get(`https://www.apex-timing.com/gokarts/member.php`, {
      params: {
        center: 162,
        member: memberId
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const data = response.data;
    
    // Extraire les temps du HTML
    const regex = /time":"(\d+\.\d+)"/g;
    const times = [];
    let match;
    
    while ((match = regex.exec(data)) !== null) {
      times.push({
        time: parseFloat(match[1]),
        date: new Date().toISOString().split('T')[0] // Pour l'exemple
      });
    }

    res.json(times.slice(0, 10));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
