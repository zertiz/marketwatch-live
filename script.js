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
// exchangeRates n'est plus nécessaire

// --- Fonctions Utilitaires ---

// Fonction pour obtenir le symbole de la devise (simplifiée pour USD)
function getCurrencySymbol(currencyCode) {
    return '$'; // Toujours USD
}

// Fonction pour formater un prix (simplifiée pour USD)
function formatPrice(price, currencyCode) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

// Les fonctions showGlobalLoadingSpinner et hideGlobalLoadingSpinner ont été retirées.


// --- Fonctions de Récupération et Mise à Jour des Données ---

async function fetchData() {
  const apiKey = '8C6eqw9VAcDUFxs1UERgRgY64pNe9xYd'; // Your FMP API key
  // CoinGecko sera toujours en USD
  const cryptoUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,tron,polkadot,polygon,chainlink`;
  const stockUrl = `https://financialmodelingprep.com/api/v3/quote/AAPL,NVDA,MSFT,TSLA,AMZN,META,GOOG,JPM,BAC,V?apikey=${apiKey}`;
  const forexUrl = `https://financialmodelingprep.com/api/v3/quote/EURUSD,USDJPY,GBPUSD,AUDUSD,USDCAD,USDCHF,USDCNY,USDHKD,USDSEK,USDSGD?apikey=${apiKey}`;
  const indicesUrl = `https://financialmodelingprep.com/api/v3/quote/%5EDJI,%5EIXIC,%5EGSPC,%5EFCHI,%5EGDAXI,%5EFTSE,%5EN225,%5EHSI,%5ESSMI,%5EBVSP?apikey=${apiKey}`;
  const commoditiesUrl = `https://financialmodelingprep.com/api/v3/quote/GCUSD,SIUSD,CLUSD,NGUSD,HGUSD,ALIUSD,PAUSD,PLUSD,KCUSD,SBUSD?apikey=${apiKey}`;

  // Display loading messages for main tables
  document.getElementById('stock-list').innerHTML = '<tr><td colspan="5">Loading stock data...</td></tr>';
  document.getElementById('crypto-list').innerHTML = '<tr><td colspan="5">Loading crypto data...</td></tr>';
  document.getElementById('indices-list').innerHTML = '<li>Loading market indices...</li>';
  document.getElementById('recommendations').innerHTML = '<li>Loading recommendations...</li>';

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
        let errorMessage = "Error fetching data from Financial Modeling Prep. ";
        if (stockRes.status === 403 || forexRes.status === 403 || indicesRes.status === 403 || commoditiesRes.status === 403) {
            errorMessage += "Your API key might be invalid or usage limits exceeded (403 Forbidden).";
        } else if (indicesRes.status === 404) {
            errorMessage += "Indices URL might be incorrect (404 Not Found).";
        } else {
            errorMessage += `Status: ${stockRes.status || forexRes.status || indicesRes.status || commoditiesRes.status}`;
        }
        console.error(errorMessage);
        // Clear tables and show error
        document.getElementById('stock-list').innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
        document.getElementById('crypto-list').innerHTML = `<tr><td colspan="5" class="error-message">Loading crypto data...</td></tr>`; // Crypto might still load
        document.getElementById('indices-list').innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
        document.getElementById('recommendations').innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
        // Proceed with potentially empty data for other parts
    }


    // Retrieve JSON data
    let cryptoData = await cryptoRes.json();
    let stockData = await stockRes.json();
    let forexData = await forexRes.json();
    let indicesData = await indicesRes.json();
    let commoditiesData = await commoditiesRes.json();

    // Robust checks to ensure data are arrays
    // If data is not an array, it's initialized to an empty array
    if (!Array.isArray(stockData)) {
        console.error("Invalid or missing stock data. Initializing to empty array.");
        stockData = [];
    }
    if (!Array.isArray(cryptoData)) {
        console.error("Invalid or missing crypto data. Initializing to empty array.");
        cryptoData = [];
    }
    if (!Array.isArray(forexData)) {
        console.error("Invalid or missing forex data. Initializing to empty array.");
        forexData = [];
    }
    if (!Array.isArray(indicesData)) {
        console.error("Invalid or missing indices data. Initializing to empty array.");
        indicesData = [];
    }
    if (!Array.isArray(commoditiesData)) {
        console.error("Invalid or missing commodities data. Initializing to empty array.");
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
    console.error("Error loading data:", error);
    const genericErrorMessage = "An unexpected error occurred while loading data.";
    document.getElementById('stock-list').innerHTML = `<tr><td colspan="5" class="error-message">${genericErrorMessage}</td></tr>`;
    document.getElementById('crypto-list').innerHTML = `<tr><td colspan="5" class="error-message">${genericErrorMessage}</td></tr>`;
    document.getElementById('indices-list').innerHTML = `<li><span class="error-message">${genericErrorMessage}</span></li>`;
    document.getElementById('recommendations').innerHTML = `<li><span class="error-message">${genericErrorMessage}</span></li>`;
  } finally {
    // hideGlobalLoadingSpinner(); // Appel retiré
  }
}

