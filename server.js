const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');

const app = express();
app.use(cors());

// Fonction pour extraire les données JSON de la page
function extractSessionData(html) {
  const lastSessionMatch = html.match(/var last_session_data = (\[\[.*?\]\]);/s);
  if (lastSessionMatch) {
    try {
      const sessionData = JSON.parse(lastSessionMatch[1]);
      return sessionData.map(lap => ({
        lap: lap[0],
        time: lap[2].time,
        time_millisecond: lap[2].time_millisecond,
      }));
    } catch (e) {
      console.error('Erreur parsing JSON:', e);
      return null;
    }
  }
  return null;
}

// Fonction pour extraire le meilleur temps
function extractBestTime($) {
  const recordElement = $('.block_records .div_records').first();
  const trackName = recordElement.find('.track_name').text().trim();
  const time = recordElement.find('.time').text().trim();
  const rank = recordElement.find('.rank').attr('data-rank');
  const kart = recordElement.find('.kart').text().trim();

  return {
    track: trackName,
    time: parseFloat(time),
    rank: parseInt(rank),
    kart
  };
}

// Fonction pour extraire les temps du tableau des résultats
function extractTableResults($) {
  const results = [];
  $('.results_table tbody tr').each((index, element) => {
    results.push({
      session: $(element).find('.race').text().trim(),
      time: parseFloat($(element).find('.time').text().trim()),
      position: parseInt($(element).find('.rank').text().trim()),
      date: $(element).find('.date').text().trim()
    });
  });
  return results;
}

app.get('/api/karting/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const response = await axios.get('https://www.apex-timing.com/gokarts/member.php', {
      params: {
        center: 162,
        member: memberId
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Extraire les données de la dernière session
    const lastSessionData = extractSessionData(response.data);

    // Extraire le meilleur temps
    const bestTime = extractBestTime($);

    // Extraire les résultats du tableau
    const tableResults = extractTableResults($);

    // Extraire les statistiques générales
    const stats = {
      totalSessions: $('.statistic_sessions .title').text().replace('Sessions :', '').trim(),
      totalRaces: $('.statistic_races .title').text().replace('Courses :', '').trim(),
      distance: $('.distance').text().replace('Distance parcourue :', '').trim()
    };

    res.json({
      lastSession: {
        laps: lastSessionData
      },
      record: bestTime,
      recentResults: tableResults.slice(0, 10),
      stats
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des données',
      details: error.message
    });
  }
});

app.get('/api/search/:pseudo', async (req, res) => {
  try {
    const { pseudo } = req.params;
    const response = await axios.post(
        'https://www.apex-timing.com/gokarts/functions/request_results.php',
        new URLSearchParams({
          center_id: 162,
          challenge_id: 0,
          track_id: 1,
          kart_id: 1,
          period_id: 0,
          period_start: '',
          period_end: '',
          age_min: 0,
          age_max: 0,
          sex: 0,
          weight: 0,
          start: 1,
          count: 20,
          search: pseudo
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
    );

    if (!response.data.member_info) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    res.json({
      id: response.data.member_info.id,
      name: response.data.member_info.name
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      error: 'Erreur lors de la recherche',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});