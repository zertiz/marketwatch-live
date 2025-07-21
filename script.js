// --- Variables Globales ---
let allFetchedData = {
  stocks: [],
  cryptos: [],
  forex: [],
  indices: [],
  commodities: []
};
let lastActiveSection = 'home';
let myChart; // Pour stocker l'instance du graphique Chart.js
let currentChartSymbol = '';
let currentChartType = '';
let currentChartName = '';
let currentCurrency = 'USD'; // Devise par défaut, fixée à USD

// --- Votre clé API Financial Modeling Prep (FMP) ---
const FMP_API_KEY = '8C6eqw9VAcDUFxs1UERgRgY64pNe9xYd';

// --- Fonctions Utilitaires ---

// Fonction pour obtenir le symbole de la devise (simplifiée pour USD)
function getCurrencySymbol(currencyCode) {
    return '$'; // Toujours USD
}

// Fonction pour formater un prix (simplifiée pour USD)
function formatPrice(price, currencyCode) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

// Fonction pour afficher/masquer le spinner de chargement global
function showGlobalLoadingSpinner() {
  document.getElementById('global-loading-spinner').classList.remove('hidden');
}

function hideGlobalLoadingSpinner() {
  document.getElementById('global-loading-spinner').classList.add('hidden');
}

// --- Fonctions de Récupération et Mise à Jour des Données ---

