const axios = require('axios');
const fs = require('fs');

async function getRelated(id) {
  try {
    const res = await axios.get('https://www.youtube.com/watch?v=' + id);
    const match = res.data.match(/var ytInitialData = (\{.*?\});<\/script>/);
    if (match) {
      const data = JSON.parse(match[1]);
      fs.writeFileSync('scratch/yt.json', JSON.stringify(data, null, 2));
      console.log('Saved to yt.json');
    }
  } catch (err) {
    console.error(err.message);
  }
}

getRelated('dQw4w9WgXcQ');
