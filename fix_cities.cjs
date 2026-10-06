const fs = require('fs');
let data = JSON.parse(fs.readFileSync('config/cities.json', 'utf8'));

const newCities = [
  {
    "key": "saint_denis",
    "name": "Saint-Denis",
    "osmId": 87922,
    "bbox": "48.9014901,2.3332192,48.9521346,2.3981181",
    "center": [
      48.92681235,
      2.36566865
    ]
  },
  {
    "key": "saint_malo",
    "name": "Saint-Malo",
    "osmId": 905534,
    "bbox": "48.5979853,-2.0765246,48.6949736,-1.9367259",
    "center": [
      48.64647945,
      -2.00662525
    ]
  },
  {
    "key": "saint_quentin",
    "name": "Saint-Quentin",
    "osmId": 153656,
    "bbox": "49.8201747,3.2280971,49.8748622,3.3298948",
    "center": [
      49.84751845,
      3.2789959499999997
    ]
  },
  {
    "key": "saint_germain_en_laye",
    "name": "Saint-Germain-en-Laye",
    "osmId": 105809,
    "bbox": "48.87441,2.01633,48.94827,2.11283",
    "center": [
      48.91134,
      2.06458
    ]
  }
];

for (let nc of newCities) {
  if (!data.find(c => c.key === nc.key)) {
    data.push(nc);
  }
}

fs.writeFileSync('config/cities.json', JSON.stringify(data, null, 2));