async function fetchData() {
  showGlobalLoadingSpinner(); // Afficher le spinner au début du chargement
  const apiKey = FMP_API_KEY; // Utilisation de la clé FMP
  const cryptoUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,tron,polkadot,polygon,chainlink`;
  const stockUrl = `https://financialmodelingprep.com/api/v3/quote/AAPL,NVDA,MSFT,TSLA,AMZN,META,GOOG,JPM,BAC,V?apikey=${apiKey}`;
  const forexUrl = `https://financialmodelingprep.com/api/v3/quote/EURUSD,USDJPY,GBPUSD,AUDUSD,USDCAD,USDCHF,USDCNY,USDHKD,USDSEK,USDSGD?apikey=${apiKey}`;
  const indicesUrl = `https://financialmodelingprep.com/api/v3/quote/%5EDJI,%5EIXIC,%5EGSPC,%5EFCHI,%5EGDAXI,%5EFTSE,%5EN225,%5EHSI,%5ESSMI,%5EBVSP?apikey=${apiKey}`;
  const commoditiesUrl = `https://financialmodelingprep.com/api/v3/quote/GCUSD,SIUSD,CLUSD,NGUSD,HGUSD,ALIUSD,PAUSD,PLUSD,KCUSD,SBUSD?apikey=${apiKey}`;

  // Display loading messages for main tables
  document.getElementById('stock-list').innerHTML = '<tr><td colspan="5">Chargement des données boursières...</td></tr>';
  document.getElementById('crypto-list').innerHTML = '<tr><td colspan="5">Chargement des données crypto...</td></tr>';
  document.getElementById('indices-list').innerHTML = '<li>Chargement des indices de marché...</li>';
  document.getElementById('recommendations').innerHTML = '<li>Chargement des recommandations...</li>';

  try {
    const [cryptoRes, stockRes, forexRes, indicesRes, commoditiesRes] = await Promise.all([
      fetch(cryptoUrl),
      fetch(stockUrl),
      fetch(forexUrl),
      fetch(indicesUrl),
      fetch(commoditiesUrl)
    ]);

    // Check for API key errors (403 Forbidden) or 404 Not Found
    if (!stockRes.ok || !forexRes.ok || !indicesRes.ok || !commoditiesRes.ok) {
        let errorMessage = "Erreur lors de la récupération des données de Financial Modeling Prep. ";
        if (stockRes.status === 403 || forexRes.status === 403 || indicesRes.status === 403 || commoditiesRes.status === 403) {
            errorMessage += "Votre clé API pourrait être invalide ou les limites d'utilisation dépassées (403 Forbidden).";
        } else if (indicesRes.status === 404) {
            errorMessage += "L'URL des indices pourrait être incorrecte (404 Not Found).";
        } else {
            errorMessage += `Statut: ${stockRes.status || forexRes.status || indicesRes.status || commoditiesRes.status}`;
        }
        console.error(errorMessage);
        // Clear tables and show error
        document.getElementById('stock-list').innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
        document.getElementById('crypto-list').innerHTML = `<tr><td colspan="5" class="error-message">Chargement des données crypto...</td></tr>`; // Crypto might still load
        document.getElementById('indices-list').innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
        document.getElementById('recommendations').innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
    }


    // Retrieve JSON data
    let cryptoData = await cryptoRes.json();
    let stockData = await stockRes.json();
    let forexData = await forexRes.json();
    let indicesData = await indicesRes.json();
    let commoditiesData = await commoditiesRes.json();

    // Robust checks to ensure data are arrays
    if (!Array.isArray(stockData)) {
        console.error("Données boursières invalides ou manquantes. Initialisation à un tableau vide.");
        stockData = [];
    }
    if (!Array.isArray(cryptoData)) {
        console.error("Données crypto invalides ou manquantes. Initialisation à un tableau vide.");
        cryptoData = [];
    }
    if (!Array.isArray(forexData)) {
        console.error("Données forex invalides ou manquantes. Initialisation à un tableau vide.");
        forexData = [];
    }
    if (!Array.isArray(indicesData)) {
        console.error("Données indices invalides ou manquantes. Initialisation à un tableau vide.");
        indicesData = [];
    }
    if (!Array.isArray(commoditiesData)) {
        console.error("Données matières premières invalides ou manquantes. Initialisation à un tableau vide.");
        commoditiesData = [];
    }

    // Store data in global variables
    allFetchedData.stocks = stockData;
    allFetchedData.cryptos = cryptoData;
    allFetchedData.forex = forexData;
    allFetchedData.indices = indicesData;
    allFetchedData.commodities = commoditiesData;

    // Update display based on the currently active section
    const currentActiveSectionId = document.querySelector('.nav-link.active')?.dataset.section || 'home';
    if (currentActiveSectionId === 'stocks') {
        updateLists(allFetchedData.stocks, [], allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
    } else if (currentActiveSectionId === 'crypto') {
        updateLists([], allFetchedData.cryptos, [], [], []);
    } else { // 'home' or 'news' or if no section is active
        updateLists(allFetchedData.stocks, allFetchedData.cryptos, allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
    }
    updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);

  } catch (error) {
    console.error("Erreur lors du chargement des données:", error);
    const genericErrorMessage = "Une erreur inattendue est survenue lors du chargement des données.";
    document.getElementById('stock-list').innerHTML = `<tr><td colspan="5" class="error-message">${genericErrorMessage}</td></tr>`;
    document.getElementById('crypto-list').innerHTML = `<tr><td colspan="5" class="error-message">${genericErrorMessage}</td></tr>`;
    document.getElementById('indices-list').innerHTML = `<li><span class="error-message">${genericErrorMessage}</span></li>`;
    document.getElementById('recommendations').innerHTML = `<li><span class="error-message">${genericErrorMessage}</span></li>`;
  } finally {
    hideGlobalLoadingSpinner(); // Masquer le spinner après le chargement (succès ou échec)
  }
}

async function fetchNews() {
  showGlobalLoadingSpinner(); // Afficher le spinner
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
      // Use a proxy to bypass CORS issues
      const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(feed.url);
      const res = await fetch(proxyUrl);
      const data = await res.json();

      const parser = new DOMParser();
      // Parse XML content from RSS feed
      const xml = parser.parseFromString(data.contents, 'text/xml');
      const items = xml.querySelectorAll('item');

      html += `<h3 class="news-source">${feed.label}</h3>`;

      items.forEach((item, index) => {
        // Limit to 4 articles per feed to avoid overload
        if (index >= 4) return;

        const title = item.querySelector('title')?.textContent ?? '';
        const link = item.querySelector('link')?.textContent ?? '';
        const pubDate = new Date(item.querySelector('pubDate')?.textContent ?? '').toLocaleDateString('en-US');
        const description = item.querySelector('description')?.textContent ?? '';

        // Detect image URL in description or via media tags
        let imageUrl = '';
        const imgMatch = description.match(/<img.*?src=["'](.*?)["']/i);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        } else {
          const media = item.querySelector('media\\:content, enclosure');
          if (media && media.getAttribute('url')) {
            imageUrl = media.getAttribute('url');
          } else {
            // Placeholder image if no image is found
            imageUrl = 'https://placehold.co/150x100/A0A0A0/FFFFFF?text=No+Image';
          }
        }

        html += `
          <div class="news-card">
            <img src="${imageUrl}" alt="Article Image" class="news-thumb">
            <div class="news-content">
              <h4><a href="${link}" target="_blank">${title}</a></h4>
              <p class="news-date">${pubDate} • ${feed.label}</p>
            </div>
          </div>
        `;
      });
    }

    html = html || '<p>Aucune actualité trouvée.</p>';
    newsContainer.innerHTML = html;
  } catch (error) {
    console.error("Erreur lors du chargement des actualités:", error);
    newsContainer.innerHTML = '<p class="error-message">Erreur lors du chargement des actualités. Veuillez vérifier votre connexion internet ou réessayer plus tard.</p>';
  } finally {
    hideGlobalLoadingSpinner(); // Masquer le spinner
  }
}

