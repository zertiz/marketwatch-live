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

// --- Votre clé API Alpha Vantage ---
// REMPLACER 'YOUR_ALPHA_VANTAGE_API_KEY' par votre vraie clé API Alpha Vantage
const ALPHA_VANTAGE_API_KEY = 'UPL2ZBTKNDAOJWWA';

// --- Fonctions Utilitaires ---

// Fonction pour obtenir le symbole de la devise (simplifiée pour USD)
function getCurrencySymbol(currencyCode) {
    return '$'; // Toujours USD
}

// Fonction pour formater un prix (simplifiée pour USD)
function formatPrice(price, currencyCode) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

// --- Fonctions de Récupération et Mise à Jour des Données ---

async function fetchData() {
  // CoinGecko sera toujours en USD pour les cryptos
  const cryptoUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,tron,polkadot,polygon,chainlink`;

  // Symboles pour Alpha Vantage
  const stockSymbols = 'AAPL,NVDA,MSFT,TSLA,AMZN,META,GOOG,JPM,BAC,V';
  const forexSymbols = 'EUR,JPY,GBP,AUD,CAD,CHF,CNY,HKD,SEK,SGD'; // Base USD pour les paires
  const indexSymbols = '^DJI,^IXIC,^GSPC,^FCHI,^GDAXI,^FTSE,^N225,^HSI,^SSMI,^BVSP'; // Alpha Vantage utilise des symboles différents pour les indices, ex: SPX, DJI
  // Pour les indices et matières premières avec Alpha Vantage, il faut souvent des requêtes individuelles
  // ou des fonctions spécifiques. Pour simplifier, nous allons chercher des "Global Quote" pour les actions
  // et des "TIME_SERIES_DAILY" pour les indices/commodités si nécessaire.
  // Pour les indices, Alpha Vantage utilise des symboles comme "SPX" pour S&P 500, "DJI" pour Dow Jones.
  // Les symboles FMP comme ^DJI ne fonctionneront pas directement.
  // Pour cette implémentation, je vais simuler des requêtes pour les indices et commodities via GLOBAL_QUOTE
  // si un symbole Alpha Vantage équivalent est connu, sinon les ignorer.

  // Display loading messages for main tables
  document.getElementById('stock-list').innerHTML = '<tr><td colspan="5">Loading stock data...</td></tr>';
  document.getElementById('crypto-list').innerHTML = '<tr><td colspan="5">Loading crypto data...</td></tr>';
  document.getElementById('indices-list').innerHTML = '<li>Loading market indices...</li>';
  document.getElementById('recommendations').innerHTML = '<li>Loading recommendations...</li>';

  try {
    const fetchPromises = [
      fetch(cryptoUrl),
      fetch(`https://www.alphavantage.co/query?function=BATCH_STOCK_QUOTES&symbols=${stockSymbols}&apikey=${ALPHA_VANTAGE_API_KEY}`),
      // Pour le forex, on va chercher chaque paire USD_XXX
      ...forexSymbols.split(',').map(sym => fetch(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=${sym}&apikey=${ALPHA_VANTAGE_API_KEY}`)),
      // Pour les indices, on va chercher chaque symbole connu par Alpha Vantage
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPX&apikey=${ALPHA_VANTAGE_API_KEY}`), // S&P 500
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=DJI&apikey=${ALPHA_VANTAGE_API_KEY}`), // Dow Jones
      fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=NASDAQ&apikey=${ALPHA_VANTAGE_API_KEY}`), // NASDAQ Composite (approximatif)
      // Pas de bonne API gratuite pour les matières premières en temps réel sur Alpha Vantage avec GLOBAL_QUOTE
      // On va laisser les commodities vides pour l'instant ou chercher des alternatives si besoin.
    ];

    const responses = await Promise.all(fetchPromises);
    const [cryptoRes, stockBatchRes, ...forexAndIndexRes] = responses;

    // Process Crypto Data (CoinGecko)
    let cryptoData = [];
    if (cryptoRes.ok) {
        cryptoData = await cryptoRes.json();
        if (!Array.isArray(cryptoData)) cryptoData = [];
    } else {
        console.error("Error fetching crypto data:", cryptoRes.status, await cryptoRes.text());
    }

    // Process Stock Data (Alpha Vantage BATCH_STOCK_QUOTES)
    let stockData = [];
    if (stockBatchRes.ok) {
        const rawStockData = await stockBatchRes.json();
        if (rawStockData && rawStockData['Stock Quotes']) {
            stockData = rawStockData['Stock Quotes'].map(item => ({
                name: item['2. name'] || item['1. symbol'], // Alpha Vantage doesn't always provide full name in batch
                symbol: item['1. symbol'],
                price: parseFloat(item['8. latestPrice'] || item['5. price']), // Use latestPrice if available, otherwise price
                changesPercentage: parseFloat(item['9. changePercent'] || item['10. change percent']) * 100, // Convert to percentage
                marketCap: null // Alpha Vantage GLOBAL_QUOTE has MarketCap, BATCH_STOCK_QUOTES does not directly
            }));
        }
    } else {
        console.error("Error fetching stock data from Alpha Vantage:", stockBatchRes.status, await stockBatchRes.text());
    }

    // Process Forex and Index Data (Alpha Vantage individual GLOBAL_QUOTE/CURRENCY_EXCHANGE_RATE)
    let forexData = [];
    let indicesData = [];
    let commoditiesData = []; // Still empty as no direct API for commodities in this setup

    // Indices mappings for Alpha Vantage
    const alphaVantageIndexMap = {
        'SPX': 'S&P 500',
        'DJI': 'Dow Jones Industrial Average',
        'NASDAQ': 'NASDAQ Composite' // This is a general symbol, not an index future
        // Add more if you find direct Alpha Vantage symbols for other indices
    };

    for (let i = 0; i < forexAndIndexRes.length; i++) {
        const res = forexAndIndexRes[i];
        if (!res.ok) {
            console.error(`Error fetching data from Alpha Vantage (index ${i}):`, res.status, await res.text());
            continue;
        }
        const data = await res.json();

        if (data && data['Realtime Currency Exchange Rate']) {
            const rate = data['Realtime Currency Exchange Rate'];
            forexData.push({
                name: `${rate['2. From_Currency Name']}/${rate['4. To_Currency Name']}`,
                symbol: `${rate['1. From_Currency Code']}${rate['3. To_Currency Code']}`,
                price: parseFloat(rate['5. Exchange Rate']),
                changesPercentage: null, // Not directly available in this endpoint
                marketCap: null
            });
        } else if (data && data['Global Quote']) {
            const quote = data['Global Quote'];
            const symbol = quote['01. symbol'];
            const name = alphaVantageIndexMap[symbol] || symbol; // Use mapped name or symbol
            indicesData.push({
                name: name,
                symbol: symbol,
                price: parseFloat(quote['05. price']),
                changesPercentage: parseFloat(quote['10. change percent']) * 100,
                marketCap: parseFloat(quote['06. volume']) * parseFloat(quote['05. price']) // Volume * Price as a proxy for market cap if not available
            });
        }
    }

    // Store data in global variables
    allFetchedData.stocks = stockData;
    allFetchedData.cryptos = cryptoData;
    allFetchedData.forex = forexData;
    allFetchedData.indices = indicesData;
    allFetchedData.commodities = commoditiesData; // Still empty

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
  }
}

