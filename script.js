// Variables globales pour stocker toutes les données récupérées
let allFetchedData = {
  stocks: [],
  cryptos: [],
  forex: [],
  indices: [],
  commodities: []
};

// Variable pour garder en mémoire la dernière section active avant une recherche
let lastActiveSection = 'home';

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

    // Récupération des données JSON
    let cryptoData = await cryptoRes.json();
    let stockData = await stockRes.json();
    let forexData = await forexRes.json();
    let indicesData = await indicesRes.json();
    let commoditiesData = await commoditiesRes.json();

    // Vérifications robustes pour s'assurer que les données sont des tableaux
    // Si les données ne sont pas un tableau, elles sont initialisées à un tableau vide
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

    // Stockage des données dans les variables globales
    allFetchedData.stocks = stockData;
    allFetchedData.cryptos = cryptoData;
    allFetchedData.forex = forexData;
    allFetchedData.indices = indicesData;
    allFetchedData.commodities = commoditiesData;

    // Mise à jour initiale des listes avec toutes les données
    updateLists(allFetchedData.stocks, allFetchedData.cryptos, allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
    updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);

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

// Fonction pour mettre à jour les listes d'actions et de cryptos
function updateLists(stocks, cryptos, forex, indices, commodities) {
  const stockListTableBody = document.getElementById('stock-list');
  const cryptoListTableBody = document.getElementById('crypto-list');
  const recList = document.getElementById('recommendations');

  if (!stockListTableBody || !cryptoListTableBody || !recList) return;

  // Nettoyage des listes avant d'ajouter de nouvelles données
  stockListTableBody.innerHTML = '';
  cryptoListTableBody.innerHTML = '';

  // Combine tous les actifs non-crypto pour le tableau des actions
  const nonCryptoAssets = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  // Remplir le tableau des actions
  nonCryptoAssets.forEach(asset => {
    const change = asset.changesPercentage ?? 0;
    const price = asset.price ?? 0;
    const cap = asset.marketCap ?? 0;
    const isGain = change >= 0;
    const recommendation = change > 3 ? 'Acheter' : change < -3 ? 'Vendre' : 'Conserver';
    const changeClass = isGain ? 'gain' : 'loss';

    // Ajout d'un attribut data-symbol et data-type pour le clic
    // Utilisez asset.symbol pour FMP, et un type générique comme 'stock_fmp' pour les distinguer
    const row = `
      <tr onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">
        <td>${asset.name}</td>
        <td>$${price.toLocaleString()}</td>
        <td class="${changeClass}">${change.toFixed(2)}%</td>
        <td>${cap ? '$' + (cap / 1e9).toFixed(1) + 'B' : 'N/A'}</td>
        <td>${recommendation}</td>
      </tr>
    `;
    stockListTableBody.innerHTML += row;
  });

  // Remplir le tableau des cryptomonnaies
  (Array.isArray(cryptos) ? cryptos : []).forEach(asset => {
    const change = asset.price_change_percentage_24h ?? 0;
    const price = asset.current_price ?? 0;
    const cap = asset.market_cap ?? 0;
    const isGain = change >= 0;
    const recommendation = change > 3 ? 'Acheter' : change < -3 ? 'Vendre' : 'Conserver';
    const changeClass = isGain ? 'gain' : 'loss';

    // Ajout d'un attribut data-symbol et data-type pour le clic (utiliser asset.id pour crypto CoinGecko)
    const row = `
      <tr onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">
        <td>${asset.name}</td>
        <td>$${price.toLocaleString()}</td>
        <td class="${changeClass}">${change.toFixed(2)}%</td>
        <td>${cap ? '$' + (cap / 1e9).toFixed(1) + 'B' : 'N/A'}</td>
        <td>${recommendation}</td>
      </tr>
    `;
    cryptoListTableBody.innerHTML += row;
  });

  // Combine tous les actifs pour les recommandations
  const allAssetsForRecommendations = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(cryptos) ? cryptos : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  recList.innerHTML = allAssetsForRecommendations.map(asset => {
    const change = asset.price_change_percentage_24h ?? asset.changesPercentage ?? 0;
    const recommendation = change > 3 ? '📈 Acheter' : change < -3 ? '📉 Vendre' : '🤝 Conserver';
    return `<li>${asset.name}: ${recommendation}</li>`;
  }).join('');
}

