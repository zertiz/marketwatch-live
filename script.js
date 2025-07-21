// script.js

async function fetchData() {
  const cryptoUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,tron,polkadot,polygon,chainlink';
  const stockUrl = 'https://financialmodelingprep.com/api/v3/quote/AAPL,NVDA,MSFT,TSLA,AMZN,META,GOOG,JPM,BAC,V?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';
  const forexUrl = 'https://financialmodelingprep.com/api/v3/quote/EURUSD,USDJPY,GBPUSD,AUDUSD,USDCAD,USDCHF,USDCNY,USDHKD,USDSEK,USDSGD?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';
  // Correction de l'URL des indices : encodage des '^' en '%5E' pour corriger l'erreur 404
  const indicesUrl = 'https://financialmodelingprep.com/api/v3/quote/%5EDJI,%5EIXIC,%5EGSPC,%5EFCHI,%5EGDAXI,%5EFTSE,%5EN225,%5EHSI,%5ESSMI,%5EBVSP?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';
  const commoditiesUrl = 'https://financialmodelingprep.com/api/v3/quote/GCUSD,SIUSD,CLUSD,NGUSD,HGUSD,ALIUSD,PAUSD,PLUSD,KCUSD,SBUSD?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';

  try {
    const [cryptoRes, stockRes, forexRes, indicesRes, commoditiesRes] = await Promise.all([
      fetch(cryptoUrl),
      fetch(stockUrl),
      fetch(forexUrl),
      fetch(indicesUrl),
      fetch(commoditiesUrl)
    ]);

    let cryptoData = await cryptoRes.json();
    let stockData = await stockRes.json();
    let forexData = await forexRes.json();
    let indicesData = await indicesRes.json();
    let commoditiesData = await commoditiesRes.json();

    // Vérifications robustes pour s'assurer que les données sont des tableaux
    if (!Array.isArray(stockData)) {
        console.error("Données de bourse invalides ou manquantes. Initialisation à un tableau vide.");
        stockData = [];
    }
    if (!Array.isArray(cryptoData)) {
        console.error("Données de crypto invalides ou manquantes. Initialisation à un tableau vide.");
        cryptoData = [];
    }
    if (!Array.isArray(forexData)) {
        console.error("Données de forex invalides ou manquantes. Initialisation à un tableau vide.");
        forexData = [];
    }
    if (!Array.isArray(indicesData)) {
        console.error("Données d'indices invalides ou manquantes. Initialisation à un tableau vide.");
        indicesData = [];
    }
    if (!Array.isArray(commoditiesData)) {
        console.error("Données de matières premières invalides ou manquantes. Initialisation à un tableau vide.");
        commoditiesData = [];
    }

    updateLists(stockData, cryptoData, forexData, indicesData, commoditiesData);
    // Concaténation des indices et des matières premières pour la mise à jour des indices latéraux
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
      // Utilisation d'un proxy pour contourner les problèmes de CORS
      const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(feed.url);
      const res = await fetch(proxyUrl);
      const data = await res.json();

      const parser = new DOMParser();
      // Analyse du contenu XML du flux RSS
      const xml = parser.parseFromString(data.contents, 'text/xml');
      const items = xml.querySelectorAll('item');

      html += `<h3 class="news-source">${feed.label}</h3>`;

      items.forEach((item, index) => {
        // Limite à 4 articles par flux pour ne pas surcharger
        if (index >= 4) return;

        const title = item.querySelector('title')?.textContent ?? '';
        const link = item.querySelector('link')?.textContent ?? '';
        const pubDate = new Date(item.querySelector('pubDate')?.textContent ?? '').toLocaleDateString();
        const description = item.querySelector('description')?.textContent ?? '';

        // Détection de l'URL de l'image dans la description ou via les balises media
        let imageUrl = '';
        const imgMatch = description.match(/<img.*?src=["'](.*?)["']/i);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        } else {
          const media = item.querySelector('media\\:content, enclosure');
          if (media && media.getAttribute('url')) {
            imageUrl = media.getAttribute('url');
          } else {
            // Image de substitution si aucune image n'est trouvée
            imageUrl = 'https://placehold.co/150x100/A0A0A0/FFFFFF?text=No+Image';
          }
        }

        html += `
          <div class="news-card">
            <img src="${imageUrl}" alt="Image de l'article" class="news-thumb">
            <div class="news-content">
              <h4><a href="${link}" target="_blank">${title}</a></h4>
              <p class="news-date">${pubDate} • ${feed.label}</p>
            </div>
          </div>
        `;
      });
    }

    // Affichage des actualités ou d'un message si aucune n'est trouvée
    newsContainer.innerHTML = html || '<p>Aucune actualité trouvée.</p>';
  } catch (error) {
    console.error("Erreur lors du chargement des actualités :", error);
    newsContainer.innerHTML = '<p>Erreur de chargement des actualités.</p>';
  }
}