/**
 * Trie un tableau de données par une clé et une direction spécifiées.
 * @param {Array} data Le tableau de données à trier.
 * @param {string} key La clé par laquelle trier (nom de la propriété).
 * @param {string} direction La direction du tri ('asc' pour ascendant, 'desc' pour descendant).
 * @returns {Array} Le tableau trié.
 */
function sortData(data, key, direction) {
  if (!data || data.length === 0) return [];

  const sorted = [...data].sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    // Gérer les cas où les valeurs sont nulles ou non numériques pour le tri numérique
    if (typeof valA === 'number' && typeof valB === 'number') {
        if (valA === null || isNaN(valA)) valA = -Infinity; // Mettre les null/NaN en bas pour asc
        if (valB === null || isNaN(valB)) valB = -Infinity; // Mettre les null/NaN en bas pour asc
    } else if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
    } else {
        // Fallback pour d'autres types, les convertir en chaîne si possible
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
    }

    if (valA < valB) {
      return direction === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
  return sorted;
}

// Function to update stock and crypto lists
function updateLists(stocks, cryptos, forex, indices, commodities, sortConfig = {}) {
  const stockListTableBody = document.getElementById('stock-list');
  const cryptoListTableBody = document.getElementById('crypto-list');
  const recList = document.getElementById('recommendations');

  if (!stockListTableBody || !cryptoListTableBody || !recList) return;

  // Clear lists before adding new data
  stockListTableBody.innerHTML = '';
  cryptoListTableBody.innerHTML = '';

  const currencySymbol = getCurrencySymbol(currentCurrency); // Sera toujours '$'

  // Data for Stock/Forex/Indices/Commodities table (FMP data)
  const allNonCryptoAssets = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  // Appliquer le tri si une configuration est fournie
  let sortedStocks = allNonCryptoAssets;
  let sortedCryptos = cryptos;

  if (sortConfig.tableId === 'stock-list') {
      sortedStocks = sortData(allNonCryptoAssets, sortConfig.key, sortConfig.direction);
  } else if (sortConfig.tableId === 'crypto-list') {
      sortedCryptos = sortData(cryptos, sortConfig.key, sortConfig.direction);
  }


  if (sortedStocks.length === 0) {
      stockListTableBody.innerHTML = `<tr><td colspan="5">Aucune donnée d'actions, de forex, d'indices ou de matières premières disponible.</td></tr>`;
  } else {
      sortedStocks.forEach(asset => {
        const change = asset.changesPercentage ?? 0;
        const price = asset.price ?? 0;
        const cap = asset.marketCap ?? 0;
        
        const isGain = change >= 0;
        let recommendation = '';
        if (change > 3) {
          recommendation = '📈 Acheter';
        } else if (change < -3) {
          recommendation = '� Vendre';
        } else {
          recommendation = '🤝 Conserver';
        }
        const changeClass = isGain ? 'gain' : 'loss';
        const changeArrow = isGain ? '▲' : '▼';

        const row = `
          <tr>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">${asset.name}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">${formatPrice(price, currentCurrency)}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')" class="${changeClass}">${change.toFixed(2)}% ${changeArrow}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">${cap ? formatPrice(cap, currentCurrency) : 'N/A'}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">${recommendation}</td>
          </tr>
        `;
        stockListTableBody.innerHTML += row;
      });
  }


  // Data for Crypto table (CoinGecko data - déjà en USD)
  if (sortedCryptos.length === 0) {
      cryptoListTableBody.innerHTML = `<tr><td colspan="5">Aucune donnée de cryptomonnaie disponible.</td></tr>`;
  } else {
      sortedCryptos.forEach(asset => {
        const change = asset.price_change_percentage_24h ?? 0;
        const price = asset.current_price ?? 0;
        const cap = asset.market_cap ?? 0;
        const isGain = change >= 0;
        let recommendation = '';
        if (change > 3) {
          recommendation = '📈 Acheter';
        } else if (change < -3) {
          recommendation = '📉 Vendre';
        } else {
          recommendation = '🤝 Conserver';
        }
        const changeClass = isGain ? 'gain' : 'loss';
        const changeArrow = isGain ? '▲' : '▼';

        const row = `
          <tr>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">${asset.name}</td>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">${formatPrice(price, currentCurrency)}</td>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')" class="${changeClass}">${change.toFixed(2)}% ${changeArrow}</td>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">${cap ? formatPrice(cap, currentCurrency) : 'N/A'}</td>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">${recommendation}</td>
          </tr>
        `;
        cryptoListTableBody.innerHTML += row;
      });
  }


  // Data for Recommendations sidebar
  const allAssetsForRecommendations = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(cryptos) ? cryptos : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  if (allAssetsForRecommendations.length === 0) {
      recList.innerHTML = '<li>Aucune recommandation disponible.</li>';
  } else {
      recList.innerHTML = allAssetsForRecommendations.map(asset => {
        const change = asset.price_change_percentage_24h ?? asset.changesPercentage ?? 0;
        const recommendation = change > 3 ? '📈 Acheter' : change < -3 ? '📉 Vendre' : '🤝 Conserver';
        return `<li>${asset.name}: ${recommendation}</li>`;
      }).join('');
  }
}