// Fonction pour mettre à jour la liste des indices dans la barre latérale
function updateIndices(data) {
  const list = document.getElementById('indices-list');
  if (!list) return;

  // Vérification que les données sont un tableau avant de les traiter
  if (!Array.isArray(data)) {
    console.error("Données pour updateIndices ne sont pas un tableau.", data);
    return;
  }

  list.innerHTML = data.map(item => {
    const change = item.changesPercentage?.toFixed(2);
    const cls = change >= 0 ? 'gain' : 'loss';
    return `<li>${item.name}: <span class="${cls}">${change}%</span></li>`;
  }).join('');
}

// Fonction pour filtrer et afficher les résultats de recherche
function performSearch(query) {
  const lowerCaseQuery = query.toLowerCase();

  // Si la requête est vide, revenir à la vue de la dernière section active
  if (query === '') {
    // Restaurer le lien de navigation actif
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-section="${lastActiveSection}"]`).classList.add('active');

    // Restaurer la section de contenu active
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(lastActiveSection).classList.remove('hidden');

    // Re-remplir les listes avec toutes les données en fonction de la section restaurée
    if (lastActiveSection === 'stocks') {
      updateLists(allFetchedData.stocks, allFetchedData.cryptos, allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
    } else if (lastActiveSection === 'crypto') {
      updateLists([], allFetchedData.cryptos, [], [], []); // Seulement les données crypto pour la section crypto
    } else if (lastActiveSection === 'news') {
      fetchNews(); // Re-fetch les actualités si c'était l'onglet actif
    }
    // Pour les recommandations générales et les indices de la barre latérale, utiliser toutes les données
    updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);
    return; // Quitter la fonction
  }

  // Stocker la section active actuelle avant d'effectuer la recherche
  const currentActiveNavLink = document.querySelector('.nav-link.active');
  if (currentActiveNavLink) {
    lastActiveSection = currentActiveNavLink.dataset.section;
  }

  // Filtrer tous les types de données
  const filteredStocks = allFetchedData.stocks.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol.toLowerCase().includes(lowerCaseQuery)
  );
  const filteredCryptos = allFetchedData.cryptos.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol?.toLowerCase().includes(lowerCaseQuery) || asset.id?.toLowerCase().includes(lowerCaseQuery)
  );
  const filteredForex = allFetchedData.forex.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol.toLowerCase().includes(lowerCaseQuery)
  );
  const filteredIndices = allFetchedData.indices.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol?.toLowerCase().includes(lowerCaseQuery)
  );
  const filteredCommodities = allFetchedData.commodities.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol.toLowerCase().includes(lowerCaseQuery)
  );

  // Désactiver tous les liens de navigation et activer 'Bourse' pour les résultats de recherche
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector('.nav-link[data-section="stocks"]').classList.add('active');

  // Masquer toutes les sections de contenu et afficher la section 'stocks' pour les résultats de recherche
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById('stocks').classList.remove('hidden');

  // Mettre à jour les listes avec les données filtrées
  updateLists(filteredStocks, filteredCryptos, filteredForex, filteredIndices, filteredCommodities);
  // Mettre à jour les indices de la barre latérale avec les indices et matières premières filtrés
  updateIndices([...filteredIndices, ...filteredCommodities]);
}

// Gestion de la navigation entre les sections
function handleNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;

      // Mettre à jour la dernière section active lorsque l'on clique sur un lien de navigation
      lastActiveSection = section;

      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
      const activeSection = document.getElementById(section);
      if (activeSection) activeSection.classList.remove('hidden');

      // Si l'on bascule vers un onglet affichant des données, re-remplir avec toutes les données
      if (section === 'stocks') {
        updateLists(allFetchedData.stocks, allFetchedData.cryptos, allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
        updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);
      } else if (section === 'crypto') {
        updateLists([], allFetchedData.cryptos, [], [], []); // Seulement les données crypto
        // Pour les recommandations et les indices latéraux, utiliser toutes les données
        updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);
      } else if (section === 'news') {
        fetchNews();
      }
      // Effacer la barre de recherche lors de la navigation
      document.querySelector('.search-bar').value = '';
    });
  });
}

// Variables pour le graphique
let myChart; // Pour stocker l'instance du graphique Chart.js

// Fonction pour afficher le modal du graphique
async function showChartModal(symbol, type, name) {
  const modal = document.getElementById('chartModal');
  const chartTitle = document.getElementById('chartTitle');
  const chartLoading = document.getElementById('chartLoading');
  const chartError = document.getElementById('chartError');
  const chartCanvas = document.getElementById('historicalChart');
  const ctx = chartCanvas.getContext('2d');

  chartTitle.textContent = `Graphique de l'évolution de ${name}`;
  chartLoading.classList.remove('hidden');
  chartError.classList.add('hidden');
  modal.classList.remove('hidden'); // Afficher le modal

  // Détruire l'ancien graphique s'il existe
  if (myChart) {
    myChart.destroy();
  }

  try {
    const historicalData = await fetchHistoricalData(symbol, type);

    if (historicalData && historicalData.length > 0) {
      renderChart(historicalData, name, ctx);
      chartLoading.classList.add('hidden');
    } else {
      chartLoading.classList.add('hidden');
      chartError.classList.remove('hidden');
      chartError.textContent = "Aucune donnée historique disponible pour cet actif.";
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données historiques :", error);
    chartLoading.classList.add('hidden');
    chartError.classList.remove('hidden');
    chartError.textContent = "Erreur lors du chargement des données historiques. Veuillez réessayer plus tard.";
  }
}

// Fonction pour fermer le modal du graphique
function closeChartModal() {
  document.getElementById('chartModal').classList.add('hidden');
  if (myChart) {
    myChart.destroy(); // Détruire le graphique pour libérer les ressources
  }
}

// Fonction pour récupérer les données historiques
async function fetchHistoricalData(symbol, type) {
  const apiKey = '86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS'; // Votre clé API FMP
  let url = '';
  let dataPath = ''; // Pour savoir où se trouvent les données de prix dans la réponse

  if (type === 'crypto') {
    // CoinGecko utilise un ID unique pour chaque crypto (ex: 'bitcoin')
    // Le 'symbol' passé ici est déjà l'ID de CoinGecko
    url = `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=30`; // Données sur 30 jours
    dataPath = 'prices'; // Les données de prix sont sous la clé 'prices'
  } else {
    // Pour les actions, forex, indices, commodities (Financial Modeling Prep)
    // Utilisation de l'endpoint 'historical-price-full'
    url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}`;
    dataPath = 'historical'; // Les données historiques sont sous la clé 'historical'
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (type === 'crypto' && data[dataPath]) {
      // CoinGecko renvoie un tableau de [timestamp, price]
      return data[dataPath].map(item => ({
        date: new Date(item[0]).toLocaleDateString('fr-FR'),
        price: item[1]
      }));
    } else if (data[dataPath]) {
      // FMP renvoie un tableau d'objets avec 'date' et 'close'
      // Nous voulons les données les plus récentes en premier, donc inverser
      return data[dataPath].map(item => ({
        date: item.date,
        price: item.close
      })).reverse(); // Inverser pour avoir les dates dans l'ordre croissant
    } else {
      console.warn(`Aucune donnée historique trouvée pour ${symbol} (${type}). Réponse de l'API:`, data);
      return [];
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération des données historiques pour ${symbol} (${type}):`, error);
    return [];
  }
}

// Fonction pour rendre le graphique avec Chart.js
function renderChart(historicalData, assetName, ctx) {
  const labels = historicalData.map(data => data.date);
  const prices = historicalData.map(data => data.price);

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Prix de ${assetName} (USD)`,
        data: prices,
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Permet au graphique de s'adapter à la taille du canvas
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Prix (USD)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      }
    }
  });
}

// Initialisation de la navigation et récupération des données au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  handleNavigation();
  fetchData(); // Première récupération des données
  // Ajout de l'écouteur d'événement pour la barre de recherche
  const searchBar = document.querySelector('.search-bar');
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });
  }

  // Écouteur pour le bouton de fermeture du modal
  const closeButton = document.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', closeChartModal);
  }

  // Fermer le modal si l'on clique en dehors du contenu (sur l'overlay)
  const chartModal = document.getElementById('chartModal');
  if (chartModal) {
    chartModal.addEventListener('click', (e) => {
      if (e.target === chartModal) {
        closeChartModal();
      }
    });
  }

  // Intervalle de rafraîchissement des données (très long ici, ajuster si nécessaire)
  setInterval(fetchData, 1000000);
});