async function fetchNews() {
  const newsContainer = document.getElementById('news-articles');
  newsContainer.innerHTML = '<p>Loading news...</p>';

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
        const pubDate = new Date(item.querySelector('pubDate')?.textContent ?? '').toLocaleDateString('en-US'); // Changed to en-US for date format
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

    // Display news or a message if none found
    newsContainer.innerHTML = html || '<p>No news found.</p>';
  } catch (error) {
    console.error("Error loading news:", error);
    newsContainer.innerHTML = '<p class="error-message">Error loading news. Please check your internet connection or try again later.</p>';
  } finally {
    // hideGlobalLoadingSpinner(); // Appel retiré
  }
}

/**
 * Sorts an array of data by a specified key and direction.
 * @param {Array} data The array of data to sort.
 * @param {string} key The key by which to sort (property property).
 * @param {string} direction The sort direction ('asc' for ascending, 'desc' for descending).
 * @returns {Array} The sorted array.
 */
function sortData(data, key, direction) {
  if (!data || data.length === 0) return [];

  const sorted = [...data].sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    // Handle cases where values are null or non-numeric for numeric sorting
    if (typeof valA === 'number' && typeof valB === 'number') {
        if (valA === null || isNaN(valA)) valA = -Infinity; // Put null/NaN at the bottom for asc
        if (valB === null || isNaN(valB)) valB = -Infinity; // Put null/NaN at the bottom for asc
    } else if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
    } else {
        // Fallback for other types, convert to string if possible
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

  const currencySymbol = getCurrencySymbol(currentCurrency); // Will always be '$'

  // Data for Stock/Forex/Indices/Commodities table (FMP data)
  const allNonCryptoAssets = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  // Apply sorting if a configuration is provided
  let sortedStocks = allNonCryptoAssets;
  let sortedCryptos = cryptos;

  if (sortConfig.tableId === 'stock-list') {
      sortedStocks = sortData(allNonCryptoAssets, sortConfig.key, sortConfig.direction);
  } else if (sortConfig.tableId === 'crypto-list') {
      sortedCryptos = sortData(cryptos, sortConfig.key, sortConfig.direction);
  }


  if (sortedStocks.length === 0) {
      stockListTableBody.innerHTML = `<tr><td colspan="5">No stock, forex, indices, or commodities data available.</td></tr>`;
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
          recommendation = '📉 Vendre';
        } else {
          recommendation = '🤝 Conserver';
        }
        const changeClass = isGain ? 'gain' : 'loss';
        const changeArrow = isGain ? '▲' : '▼';

        const row = `
          <tr onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">
            <td>${asset.name}</td>
            <td>${formatPrice(price, currentCurrency)}</td>
            <td class="${changeClass}">${change.toFixed(2)}% ${changeArrow}</td>
            <td>${cap ? formatPrice(cap, currentCurrency) : 'N/A'}</td>
            <td>${recommendation}</td>
          </tr>
        `;
        stockListTableBody.innerHTML += row;
      });
  }


  // Data for Crypto table (CoinGecko data - already in USD)
  if (sortedCryptos.length === 0) {
      cryptoListTableBody.innerHTML = `<tr><td colspan="5">No cryptocurrency data available.</td></tr>`;
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
          <tr onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">
            <td>${asset.name}</td>
            <td>${formatPrice(price, currentCurrency)}</td>
            <td class="${changeClass}">${change.toFixed(2)}% ${changeArrow}</td>
            <td>${cap ? formatPrice(cap, currentCurrency) : 'N/A'}</td>
            <td>${recommendation}</td>
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
      recList.innerHTML = '<li>No recommendations available.</li>';
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
    console.error("Data for updateIndices is not an array.", data);
    return;
  }
  
  if (data.length === 0) {
      list.innerHTML = '<li>No market indices available.</li>';
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

// Fonction pour afficher le modal du graphique
// Removed 'period' parameter as it's now fixed to 1 year
async function showChartModal(symbol, type, name) {
  const modal = document.getElementById('chartModal');
  const chartTitle = document.getElementById('chartTitle');
  // const chartLoading = document.getElementById('chartLoading'); // Référence retirée
  const chartError = document.getElementById('chartError');
  const chartCanvas = document.getElementById('historicalChart');
  const ctx = chartCanvas.getContext('2d');
  const chartPeriodSelector = document.getElementById('chartPeriodSelector'); // This will be hidden/empty

  // Store current asset details
  currentChartSymbol = symbol;
  currentChartType = type;
  currentChartName = name;

  chartTitle.textContent = `Évolution du prix pour ${name} (USD)`;
  // chartLoading.classList.remove('hidden'); // Appel retiré
  chartError.classList.add('hidden');
  modal.classList.remove('hidden');

  // Clear and hide period selector buttons as they are no longer needed
  if (chartPeriodSelector) { // Added null check
    chartPeriodSelector.innerHTML = '';
    chartPeriodSelector.classList.add('hidden'); // Ensure it's hidden
  }


  // Destroy old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  try {
    // Call fetchHistoricalData without period, it will default to 1 year
    const historicalData = await fetchHistoricalData(symbol, type);

    if (historicalData && historicalData.length > 0) {
      renderChart(historicalData, name, ctx, currentCurrency);
      // chartLoading.classList.add('hidden'); // Appel retiré
    } else {
      // chartLoading.classList.add('hidden'); // Appel retiré
      chartError.classList.remove('hidden');
      chartError.textContent = "Aucune donnée historique disponible pour cet actif ou erreur API.";
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données historiques:", error);
    // chartLoading.classList.add('hidden'); // Appel retiré
    chartError.classList.remove('hidden');
    chartError.textContent = "Erreur lors du chargement des données historiques. Veuillez réessayer plus tard.";
  }
}

// Fonction pour fermer le modal du graphique
function closeChartModal() {
  document.getElementById('chartModal').classList.add('hidden');
  if (myChart) {
    myChart.destroy();
  }
  // No need to clear chartPeriodSelector.innerHTML as it's hidden now
}

// Fonction pour récupérer les données historiques
// Removed 'period' parameter as it's now fixed to 1 year and no caching
async function fetchHistoricalData(symbol, type) {
  const apiKey = '8C6eqw9VAcDUFxs1UERgRgY64pNe9xYd';
  let url = '';
  let dataPath = '';
  const fixedPeriod = '365d'; // Fixed to 1 year

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
    return historicalPrices;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol} (${type}):`, error);
    throw error;
  }
}

// Fonction pour rendre le graphique avec Chart.js
function renderChart(historicalData, assetName, ctx, currencyCode) {
  const labels = historicalData.map(data => data.date);
  const prices = historicalData.map(data => data.price);
  const currencySymbol = getCurrencySymbol(currencyCode); // Will always be '$'

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Price of ${assetName} (USD)`, // Chart label in USD
        data: prices,
        borderColor: '#61dafb', // Light blue chart color
        backgroundColor: 'rgba(97, 218, 251, 0.1)', // Transparent chart background
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
            text: `Price (USD)`, // Y-axis title in USD
            color: '#e0e0e0'
          },
          ticks: {
            color: '#b0b0b0',
            callback: function(value) {
                return formatPrice(value, currentCurrency); // Use formatPrice (in USD)
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
                label += formatPrice(context.parsed.y, currentCurrency); // Use formatPrice (in USD)
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

// --- Initialization on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  handleNavigation(); // Initialize navigation and section visibility
  fetchData(); // First data fetch

  // Authentication button handler (disabled as requested)
  document.getElementById('authButton').addEventListener('click', () => {
    console.log("Login button clicked. Login functionality is currently disabled.");
  });

  // Add event listener for the search bar
  const searchBar = document.querySelector('.search-bar');
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });
  }

  // Listener for the modal close button
  const closeButton = document.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', closeChartModal);
  }

  // Close modal if clicked outside content (on overlay)
  const chartModal = document.getElementById('chartModal');
  if (chartModal) {
    chartModal.addEventListener('click', (e) => {
      if (e.target === chartModal) {
        closeChartModal();
      }
    });
  }

  // Table sorting handler (added from previous improvements)
  document.querySelectorAll('table thead th[data-sort-key]').forEach(header => {
    header.addEventListener('click', () => {
      const tableId = header.closest('table').querySelector('tbody').id;
      const sortKey = header.dataset.sortKey;
      let sortDirection = header.dataset.sortDirection;

      // Determine the new sort direction
      if (sortDirection === 'asc') {
        sortDirection = 'desc';
      } else if (sortDirection === 'desc') {
        sortDirection = 'asc'; // Revert to asc if already desc
      } else {
        sortDirection = 'asc'; // Default to asc
      }

      // Reset sort arrows for all headers in the same table
      header.closest('thead').querySelectorAll('th[data-sort-key]').forEach(th => {
        if (th !== header) {
          th.dataset.sortDirection = 'none'; // Hide the arrow
        }
      });

      // Update the direction for the clicked header
      header.dataset.sortDirection = sortDirection;

      // Apply sorting and update the list
      if (tableId === 'stock-list') {
        updateLists(allFetchedData.stocks, [], allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities, { tableId: tableId, key: sortKey, direction: sortDirection });
      } else if (tableId === 'crypto-list') {
        updateLists([], allFetchedData.cryptos, [], [], [], { tableId: tableId, key: sortKey, direction: sortDirection });
      }
    });
  });


  // Data refresh interval (approx. every 25 minutes)
  setInterval(fetchData, 1500000); // 1500000 ms = 25 minutes
});
