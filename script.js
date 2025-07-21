async function fetchData() {
  const cryptoUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,tron,polkadot,polygon,chainlink';
  const stockUrl = 'https://financialmodelingprep.com/api/v3/quote/AAPL,NVDA,MSFT,TSLA,AMZN,META,GOOG,JPM,BAC,V';
  const forexUrl = 'https://financialmodelingprep.com/api/v3/quote/EURUSD,USDJPY,GBPUSD,AUDUSD,USDCAD,USDCHF,USDCNY,USDHKD,USDSEK,USDSGD';
  const indicesUrl = 'https://financialmodelingprep.com/api/v3/quote/^DJI,^IXIC,^GSPC,^FCHI,^GDAXI,^FTSE,^N225,^HSI,^SSMI,^BVSP';
  const commoditiesUrl = 'https://financialmodelingprep.com/api/v3/quote/GCUSD,SIUSD,CLUSD,NGUSD,HGUSD,ALIUSD,PAUSD,PLUSD,KCUSD,SBUSD';

  try {
    const [cryptoRes, stockRes, forexRes, indicesRes, commoditiesRes] = await Promise.all([
      fetch(cryptoUrl),
      fetch(stockUrl),
      fetch(forexUrl),
      fetch(indicesUrl),
      fetch(commoditiesUrl)
    ]);

    const cryptoData = await cryptoRes.json();
    const stockData = await stockRes.json();
    const forexData = await forexRes.json();
    const indicesData = await indicesRes.json();
    const commoditiesData = await commoditiesRes.json();

    if (!Array.isArray(stockData) || !Array.isArray(cryptoData)) {
      throw new Error("Données de bourse ou crypto invalides");
    }

    updateLists(stockData, cryptoData, forexData, indicesData, commoditiesData);
    updateIndices([...indicesData, ...commoditiesData]);
  } catch (error) {
    console.error("Erreur lors du chargement des données :", error);
  }
}

async function fetchNews() {
  const newsContainer = document.getElementById('news-articles');
  newsContainer.innerHTML = '<p>Chargement des actualités...</p>';

  const feeds = [
    {
      url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
      label: 'Wall Street Journal'
    },
    {
      url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
      label: 'CNBC Markets'
    },
    {
      url: 'https://www.marketwatch.com/rss/topstories',
      label: 'MarketWatch'
    }
  ];

  try {
    let html = '';

    for (const feed of feeds) {
      const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(feed.url);
      const res = await fetch(proxyUrl);
      const data = await res.json();

      const parser = new DOMParser();
      const xml = parser.parseFromString(data.contents, 'text/xml');
      const items = xml.querySelectorAll('item');

      html += `<h3 class="news-source">${feed.label}</h3>`;

      items.forEach((item, index) => {
        if (index >= 4) return;

        const title = item.querySelector('title')?.textContent ?? '';
        const link = item.querySelector('link')?.textContent ?? '';
        const pubDate = new Date(item.querySelector('pubDate')?.textContent ?? '').toLocaleDateString();
        const description = item.querySelector('description')?.textContent ?? '';

        // Détection image via <img src="...">
        let imageUrl = '';
        const imgMatch = description.match(/<img.*?src=["'](.*?)["']/i);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        } else {
          // Tentative de récupération depuis <media:content> ou <enclosure>
          const media = item.querySelector('media\\:content, enclosure');
          if (media && media.getAttribute('url')) {
            imageUrl = media.getAttribute('url');
          } else {
            imageUrl = 'https://via.placeholder.com/150';
          }
        }

        html += `
          <div class="news-card">
            <img src="${imageUrl}" alt="Image" class="news-thumb">
            <div class="news-content">
              <h4><a href="${link}" target="_blank">${title}</a></h4>
              <p class="news-date">${pubDate} • ${feed.label}</p>
            </div>
          </div>
        `;
      });
    }

    newsContainer.innerHTML = html || '<p>Aucune actualité trouvée.</p>';
  } catch (error) {
    console.error("Erreur actualités :", error);
    newsContainer.innerHTML = '<p>Erreur de chargement des actualités.</p>';
  }
}


function updateLists(stocks, cryptos, forex, indices, commodities) {
  const stockList = document.getElementById('stock-list');
  const cryptoList = document.getElementById('crypto-list');
  const recList = document.getElementById('recommendations');

  if (!stockList || !cryptoList || !recList) return;

  stockList.innerHTML = '';
  cryptoList.innerHTML = '';

  const allAssets = [...stocks, ...cryptos, ...forex, ...indices, ...commodities];

  allAssets.forEach(asset => {
    const change = asset.price_change_percentage_24h ?? asset.changesPercentage ?? 0;
    const price = asset.current_price ?? asset.price ?? 0;
    const cap = asset.market_cap ?? asset.marketCap ?? 0;
    const isGain = change >= 0;
    const recommendation = change > 3 ? 'Acheter' : change < -3 ? 'Vendre' : 'Conserver';
    const changeClass = isGain ? 'gain' : 'loss';

    const row = `
      <tr>
        <td>${asset.name}</td>
        <td>$${price.toLocaleString()}</td>
        <td class="${changeClass}">${change.toFixed(2)}%</td>
        <td>${cap ? '$' + (cap / 1e9).toFixed(1) + 'B' : 'N/A'}</td>
        <td>${recommendation}</td>
      </tr>
    `;
 const isCrypto = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'TRX', 'DOT', 'MATIC', 'LINK'].includes(asset.symbol?.toUpperCase());
    const isForex = asset.symbol?.length === 6 && /^[A-Z]{6}$/.test(asset.symbol);
    const isIndex = asset.symbol?.startsWith('^');
    const isCommodity = ['GCUSD','SIUSD','CLUSD','NGUSD','HGUSD','ALIUSD','PAUSD','PLUSD','KCUSD','SBUSD'].includes(asset.symbol);

    if (isCrypto) {
      cryptoList.innerHTML += row;
    } else {
      stockList.innerHTML += row;
    }
  });

  recList.innerHTML = allAssets.map(asset => {
    const change = asset.price_change_percentage_24h ?? asset.changesPercentage;
    const recommendation = change > 3 ? '📈 Acheter' : change < -3 ? '📉 Vendre' : '🤝 Conserver';
    return `<li>${asset.name}: ${recommendation}</li>`;
  }).join('');
}

function updateIndices(data) {
  const list = document.getElementById('indices-list');
  list.innerHTML = data.map(item => {
    const change = item.changesPercentage?.toFixed(2);
    const cls = change >= 0 ? 'gain' : 'loss';
    return `<li>${item.name}: <span class="${cls}">${change}%</span></li>`;
  }).join('');
}

function handleNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;

      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
      const activeSection = document.getElementById(section);
      if (activeSection) activeSection.classList.remove('hidden');

      if (section === 'news') fetchNews();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  handleNavigation();
  fetchData();
  setInterval(fetchData, 1000000);
});