// Function to update the indices list in the sidebar
function updateIndices(data) {
  const list = document.getElementById('indices-list');
  if (!list) return;

  if (!Array.isArray(data)) {
    console.error("Les données pour updateIndices ne sont pas un tableau.", data);
    list.innerHTML = '<li>Aucun indice de marché disponible.</li>';
    return;
  }
  
  if (data.length === 0) {
      list.innerHTML = '<li>Aucun indice de marché disponible.</li>';
  } else {
      list.innerHTML = data.map(item => {
        const change = item.changesPercentage?.toFixed(2);
        const cls = change >= 0 ? 'gain' : 'loss';
        const changeArrow = change >= 0 ? '▲' : '▼';
        return `<li>${item.name}: <span class="${cls}">${change}% ${changeArrow}</span></li>`;
      }).join('');
  }
}

// Function to filter and display search results
function performSearch(query) {
  const lowerCaseQuery = query.toLowerCase();

  // If query is empty, revert to the last active section view
  if (query === '') {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-section="${lastActiveSection}"]`).classList.add('active');

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(lastActiveSection).classList.remove('hidden');

    if (lastActiveSection === 'stocks') {
      updateLists(allFetchedData.stocks, [], allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
    } else if (lastActiveSection === 'crypto') {
      updateLists([], allFetchedData.cryptos, [], [], []);
    } else if (lastActiveSection === 'news') {
      fetchNews();
    } else if (lastActiveSection === 'home') {
        document.getElementById('stocks').classList.add('hidden');
        document.getElementById('crypto').classList.add('hidden');
        document.getElementById('news').classList.add('hidden');
    }
    updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);
    return;
  }

  const currentActiveNavLink = document.querySelector('.nav-link.active');
  if (currentActiveNavLink) {
    lastActiveSection = currentActiveNavLink.dataset.section;
  }

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

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector('.nav-link[data-section="stocks"]').classList.add('active');

  document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById('stocks').classList.remove('hidden');
  document.getElementById('crypto').classList.add('hidden');
  document.getElementById('news').classList.add('hidden');
  document.getElementById('home').classList.add('hidden');

  updateLists(filteredStocks, filteredCryptos, filteredForex, filteredIndices, filteredCommodities);
  updateIndices([...filteredIndices, ...allFetchedData.commodities]);
}

// Handle navigation between sections
function handleNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;

      lastActiveSection = section;

      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
      const activeSection = document.getElementById(section);
      if (activeSection) activeSection.classList.remove('hidden');

      if (section === 'stocks') {
        updateLists(allFetchedData.stocks, [], allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
      } else if (section === 'crypto') {
        updateLists([], allFetchedData.cryptos, [], [], []);
      } else if (section === 'news') {
        fetchNews();
      } else if (section === 'home') {
        document.getElementById('stocks').classList.add('hidden');
        document.getElementById('crypto').classList.add('hidden');
        document.getElementById('news').classList.add('hidden');
      }
      document.querySelector('.search-bar').value = '';
    });
  });
}

// Function to display the chart modal
// Removed 'period' parameter as it's now fixed to 1 year
async function showChartModal(symbol, type, name) {
  const modal = document.getElementById('chartModal');
  const chartTitle = document.getElementById('chartTitle');
  const chartLoading = document.getElementById('chartLoading');
  const chartError = document.getElementById('chartError');
  const chartCanvas = document.getElementById('historicalChart');
  const ctx = chartCanvas.getContext('2d');
  const chartPeriodSelector = document.getElementById('chartPeriodSelector'); // This will be hidden/empty

  // Store current asset details
  currentChartSymbol = symbol;
  currentChartType = type;
  currentChartName = name;

  chartTitle.textContent = `Évolution du prix pour ${name} (USD)`;
  chartLoading.classList.remove('hidden'); // Afficher le message de chargement du graphique
  chartError.classList.add('hidden');
  modal.classList.remove('hidden');

  // Clear and hide period selector buttons as they are no longer needed
  chartPeriodSelector.innerHTML = '';
  chartPeriodSelector.classList.add('hidden'); // Ensure it's hidden

  // Destroy old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  try {
    // Call fetchHistoricalData without period, it will default to 1 year
    const historicalData = await fetchHistoricalData(symbol, type);

    if (historicalData && historicalData.length > 0) {
      renderChart(historicalData, name, ctx, currentCurrency);
      chartLoading.classList.add('hidden'); // Masquer le message de chargement
    } else {
      chartLoading.classList.add('hidden');
      chartError.classList.remove('hidden');
      chartError.textContent = "Aucune donnée historique disponible pour cet actif ou erreur API.";
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données historiques:", error);
    chartLoading.classList.add('hidden');
    chartError.classList.remove('hidden');
    chartError.textContent = "Erreur lors du chargement des données historiques. Veuillez réessayer plus tard.";
  }
}

// Function to close the chart modal
function closeChartModal() {
  document.getElementById('chartModal').classList.add('hidden');
  if (myChart) {
    myChart.destroy();
  }
  // No need to clear chartPeriodSelector.innerHTML as it's hidden now
}

// Function to fetch historical data
// Removed 'period' parameter as it's now fixed to 1 year
async function fetchHistoricalData(symbol, type) {
  const apiKey = FMP_API_KEY; // Utilisation de la clé FMP
  let url = '';
  let dataPath = '';
  const fixedPeriod = '365d'; // Fixed to 1 year
  const cacheKey = `chart_data_${symbol}_${type}_${fixedPeriod}`; // Cache key now includes fixed period
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

  // 1. Essayer de récupérer les données du cache
  const cachedDataString = localStorage.getItem(cacheKey);
  if (cachedDataString) {
      const cachedEntry = JSON.parse(cachedDataString);
      const cacheTime = cachedEntry.timestamp;
      const currentTime = new Date().getTime();

      if (currentTime - cacheTime < CACHE_DURATION) {
          console.log(`Utilisation des données en cache pour ${symbol} (${type}, ${fixedPeriod})`);
          return cachedEntry.data;
      } else {
          console.log(`Les données en cache pour ${symbol} (${type}, ${fixedPeriod}) sont périmées. Récupération de nouvelles données.`);
          localStorage.removeItem(cacheKey); // Supprimer les données périmées
      }
  }

  console.log(`Fetching historical data for ${symbol} (${type}) for period: ${fixedPeriod}`); // Debugging: log request

  if (type === 'crypto') {
    // For CoinGecko, '365' days for 1 year
    url = `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=365`;
    dataPath = 'prices';
  } else { // For stocks, forex, indices, commodities (FMP)
    let endDate = new Date();
    let startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1); // Fixed to 1 year ago

    const formatDate = (date) => date.toISOString().split('T')[0];
    url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${formatDate(startDate)}&to=${formatDate(endDate)}&apikey=${apiKey}`;
    dataPath = 'historical';
  }

  console.log(`API URL for historical data: ${url}`); // Debugging: log URL

  try {
    const response = await fetch(url);
    console.log(`Response status for ${url}: ${response.status}`); // Debugging: log response status
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error for historical data (${type}, ${symbol}, ${fixedPeriod}): Status ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch historical data: ${response.statusText || 'Unknown error'}. Check API key and console.`);
    }
    const data = await response.json();
    console.log(`Raw data received for ${symbol} (${type}, ${fixedPeriod}):`, data); // Debugging: log raw data

    let historicalPrices = [];

    if (type === 'crypto' && data[dataPath]) {
      historicalPrices = data[dataPath].map(item => ({
        date: new Date(item[0]).toLocaleDateString('en-US'),
        price: item[1]
      }));
    } else if (data[dataPath]) { // FMP data
      historicalPrices = data[dataPath].map(item => ({
          date: item.date,
          price: item.close
      })).reverse(); // FMP returns in reverse chronological order
    } else {
      console.warn(`No historical data found for ${symbol} (${type}). API response:`, data);
      return [];
    }

    // 2. Mettre les données en cache après une récupération réussie
    if (historicalPrices.length > 0) {
        const dataToCache = {
            data: historicalPrices,
            timestamp: new Date().getTime()
        };
        localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
    }
    return historicalPrices;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol} (${type}):`, error);
    throw error;
  }
}