// Function to update stock and crypto lists
function updateLists(stocks, cryptos, forex, indices, commodities) {
  const stockListTableBody = document.getElementById('stock-list');
  const cryptoListTableBody = document.getElementById('crypto-list');
  const recList = document.getElementById('recommendations');

  if (!stockListTableBody || !cryptoListTableBody || !recList) return;

  // Clear lists before adding new data
  stockListTableBody.innerHTML = '';
  cryptoListTableBody.innerHTML = '';

  const currencySymbol = getCurrencySymbol(currentCurrency); // Sera toujours '$'

  // Data for Stock/Forex/Indices/Commodities table (Alpha Vantage data)
  const allNonCryptoAssets = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  if (allNonCryptoAssets.length === 0) {
      stockListTableBody.innerHTML = `<tr><td colspan="5">No stock, forex, indices, or commodities data available.</td></tr>`;
  } else {
      allNonCryptoAssets.forEach(asset => {
        const change = asset.changesPercentage ?? 0;
        const price = asset.price ?? 0; // Prix déjà en USD
        const cap = asset.marketCap ?? 0; // Capitalisation déjà en USD
        
        const isGain = change >= 0;
        let recommendation = '';
        if (change > 3) {
          recommendation = '📈 Buy';
        } else if (change < -3) {
          recommendation = '📉 Sell';
        } else {
          recommendation = '🤝 Hold';
        }
        const changeClass = isGain ? 'gain' : 'loss';
        const changeArrow = isGain ? '▲' : '▼';

        const row = `
          <tr>
            <td onclick="showChartModal('${asset.symbol}', 'stock_av', '${asset.name}')">${asset.name}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_av', '${asset.name}')">${formatPrice(price, currentCurrency)}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_av', '${asset.name}')" class="${changeClass}">${change.toFixed(2)}% ${changeArrow}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_av', '${asset.name}')">${cap ? formatPrice(cap, currentCurrency) : 'N/A'}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_av', '${asset.name}')">${recommendation}</td>
          </tr>
        `;
        stockListTableBody.innerHTML += row;
      });
  }


  // Data for Crypto table (CoinGecko data - déjà en USD)
  if (Array.isArray(cryptos) && cryptos.length === 0) {
      cryptoListTableBody.innerHTML = `<tr><td colspan="5">No cryptocurrency data available.</td></tr>`;
  } else {
      (Array.isArray(cryptos) ? cryptos : []).forEach(asset => {
        const change = asset.price_change_percentage_24h ?? 0;
        const price = asset.current_price ?? 0; // Déjà en USD
        const cap = asset.market_cap ?? 0; // Déjà en USD
        const isGain = change >= 0;
        let recommendation = '';
        if (change > 3) {
          recommendation = '📈 Buy';
        } else if (change < -3) {
          recommendation = '📉 Sell';
        } else {
          recommendation = '🤝 Hold';
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
      recList.innerHTML = '<li>No recommendations available.</li>';
  } else {
      recList.innerHTML = allAssetsForRecommendations.map(asset => {
        const change = asset.price_change_percentage_24h ?? asset.changesPercentage ?? 0;
        const recommendation = change > 3 ? '📈 Buy' : change < -3 ? '📉 Sell' : '🤝 Hold';
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
    list.innerHTML = '<li>No market indices available.</li>';
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
  updateIndices([...filteredIndices, ...filteredCommodities]);
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
async function showChartModal(symbol, type, name, period = '30d') { // Default period to 30 days
  const modal = document.getElementById('chartModal');
  const chartTitle = document.getElementById('chartTitle');
  const chartLoading = document.getElementById('chartLoading');
  const chartError = document.getElementById('chartError');
  const chartCanvas = document.getElementById('historicalChart');
  const ctx = chartCanvas.getContext('2d');
  const chartPeriodSelector = document.getElementById('chartPeriodSelector');

  // Store current asset details for period changes
  currentChartSymbol = symbol;
  currentChartType = type;
  currentChartName = name;

  chartTitle.textContent = `Price Evolution Chart for ${name} (USD)`; // Titre du graphique en USD
  chartLoading.classList.remove('hidden');
  chartError.classList.add('hidden');
  modal.classList.remove('hidden');

  // Always clear and recreate period buttons to ensure they appear
  chartPeriodSelector.innerHTML = ''; // Clear existing buttons
  const periods = {
      '7d': '7 Days',
      '30d': '30 Days',
      '90d': '3 Months',
      '365d': '1 Year',
      'max': 'Max'
  };
  for (const p in periods) {
      const button = document.createElement('button');
      button.textContent = periods[p];
      button.dataset.period = p;
      button.addEventListener('click', () => {
          document.querySelectorAll('.chart-period-selector button').forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');
          showChartModal(currentChartSymbol, currentChartType, currentChartName, p);
      });
      chartPeriodSelector.appendChild(button);
  }
  // Set active class for the current period
  document.querySelectorAll('.chart-period-selector button').forEach(btn => {
      if (btn.dataset.period === period) {
          btn.classList.add('active');
      } else {
          btn.classList.remove('active');
      }
  });


  // Destroy old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  try {
    // Appel à fetchHistoricalData sans le paramètre targetCurrency, car il est fixe à USD
    const historicalData = await fetchHistoricalData(symbol, type, period);

    if (historicalData && historicalData.length > 0) {
      renderChart(historicalData, name, ctx, currentCurrency);
      chartLoading.classList.add('hidden');
    } else {
      chartLoading.classList.add('hidden');
      chartError.classList.remove('hidden');
      chartError.textContent = "No historical data available for this asset or API error.";
    }
  } catch (error) {
    console.error("Error loading historical data:", error);
    chartLoading.classList.add('hidden');
    chartError.classList.remove('hidden');
    chartError.textContent = "Error loading historical data. Please try again later.";
  }
}

// Function to close the chart modal
function closeChartModal() {
  document.getElementById('chartModal').classList.add('hidden');
  if (myChart) {
    myChart.destroy();
  }
  document.getElementById('chartPeriodSelector').innerHTML = ''; // Clear period selector buttons
}

// Function to fetch historical data
async function fetchHistoricalData(symbol, type, period) {
  const apiKey = ALPHA_VANTAGE_API_KEY; // Utilisation de la clé Alpha Vantage
  let url = '';
  let dataPath = '';
  let interval = 'daily'; // Default to daily for stocks/indices/forex

  console.log(`Fetching historical data for ${symbol} (${type}) for period: ${period}`); // Debugging: log request

  if (type === 'crypto') {
    let days = period;
    if (period === '7d') days = '7';
    else if (period === '30d') days = '30';
    else if (period === '90d') days = '90';
    else if (period === '365d') days = '365';
    else if (period === 'max') days = 'max'; // CoinGecko supporte 'max'
    else days = '30';

    url = `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=${days}`;
    dataPath = 'prices';
  } else { // For stocks, forex, indices (Alpha Vantage)
    let functionType = 'TIME_SERIES_DAILY'; // Default to daily for longer history
    
    // Alpha Vantage intraday data only goes back a few days/weeks depending on interval
    // For periods like 7d, 30d, 90d, 365d, we might use TIME_SERIES_DAILY_ADJUSTED for more history
    // For 'max', TIME_SERIES_DAILY_ADJUSTED is the best bet for longest history.

    if (period === '7d' || period === '30d' || period === '90d' || period === '365d' || period === 'max') {
        functionType = 'TIME_SERIES_DAILY_ADJUSTED';
        // Alpha Vantage daily adjusted data provides full history.
        // We will filter it client-side based on the period.
    }

    url = `https://www.alphavantage.co/query?function=${functionType}&symbol=${symbol}&apikey=${apiKey}&outputsize=full`; // outputsize=full for max history
    dataPath = `Time Series (Daily)`; // Key for daily data

    if (type === 'forex_av') { // Specific handling for Forex historical data in Alpha Vantage
        functionType = 'FX_DAILY';
        url = `https://www.alphavantage.co/query?function=${functionType}&from_symbol=${symbol.substring(0,3)}&to_symbol=${symbol.substring(3,6)}&apikey=${apiKey}&outputsize=full`;
        dataPath = `Time Series FX (Daily)`;
    }
  }

  console.log(`API URL for historical data: ${url}`); // Debugging: log URL

  try {
    const response = await fetch(url);
    console.log(`Response status for ${url}: ${response.status}`); // Debugging: log response status
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error for historical data (${type}, ${symbol}, ${period}): Status ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch historical data: ${response.statusText || 'Unknown error'}. Check API key and console.`);
    }
    const data = await response.json();
    console.log(`Raw data received for ${symbol} (${type}, ${period}):`, data); // Debugging: log raw data

    let historicalPrices = [];

    if (type === 'crypto' && data[dataPath]) {
      historicalPrices = data[dataPath].map(item => ({
        date: new Date(item[0]).toLocaleDateString('en-US'),
        price: item[1]
      }));
    } else if (data[dataPath]) { // Alpha Vantage data
      const timeSeries = data[dataPath];
      if (!timeSeries) {
          console.warn(`No time series data found for ${symbol} (${type}). API response:`, data);
          return [];
      }

      const dates = Object.keys(timeSeries).sort(); // Sort dates chronologically
      let filteredDates = dates;

      // Filter dates based on period for Alpha Vantage data
      const endDate = new Date();
      let startDate = new Date();

      if (period === '7d') {
          startDate.setDate(endDate.getDate() - 7);
      } else if (period === '30d') {
          startDate.setDate(endDate.getDate() - 30);
      } else if (period === '90d') {
          startDate.setMonth(endDate.getMonth() - 3);
      } else if (period === '365d') {
          startDate.setFullYear(endDate.getFullYear() - 1);
      } else if (period === 'max') {
          // 'max' will use all available data from outputsize=full
          // No further filtering needed here, as dates are already sorted
      }

      if (period !== 'max') {
        filteredDates = dates.filter(dateStr => {
            const date = new Date(dateStr);
            return date >= startDate && date <= endDate;
        });
      }
      
      historicalPrices = filteredDates.map(dateStr => {
          const item = timeSeries[dateStr];
          const closePrice = parseFloat(item['4. close'] || item['5. adjusted close']); // Use adjusted close if available
          return {
              date: new Date(dateStr).toLocaleDateString('en-US'),
              price: closePrice
          };
      });

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

// Function to render the chart with Chart.js
function renderChart(historicalData, assetName, ctx, currencyCode) {
  const labels = historicalData.map(data => data.date);
  const prices = historicalData.map(data => data.price);
  const currencySymbol = getCurrencySymbol(currencyCode); // Sera toujours '$'

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Price of ${assetName} (USD)`, // Label du graphique en USD
        data: prices,
        borderColor: '#61dafb', // Couleur du graphique bleu clair
        backgroundColor: 'rgba(97, 218, 251, 0.1)', // Fond du graphique transparent
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
            text: `Price (USD)`, // Titre de l'axe Y en USD
            color: '#e0e0e0'
          },
          ticks: {
            color: '#b0b0b0',
            callback: function(value) {
                return formatPrice(value, currentCurrency); // Utilise formatPrice (en USD)
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
                label += formatPrice(context.parsed.y, currentCurrency); // Utilise formatPrice (en USD)
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

// --- Initialisation au chargement du DOM ---
document.addEventListener('DOMContentLoaded', () => {
  handleNavigation(); // Initialise la navigation et la visibilité des sections
  fetchData(); // Première récupération des données

  // Gestion du bouton d'authentification (désactivé comme demandé)
  document.getElementById('authButton').addEventListener('click', () => {
    console.log("Login button clicked. Login functionality is currently disabled.");
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

  // Interval de rafraîchissement des données (pour 500 requêtes sur 24h = 172800 ms)
  setInterval(fetchData, 172800);
});