function updateLists(stocks, cryptos, forex, indices, commodities) {
  const stockList = document.getElementById('stock-list');
  const cryptoList = document.getElementById('crypto-list');
  const recList = document.getElementById('recommendations');

  if (!stockList || !cryptoList || !recList) return;

  // Nettoyage des listes avant d'ajouter de nouvelles données
  stockList.innerHTML = '';
  cryptoList.innerHTML = '';

  // Concaténation de toutes les données d'actifs pour les recommandations et l'affichage principal
  const allAssets = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(cryptos) ? cryptos : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  allAssets.forEach(asset => {
    // Récupération des données pertinentes avec des valeurs par défaut
    const change = asset.price_change_percentage_24h ?? asset.changesPercentage ?? 0;
    const price = asset.current_price ?? asset.price ?? 0;
    const cap = asset.market_cap ?? asset.marketCap ?? 0;
    const isGain = change >= 0;
    const recommendation = change > 3 ? 'Acheter' : change < -3 ? 'Vendre' : 'Conserver';
    const changeClass = isGain ? 'gain' : 'loss';

    // Création de la ligne de tableau pour chaque actif
    const row = `
      <tr>
        <td>${asset.name}</td>
        <td>$${price.toLocaleString()}</td>
        <td class="${changeClass}">${change.toFixed(2)}%</td>
        <td>${cap ? '$' + (cap / 1e9).toFixed(1) + 'B' : 'N/A'}</td>
        <td>${recommendation}</td>
      </tr>
    `;

    // Détermination si l'actif est une cryptomonnaie pour l'afficher dans la bonne section
    const isCrypto = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOGE', 'TRX', 'DOT', 'MATIC', 'LINK'].includes(asset.symbol?.toUpperCase());
    
    if (isCrypto) {
      cryptoList.innerHTML += row;
    } else {
      // Toutes les autres données (actions, forex, indices, matières premières) vont dans la liste des actions
      stockList.innerHTML += row;
    }
  });

  // Mise à jour de la liste des recommandations
  recList.innerHTML = allAssets.map(asset => {
    const change = asset.price_change_percentage_24h ?? asset.changesPercentage ?? 0;
    const recommendation = change > 3 ? '📈 Acheter' : change < -3 ? '📉 Vendre' : '🤝 Conserver';
    return `<li>${asset.name}: ${recommendation}</li>`;
  }).join('');
}

function updateIndices(data) {
  const list = document.getElementById('indices-list');
  if (!list) return;

  // Vérification que les données sont un tableau avant de les traiter
  if (!Array.isArray(data)) {
    console.error("Données pour updateIndices ne sont pas un tableau.", data);
    return;
  }

  // Mise à jour de la liste des indices du marché
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

      // Gestion des classes actives pour la navigation
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Affichage de la section correspondante et masquage des autres
      document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
      const activeSection = document.getElementById(section);
      if (activeSection) activeSection.classList.remove('hidden');

      // Si la section "Actualité" est activée, déclencher la récupération des actualités
      if (section === 'news') fetchNews();
    });
  });
}

// Initialisation de la navigation et récupération des données au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  handleNavigation();
  fetchData();
  // Intervalle de rafraîchissement des données (très long ici, ajuster si nécessaire)
  setInterval(fetchData, 1000000); 
});