// Function to render the chart with Chart.js
function renderChart(historicalData, assetName, ctx, currencyCode) {
  const labels = historicalData.map(data => data.date);
  const prices = historicalData.map(data => data.price);
  const currencySymbol = getCurrencySymbol(currencyCode);

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Prix de ${assetName} (USD)`,
        data: prices,
        borderColor: '#61dafb',
        backgroundColor: 'rgba(97, 218, 251, 0.1)',
        tension: 0.2,
        fill: true,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date',
            color: '#e0e0e0'
          },
          ticks: {
            color: '#b0b0b0'
          },
          grid: {
            color: '#3a3a3a'
          }
        },
        y: {
          title: {
            display: true,
            text: `Prix (USD)`,
            color: '#e0e0e0'
          },
          ticks: {
            color: '#b0b0b0',
            callback: function(value) {
                return formatPrice(value, currentCurrency);
            }
          },
          grid: {
            color: '#3a3a3a'
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
                label += formatPrice(context.parsed.y, currentCurrency);
              }
              return label;
            }
          }
        },
        legend: {
            labels: {
                color: '#e0e0e0'
            }
        }
      }
    }
  });
}

  handleNavigation(); // Initialise la navigation et la visibilité des sections
  fetchData(); // Première récupération des données

  // Gestion du bouton d'authentification (désactivé comme demandé)
  document.getElementById('authButton').addEventListener('click', () => {
    console.log("Bouton de connexion cliqué. La fonctionnalité de connexion est actuellement désactivée.");
  });

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

  // Écouteur pour le bouton de bascule de thème
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Gestion du tri des tableaux
  document.querySelectorAll('table thead th[data-sort-key]').forEach(header => {
    header.addEventListener('click', () => {
      const tableId = header.closest('table').querySelector('tbody').id;
      const sortKey = header.dataset.sortKey;
      let sortDirection = header.dataset.sortDirection;

      // Déterminer la nouvelle direction de tri
      if (sortDirection === 'asc') {
        sortDirection = 'desc';
      } else if (sortDirection === 'desc') {
        sortDirection = 'asc'; // Revenir à asc si déjà desc
      } else {
        sortDirection = 'asc'; // Par défaut asc
      }

      // Réinitialiser les flèches de tri pour tous les en-têtes du même tableau
      header.closest('thead').querySelectorAll('th[data-sort-key]').forEach(th => {
        if (th !== header) {
          th.dataset.sortDirection = 'none'; // Cacher la flèche
        }
      });

      // Mettre à jour la direction pour l'en-tête cliqué
      header.dataset.sortDirection = sortDirection;

      // Appliquer le tri et mettre à jour la liste
      if (tableId === 'stock-list') {
        updateLists(allFetchedData.stocks, [], allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities, { tableId: tableId, key: sortKey, direction: sortDirection });
      } else if (tableId === 'crypto-list') {
        updateLists([], allFetchedData.cryptos, [], [], [], { tableId: tableId, key: sortKey, direction: sortDirection });
      }
    });
  });


  // Interval de rafraîchissement des données (environ toutes les 23 minutes pour 250 requêtes FMP/jour)
  setInterval(fetchData, 1382400); // 1382400 ms = 23.04 minutes


