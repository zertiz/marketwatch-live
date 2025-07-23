// Firebase Imports
// Firebase imports are still present but are no longer used in the current app logic if the watchlist is removed.
// They are kept for structure if future reintegration is planned.

// --- Global Variables ---
let allFetchedData = {
  stocks: [],
  cryptos: [],
  forex: [],
  indices: [],
  commodities: []
};
let lastActiveSection = 'home'; // Will be updated by simulated click
let myChart; // To store the Chart.js instance
let currentChartSymbol = '';
let currentChartType = '';
let currentChartName = '';
let currentCurrency = 'USD'; // Default currency, fixed to USD

// Firebase variables (kept for structure, but not used if watchlist removed)
let app;
let db;
let auth;
let userId = null;
let userWatchlist = new Set();

// --- Utility Functions ---

// Function to get the currency symbol (simplified for USD)
function getCurrencySymbol(currencyCode) {
    return '$'; // Always USD
}

// Function to format a price (simplified for USD)
function formatPrice(price, currencyCode) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

// --- Firebase Initialization (kept but disabled if not needed) ---
// These variables are provided by the Canvas environment
// Ensure __firebase_config is a valid JSON object and not the string "null"
const firebaseConfig = (typeof __firebase_config !== 'undefined' && __firebase_config && __firebase_config !== 'null') ? JSON.parse(__firebase_config) : null;
const initialAuthToken = (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && __initial_auth_token !== 'null') ? initialAuthToken : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


async function initializeFirebase() {
  // This function is no longer called in DOMContentLoaded if the watchlist is removed.
  // It is kept for structure if future reintegration is planned.
  if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
    const errorMsg = "Firebase config is missing or empty. Cannot initialize Firebase. Ensure __firebase_config is set in your environment.";
    console.error(errorMsg);
    const authButton = document.getElementById('authButton');
    if (authButton) authButton.textContent = 'Login Error (Config Missing)';
    return;
  }

  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        userId = user.uid;
        console.log("User logged in:", userId);
        const authButton = document.getElementById('authButton');
        if (authButton) authButton.textContent = `Logout (${userId.substring(0, 6)}...)`;
      } else {
        userId = null;
        console.log("User logged out.");
        const authButton = document.getElementById('authButton');
        if (authButton) authButton.textContent = 'Login';
        userWatchlist.clear();
      }
      fetchData();
    });

    if (initialAuthToken) {
      console.log("Attempting to sign in with custom token...");
      await signInWithCustomToken(auth, initialAuthToken);
    } else {
      console.log("Attempting to sign in anonymously...");
      await signInAnonymously(auth);
    }
  } catch (error) {
    const errorMsg = `Firebase initialization or authentication error: ${error.message}`;
    console.error(errorMsg, error);
    const authButton = document.getElementById('authButton');
    if (authButton) authButton.textContent = 'Login Error';
  }
}

// --- Data Fetching and Updating Functions ---

async function fetchData() {
  console.log("[DEBUG] fetchData called.");
  const apiKey = 'GKTmxyXWbKpCSjj67xYW9xf7pPK86ALi'; // Your FMP API key
  const cryptoUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,tron,polkadot,polygon,chainlink';
  
  // FMP URLs - ALL ENABLED as requested
  const stockUrl = `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${apiKey}`; 
  const forexUrl = `https://financialmodelingprep.com/api/v3/quote/EURUSD?apikey=${apiKey}`; 
  const indicesUrl = `https://financialmodelingprep.com/api/v3/quote/%5EDJI?apikey=${apiKey}`; 
  const commoditiesUrl = `https://financialmodelingprep.com/api/v3/quote/GCUSD?apikey=${apiKey}`; 

  // Display loading messages for main tables
  const stockListTableBody = document.getElementById('stock-list');
  const cryptoListTableBody = document.getElementById('crypto-list');
  const indicesList = document.getElementById('indices-list');
  const commoditiesList = document.getElementById('commodities-list');
  const recommendationsList = document.getElementById('recommendations');

  if (stockListTableBody) stockListTableBody.innerHTML = '<tr><td colspan="5">Loading stock data...</td></tr>';
  if (cryptoListTableBody) cryptoListTableBody.innerHTML = '<tr><td colspan="5">Loading crypto data...</td></tr>';
  if (indicesList) indicesList.innerHTML = '<li>Loading market indices...</li>';
  if (commoditiesList) commoditiesList.innerHTML = '<li>Loading commodities...</li>';
  if (recommendationsList) recommendationsList.innerHTML = '<li>Loading recommendations...</li>';


  // Array to hold all fetch promises - ALL ENABLED
  const fetchPromises = [
    { name: 'crypto', url: cryptoUrl },
    { name: 'stocks', url: stockUrl, isFMP: true },
    { name: 'forex', url: forexUrl, isFMP: true },
    { name: 'indices', url: indicesUrl, isFMP: true },
    { name: 'commodities', url: commoditiesUrl, isFMP: true }
  ];

  // Temporary storage for fetched data
  let tempFetchedData = {
    stocks: [],
    cryptos: [],
    forex: [],
    indices: [],
    commodities: []
  };

  try {
    const results = await Promise.allSettled(fetchPromises.map(p => fetch(p.url)));

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { name, url, isFMP } = fetchPromises[i];

      if (result.status === 'fulfilled') {
        try {
          const data = await result.value.json();
          console.log(`[DEBUG] Raw data received for ${name} (URL: ${url}):`, data);

          if (isFMP && data && data['Error Message'] && (result.value.status === 403 || result.value.status === 429)) {
            // Handle specific FMP errors (403/429) with clear message
            const errorMessage = `FMP plan limitation: ${name} data not available on the free plan.`;
            if (name === 'stocks') tempFetchedData.stocks = { error: errorMessage };
            else if (name === 'forex') tempFetchedData.forex = { error: errorMessage };
            else if (name === 'indices') tempFetchedData.indices = { error: errorMessage };
            else if (name === 'commodities') tempFetchedData.commodities = { error: errorMessage };
            console.error(`[ERROR] ${errorMessage}`);
          } else if (Array.isArray(data)) {
            // If it's an array, assign normally
            if (name === 'crypto') tempFetchedData.cryptos = data;
            else if (name === 'stocks') tempFetchedData.stocks = data;
            else if (name === 'forex') tempFetchedData.forex = data;
            else if (name === 'indices') tempFetchedData.indices = data;
            else if (name === 'commodities') tempFetchedData.commodities = data;
          } else {
            // If it's not an array and not a specific FMP error, it's unexpected.
            console.warn(`[WARN] Unexpected ${name} data received (not an array). Object received:`, data);
            if (name === 'stocks') tempFetchedData.stocks = { error: `Unexpected ${name} data.` };
            else if (name === 'forex') tempFetchedData.forex = { error: `Unexpected ${name} data.` };
            else if (name === 'indices') tempFetchedData.indices = { error: `Unexpected ${name} data.` };
            else if (name === 'commodities') tempFetchedData.commodities = { error: `Unexpected ${name} data.` };
          }
        } catch (jsonError) {
          console.error(`[ERROR] JSON parsing error for ${name} (URL: ${url}):`, jsonError);
          let errorMessage = `Data error for ${name}.`;
          if (name === 'stocks' && stockListTableBody) stockListTableBody.innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
          if (name === 'crypto' && cryptoListTableBody) cryptoListTableBody.innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
          if (name === 'indices' && indicesList) indicesList.innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
          if (name === 'commodities-list' && commoditiesList) commoditiesList.innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
          if (name === 'recommendations' && recommendationsList) recommendationsList.innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
        }
      } else {
        console.error(`[ERROR] Failed to fetch data for ${name} (URL: ${url}):`, result.reason);
        let errorMessage = `Error loading ${name}.`;
        if (result.reason instanceof Response) {
            errorMessage += ` Status: ${result.reason.status}`;
            if (result.reason.status === 403) {
                errorMessage += " (Invalid API Key or limits exceeded)";
            } else if (result.reason.status === 429) {
                errorMessage += " (Too many requests - API Limit Exceeded)";
            }
        } else if (result.reason instanceof Error) {
            errorMessage += ` Message: ${result.reason.message}`;
        }
        // Store the error in tempFetchedData for display
        if (name === 'stocks') tempFetchedData.stocks = { error: errorMessage };
        else if (name === 'forex') tempFetchedData.forex = { error: errorMessage };
        else if (name === 'indices') tempFetchedData.indices = { error: errorMessage };
        else if (name === 'commodities') tempFetchedData.commodities = { error: errorMessage };
        
        // Display an error message in the UI if the element exists
        if (name === 'stocks' && stockListTableBody) stockListTableBody.innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
        if (name === 'crypto' && cryptoListTableBody) cryptoListTableBody.innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
        if (name === 'indices' && indicesList) indicesList.innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
        if (name === 'commodities' && commoditiesList) commoditiesList.innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
        if (name === 'recommendations' && recommendationsList) recommendationsList.innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
      }
    }

    // Assign all data at once after all fetches and parsing are complete
    allFetchedData = tempFetchedData;

    // --- Call UI update functions ---
    // Ensure data passed to updateLists/updateIndices are always arrays,
    // or specific error objects for display.
    const stocksToUpdate = Array.isArray(allFetchedData.stocks) ? allFetchedData.stocks : allFetchedData.stocks; // Pass error object if it is one
    const cryptosToUpdate = Array.isArray(allFetchedData.cryptos) ? allFetchedData.cryptos : allFetchedData.cryptos;
    const forexToUpdate = Array.isArray(allFetchedData.forex) ? allFetchedData.forex : allFetchedData.forex;
    const indicesToUpdate = Array.isArray(allFetchedData.indices) ? allFetchedData.indices : allFetchedData.indices;
    const commoditiesToUpdate = Array.isArray(allFetchedData.commodities) ? allFetchedData.commodities : allFetchedData.commodities;


    // Update main lists
    const currentActiveSectionId = document.querySelector('.nav-link.active')?.dataset.section || 'crypto'; // Default to crypto
    if (currentActiveSectionId === 'stocks') {
        updateLists(stocksToUpdate, [], forexToUpdate, indicesToUpdate, commoditiesToUpdate);
    } else if (currentActiveSectionId === 'crypto') {
        updateLists([], cryptosToUpdate, [], [], []);
    } else { // 'home' or 'news' or if no section is active
        // If home or news is active, we still want to update all relevant tables with their specific data
        updateLists(stocksToUpdate, cryptosToUpdate, forexToUpdate, indicesToUpdate, commoditiesToUpdate);
    }
    
    // Update sidebars
    updateIndices(indicesToUpdate); 
    updateCommodities(commoditiesToUpdate); 
    updateRecommendations(stocksToUpdate, cryptosToUpdate, forexToUpdate, indicesToUpdate, commoditiesToUpdate); 

  } catch (error) {
    console.error("General error during data loading:", error);
    const genericErrorMessage = "An unexpected error occurred while loading data.";
    if (stockListTableBody) stockListTableBody.innerHTML = `<tr><td colspan="5" class="error-message">${genericErrorMessage}</td></tr>`;
    if (cryptoListTableBody) cryptoListTableBody.innerHTML = `<tr><td colspan="5" class="error-message">${genericErrorMessage}</td></tr>`;
    if (indicesList) indicesList.innerHTML = `<li><span class="error-message">${genericErrorMessage}</span></li>`;
    if (commoditiesList) commoditiesList.innerHTML = `<li><span class="error-message">${genericErrorMessage}</span></li>`;
    if (recommendationsList) recommendationsList.innerHTML = `<li><span class="error-message">${genericErrorMessage}</span></li>`;
  }
}

async function fetchNews() {
  console.log("[DEBUG] fetchNews called.");
  const newsContainer = document.getElementById('news-articles');
  if (!newsContainer) {
    console.error("[ERROR] fetchNews - 'news-articles' element not found.");
    return;
  }
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
      // Using an alternative proxy or different approach for news
      const proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed.url);
      console.log(`[DEBUG] News request via RSS2JSON proxy: ${proxyUrl}`);
      const res = await fetch(proxyUrl);
      const data = await res.json(); // rss2json returns JSON directly

      if (data.status !== 'ok') {
          console.error(`[ERROR] RSS2JSON error for ${feed.label}:`, data);
          html += `<h3 class="news-source">${feed.label}</h3><p class="error-message">Error loading news for this source.</p>`;
          continue;
      }

      html += `<h3 class="news-source">${feed.label}</h3>`;

      data.items.forEach((item, index) => {
        // Limit to 4 articles per feed to avoid overload
        if (index >= 4) return;

        const title = item.title ?? '';
        const link = item.link ?? '';
        const pubDate = new Date(item.pubDate ?? '').toLocaleDateString('en-US'); 
        const description = item.description ?? '';
        const imageUrl = item.thumbnail || 'https://placehold.co/150x100/A0A0A0/FFFFFF?text=No+Image'; // rss2json often has a thumbnail field

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
    newsContainer.innerHTML = '<p class="error-message">Error loading news. Please check your internet connection or try again later. (Proxy/CORS issue)</p>';
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
  console.log(`[DEBUG] sortData called for key: ${key}, direction: ${direction}`);
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
  console.log("[DEBUG] updateLists - Received data:");
  console.log("  stocks:", stocks);
  console.log("  cryptos:", cryptos);
  console.log("  forex:", forex);
  console.log("  indices:", indices);
  console.log("  commodities:", commodities);

  const stockListTableBody = document.getElementById('stock-list');
  const cryptoListTableBody = document.getElementById('crypto-list');

  if (!stockListTableBody || !cryptoListTableBody) {
    console.error("[ERROR] updateLists - DOM elements (stock-list or crypto-list) not found.");
    return;
  }

  // Clear lists before adding new data
  stockListTableBody.innerHTML = '';
  cryptoListTableBody.innerHTML = '';

  const currencySymbol = getCurrencySymbol(currentCurrency); // Will always be '$'

  // Data for Stock/Forex/Indices/Commodities table (FMP data)
  const allNonCryptoAssets = [];
  // Add only if it's not an error object
  if (Array.isArray(stocks)) allNonCryptoAssets.push(...stocks);
  if (Array.isArray(forex)) allNonCryptoAssets.push(...forex);
  if (Array.isArray(indices)) allNonCryptoAssets.push(...indices);
  if (Array.isArray(commodities)) allNonCryptoAssets.push(...commodities);

  console.log("[DEBUG] updateLists - allNonCryptoAssets (after concatenation):", allNonCryptoAssets);

  // Apply sorting if a configuration is provided
  let sortedStocks = allNonCryptoAssets;
  let sortedCryptos = cryptos;

  if (sortConfig.tableId === 'stock-list') {
      sortedStocks = sortData(allNonCryptoAssets, sortConfig.key, sortConfig.direction);
  } else if (sortConfig.tableId === 'crypto-list') {
      sortedCryptos = sortData(cryptos, sortConfig.key, sortConfig.direction);
  }
  console.log("[DEBUG] updateLists - sortedStocks (after sorting):", sortedStocks);
  console.log("[DEBUG] updateLists - sortedCryptos (after sorting):", sortedCryptos);

  // Attempt to display stocks/forex/indices/commodities
  console.log("[DEBUG] updateLists - Attempting to display stocks. Number of elements:", sortedStocks.length);
  if (stocks && stocks.error) { // Display error if stocks is an error object
      stockListTableBody.innerHTML = `<tr><td colspan="5" class="error-message">${stocks.error}</td></tr>`;
  } else if (sortedStocks.length === 0) {
      stockListTableBody.innerHTML = `<tr><td colspan="5">No stock, forex, indices, or commodity data available.</td></tr>`;
  } else {
      sortedStocks.forEach(asset => {
        const change = asset.changesPercentage ?? 0;
        const price = asset.price ?? 0;
        const cap = asset.marketCap ?? 0;
        
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
          <tr onclick="window.showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">
            <td>${asset.name}</td>
            <td>${formatPrice(price, currentCurrency)}</td>
            <td class="${changeClass}">${change.toFixed(2)}% ${changeArrow}</td>
            <td>${cap ? formatPrice(cap, currentCurrency) : 'N/A'}</td>
            <td>${recommendation}</td>
          </tr>
        `;
        stockListTableBody.innerHTML += row;
      });
      console.log("[DEBUG] stockListTableBody.innerHTML after adding rows:", stockListTableBody.innerHTML); // Log final content
  }

  // Attempt to display cryptos
  console.log("[DEBUG] updateLists - Attempting to display cryptos. Number of elements:", sortedCryptos.length);
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
          recommendation = '📈 Buy';
        } else if (change < -3) {
          recommendation = '📉 Sell';
        } else {
          recommendation = '🤝 Hold';
        }
        const changeClass = isGain ? 'gain' : 'loss';
        const changeArrow = isGain ? '▲' : '▼';

        const row = `
          <tr onclick="window.showChartModal('${asset.id}', 'crypto', '${asset.name}')">
            <td>${asset.name}</td>
            <td>${formatPrice(price, currentCurrency)}</td>
            <td class="${changeClass}">${change.toFixed(2)}% ${changeArrow}</td>
            <td>${cap ? formatPrice(cap, currentCurrency) : 'N/A'}</td>
            <td>${recommendation}</td>
          </tr>
        `;
        cryptoListTableBody.innerHTML += row;
      });
      console.log("[DEBUG] cryptoListTableBody.innerHTML after adding rows:", cryptoListTableBody.innerHTML); // Log final content
  }
}

// Function to update the indices list in the sidebar
function updateIndices(data) {
  console.log("[DEBUG] updateIndices called.");
  const list = document.getElementById('indices-list');
  if (!list) {
    console.error("[ERROR] updateIndices - 'indices-list' element not found.");
    return;
  }

  console.log("[DEBUG] updateIndices - Received data:", data);

  if (data && data.error) { // If it's an FMP error object
      list.innerHTML = `<li><span class="error-message">${data.error}</span></li>`;
      console.error("[ERROR] FMP Indices API Error:", data.error);
      return;
  }
  
  if (!Array.isArray(data)) {
    console.error("Data for updateIndices is not an array.", data);
    list.innerHTML = '<li>No market indices available.</li>'; // Display message if not an array
    return;
  }
  
  console.log("[DEBUG] updateIndices - Attempting to display indices. Number of elements:", data.length);
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

// New function to update the commodities list
function updateCommodities(data) {
    console.log("[DEBUG] updateCommodities called.");
    const list = document.getElementById('commodities-list');
    if (!list) {
      console.error("[ERROR] updateCommodities - 'commodities-list' element not found.");
      return;
    }

    console.log("[DEBUG] updateCommodities - Received data:", data);

    if (data && data.error) {
        list.innerHTML = `<li><span class="error-message">${data.error}</span></li>`;
        console.error("[ERROR] FMP Commodities API Error:", data.error);
        return;
    }

    if (!Array.isArray(data)) {
        console.error("Data for updateCommodities is not an array.", data);
        list.innerHTML = '<li>No commodities available.</li>';
        return;
    }

    console.log("[DEBUG] updateCommodities - Attempting to display commodities. Number of elements:", data.length);
    if (data.length === 0) {
        list.innerHTML = '<li>No commodities available.</li>';
    } else {
        list.innerHTML = data.map(item => {
            const change = item.changesPercentage?.toFixed(2);
            const cls = change >= 0 ? 'gain' : 'loss';
            const changeArrow = change >= 0 ? '▲' : '▼';
            return `<li>${item.name}: <span class="${cls}">${change}% ${changeArrow}</span></li>`;
        }).join('');
    }
}

// Function to update recommendations (now includes FMP error messages)
function updateRecommendations(stocks, cryptos, forex, indices, commodities) {
  console.log("[DEBUG] updateRecommendations called.");
  const recList = document.getElementById('recommendations');
  if (!recList) {
    console.error("[ERROR] updateRecommendations - 'recommendations' element not found.");
    return;
  }

  let recommendationHtml = '';
  let apiLimitWarningDisplayed = false;

  // Check if any FMP source returned a limit error
  if ((stocks && stocks.error && stocks.error.includes('FMP plan limitation')) ||
      (forex && forex.error && forex.error.includes('FMP plan limitation')) ||
      (indices && indices.error && indices.error.includes('FMP plan limitation')) ||
      (commodities && commodities.error && commodities.error.includes('FMP plan limitation'))) {
    apiLimitWarningDisplayed = true;
    recommendationHtml += `<li><span class="error-message">⚠️ FMP API Limit Reached: Some data (Stocks, Forex, Indices, Commodities) might not refresh. Automatic refresh is every 4 hours.</span></li>`;
  }

  // Add other specific FMP error messages (not related to limits)
  if (stocks && stocks.error && !stocks.error.includes('FMP plan limitation')) recommendationHtml += `<li><span class="error-message">${stocks.error}</span></li>`;
  if (forex && forex.error && !forex.error.includes('FMP plan limitation')) recommendationHtml += `<li><span class="error-message">${forex.error}</span></li>`;
  if (indices && indices.error && !indices.error.includes('FMP plan limitation')) recommendationHtml += `<li><span class="error-message">${indices.error}</span></li>`;
  if (commodities && commodities.error && !commodities.error.includes('FMP plan limitation')) recommendationHtml += `<li><span class="error-message">${commodities.error}</span></li>`;

  // Add recommendations for assets with valid data (which are arrays)
  const allValidAssetsForRecommendations = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(cryptos) ? cryptos : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  if (allValidAssetsForRecommendations.length === 0 && !recommendationHtml) {
      recList.innerHTML = '<li>No recommendations available.</li>';
  } else {
      recommendationHtml += allValidAssetsForRecommendations.map(asset => {
        const change = asset.price_change_percentage_24h ?? asset.changesPercentage ?? 0;
        const recommendation = change > 3 ? '📈 Buy' : change < -3 ? '📉 Sell' : '🤝 Hold';
        return `<li>${asset.name}: ${recommendation}</li>`;
      }).join('');
      recList.innerHTML = recommendationHtml;
  }
}


// Function to filter and display search results
function performSearch(query) {
  console.log(`[DEBUG] performSearch called with query: "${query}"`);
  const lowerCaseQuery = query.toLowerCase();

  // If query is empty, revert to the last active section view
  if (query === '') {
    console.log("[DEBUG] Search query is empty. Reverting to last active section:", lastActiveSection);
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const lastActiveNavLink = document.querySelector(`.nav-link[data-section="${lastActiveSection}"]`);
    if (lastActiveNavLink) lastActiveNavLink.classList.add('active');

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    const targetSection = document.getElementById(lastActiveSection);
    if (targetSection) targetSection.classList.remove('hidden');

    // Ensure that the passed data are arrays or error objects
    const stocksToUpdate = Array.isArray(allFetchedData.stocks) ? allFetchedData.stocks : allFetchedData.stocks;
    const cryptosToUpdate = Array.isArray(allFetchedData.cryptos) ? allFetchedData.cryptos : allFetchedData.cryptos;
    const forexToUpdate = Array.isArray(allFetchedData.forex) ? allFetchedData.forex : allFetchedData.forex;
    const indicesToUpdate = Array.isArray(allFetchedData.indices) ? allFetchedData.indices : allFetchedData.indices;
    const commoditiesToUpdate = Array.isArray(allFetchedData.commodities) ? allFetchedData.commodities : allFetchedData.commodities;

    if (lastActiveSection === 'stocks') {
      updateLists(stocksToUpdate, [], forexToUpdate, indicesToUpdate, commoditiesToUpdate);
    } else if (lastActiveSection === 'crypto') {
      updateLists([], cryptosToUpdate, [], [], []);
    } else if (lastActiveSection === 'news') {
      fetchNews();
    } else if (lastActiveSection === 'home') {
        // Home section is special, it doesn't display tables directly
        document.getElementById('stocks')?.classList.add('hidden');
        document.getElementById('crypto')?.classList.add('hidden');
        document.getElementById('news')?.classList.add('hidden');
    }
    updateIndices(indicesToUpdate);
    updateCommodities(commoditiesToUpdate);
    updateRecommendations(stocksToUpdate, cryptosToUpdate, forexToUpdate, indicesToUpdate, commoditiesToUpdate);
    return;
  }

  const currentActiveNavLink = document.querySelector('.nav-link.active');
  if (currentActiveNavLink) {
    lastActiveSection = currentActiveNavLink.dataset.section;
    console.log("[DEBUG] Storing last active section for search:", lastActiveSection);
  }

  // Filter only array data, ignore error objects
  const filteredStocks = Array.isArray(allFetchedData.stocks) ? allFetchedData.stocks.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol.toLowerCase().includes(lowerCaseQuery)
  ) : [];
  const filteredCryptos = Array.isArray(allFetchedData.cryptos) ? allFetchedData.cryptos.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol?.toLowerCase().includes(lowerCaseQuery) || asset.id?.toLowerCase().includes(lowerCaseQuery)
  ) : [];
  const filteredForex = Array.isArray(allFetchedData.forex) ? allFetchedData.forex.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol.toLowerCase().includes(lowerCaseQuery)
  ) : [];
  const filteredIndices = Array.isArray(allFetchedData.indices) ? allFetchedData.indices.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol?.toLowerCase().includes(lowerCaseQuery)
  ) : [];
  const filteredCommodities = Array.isArray(allFetchedData.commodities) ? allFetchedData.commodities.filter(asset =>
    asset.name.toLowerCase().includes(lowerCaseQuery) || asset.symbol.toLowerCase().includes(lowerCaseQuery)
  ) : [];

  // Always show stocks section for search results
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const stocksNavLink = document.querySelector('.nav-link[data-section="stocks"]');
  if (stocksNavLink) stocksNavLink.classList.add('active');

  document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
  const stocksSection = document.getElementById('stocks');
  if (stocksSection) stocksSection.classList.remove('hidden');
  document.getElementById('crypto')?.classList.add('hidden');
  document.getElementById('news')?.classList.add('hidden');
  document.getElementById('home')?.classList.add('hidden');

  updateLists(filteredStocks, filteredCryptos, filteredForex, filteredIndices, filteredCommodities);
  updateIndices(allFetchedData.indices); 
  updateCommodities(allFetchedData.commodities); 
  updateRecommendations(allFetchedData.stocks, allFetchedData.cryptos, allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
}

// Handle navigation between sections
function handleNavigation() {
  console.log("[DEBUG] handleNavigation function called.");
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link) { // Ensure the link element exists
      console.log(`[DEBUG] Attaching click listener to nav-link: ${link.dataset.section}`);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        console.log(`[DEBUG] Nav-link clicked: ${section}`);

        lastActiveSection = section;
        console.log("[DEBUG] lastActiveSection set to:", lastActiveSection);

        document.querySelectorAll('.nav-link').forEach(l => {
          l.classList.remove('active');
          console.log(`  Removed active from: ${l.dataset.section}`);
        });
        link.classList.add('active');
        console.log(`  Added active to: ${link.dataset.section}`);

        document.querySelectorAll('.content-section').forEach(sec => {
          sec.classList.add('hidden');
          console.log(`  Hid section: ${sec.id}`);
        });
        const activeSection = document.getElementById(section);
        if (activeSection) {
          activeSection.classList.remove('hidden');
          console.log(`  Showed section: ${activeSection.id}`);
        } else {
          console.error(`[ERROR] Section element not found for: ${section}`);
        }

        // Ensure that the passed data are arrays or error objects
        const stocksToUpdate = Array.isArray(allFetchedData.stocks) ? allFetchedData.stocks : allFetchedData.stocks;
        const cryptosToUpdate = Array.isArray(allFetchedData.cryptos) ? allFetchedData.cryptos : allFetchedData.cryptos;
        const forexToUpdate = Array.isArray(allFetchedData.forex) ? allFetchedData.forex : allFetchedData.forex;
        const indicesToUpdate = Array.isArray(allFetchedData.indices) ? allFetchedData.indices : allFetchedData.indices;
        const commoditiesToUpdate = Array.isArray(allFetchedData.commodities) ? allFetchedData.commodities : allFetchedData.commodities;

        if (section === 'stocks') {
          updateLists(stocksToUpdate, [], forexToUpdate, indicesToUpdate, commoditiesToUpdate);
        } else if (section === 'crypto') {
          updateLists([], cryptosToUpdate, [], [], []);
        } else if (section === 'news') {
          fetchNews();
        } else if (section === 'home') {
          // Home section does not display tables directly, ensure others are hidden
          document.getElementById('stocks')?.classList.add('hidden');
          document.getElementById('crypto')?.classList.add('hidden');
          document.getElementById('news')?.classList.add('hidden');
        }
        const searchBar = document.querySelector('.search-bar');
        if (searchBar) searchBar.value = '';
      });
    }
  });
}

// Function to display the chart modal
window.showChartModal = async function(symbol, type, name) { // Made global, 'period' removed
  console.log(`[DEBUG] showChartModal called for symbol: ${symbol}, type: ${type}, name: ${name}`);
  const modal = document.getElementById('chartModal');
  const chartTitle = document.getElementById('chartTitle');
  const chartError = document.getElementById('chartError');
  const chartCanvas = document.getElementById('historicalChart');
  const ctx = chartCanvas?.getContext('2d'); // Use optional chaining
  const chartPeriodSelector = document.getElementById('chartPeriodSelector'); // Reference to the period selector

  if (!modal || !chartTitle || !chartError || !chartCanvas || !ctx) {
    console.error("[ERROR] showChartModal - One or more modal DOM elements are missing. Cannot display chart.");
    return;
  }

  // Store current asset details
  currentChartSymbol = symbol;
  currentChartType = type;
  currentChartName = name;

  chartTitle.textContent = `Price Evolution for ${name} (USD)`;
  chartError.classList.add('hidden'); // Hide previous errors
  modal.classList.remove('hidden'); // Ensure the modal is visible

  // Hide the period selector as we no longer need it
  if (chartPeriodSelector) {
      chartPeriodSelector.innerHTML = ''; // Clear buttons
      chartPeriodSelector.classList.add('hidden'); // Hide container
  }

  // Destroy old chart if it exists
  if (myChart) {
    myChart.destroy();
    console.log("[DEBUG] Old chart destroyed.");
  }

  try {
    // Call fetchHistoricalData without the period parameter, it is now fixed to 1 year
    const historicalData = await fetchHistoricalData(symbol, type);

    if (historicalData && historicalData.length > 0) {
      renderChart(historicalData, name, ctx, currentCurrency);
      console.log("[DEBUG] Chart rendered successfully.");
    } else {
      chartError.classList.remove('hidden');
      chartError.textContent = "No historical data available for this asset or API error.";
      console.warn("[WARN] No historical data or empty data array received.");
    }
  } catch (error) {
    console.error("Error loading historical data:", error);
    chartError.classList.remove('hidden');
    chartError.textContent = "Error loading historical data. Please try again later.";
  }
}

// Function to close the chart modal
function closeChartModal() {
  console.log("[DEBUG] closeChartModal called.");
  const modal = document.getElementById('chartModal');
  if (modal) {
    modal.classList.add('hidden');
    console.log("[DEBUG] Chart modal hidden.");
  }
  if (myChart) {
    myChart.destroy(); // Destroy the chart to free up resources
    console.log("[DEBUG] Chart destroyed on close.");
  }
  // Clear period selector buttons (already hidden, but good practice)
  const chartPeriodSelector = document.getElementById('chartPeriodSelector');
  if (chartPeriodSelector) chartPeriodSelector.innerHTML = '';
}

// Function to fetch historical data (period fixed to 1 year)
async function fetchHistoricalData(symbol, type) { // 'period' parameter removed
  console.log(`[DEBUG] fetchHistoricalData called for symbol: ${symbol}, type: ${type}`);
  const apiKey = 'GKTmxyXWbKpCSjj67xYW9xf7pPK86ALi'; // Your FMP API key
  let url = '';
  let dataPath = '';

  // Define formatDate here, accessible to both branches
  const formatDate = (date) => date.toISOString().split('T')[0];

  if (type === 'crypto') {
    // For CoinGecko, '365' days for 1 year
    url = `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=365`;
    dataPath = 'prices';
  } else { // For stocks, forex, indices, commodities (FMP)
    let endDate = new Date();
    let startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1); // Fixed to 1 year ago

    url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${formatDate(startDate)}&to=${formatDate(endDate)}&apikey=${apiKey}`;
    dataPath = 'historical';
  }

  console.log(`[DEBUG] Historical request URL: ${url}`); // Add log for full URL

  try {
    const response = await fetch(url);
    console.log(`[DEBUG] Historical API Response - Status: ${response.status} for URL: ${url}`); // Log response status
    if (!response.ok) { // Check if response status is not 2xx
        const errorText = await response.text();
        console.error(`API error for historical data (${type}, ${symbol}): Status ${response.status} - ${errorText}`);
        // Throw an error to be caught by showChartModal
        throw new Error(`Failed to fetch historical data: ${response.statusText || 'Unknown error'}. Check API key and console.`);
    }
    const data = await response.json();
    console.log(`[DEBUG] Raw data received for ${symbol} (${type}):`, data); // Log raw data

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

// Function to render the chart with Chart.js
function renderChart(historicalData, assetName, ctx, currencyCode) {
  console.log("[DEBUG] renderChart called.");
  const labels = historicalData.map(data => data.date);
  const prices = historicalData.map(data => data.price);

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Price of ${assetName} (${currencyCode})`,
        data: prices,
        borderColor: '#FFFFFF', // Chart line color to white
        backgroundColor: 'rgba(255, 255, 255, 0.2)', // Chart background to transparent white (slightly more opaque)
        tension: 0.2, // Slight curve for a softer look
        fill: true,
        pointRadius: 0, // Hide individual points
        pointBackgroundColor: '#FFFFFF', // Point color to white (even if hidden)
        pointBorderColor: '#FFFFFF' // Point border color to white (even if hidden)
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
            color: '#e0e0e0' // Axis title text color
          },
          ticks: {
            color: '#b0b0b0' // Tick label text color
          },
          grid: {
            color: '#3a3a3a' // Grid line color
          }
        },
        y: {
          title: {
            display: true,
            text: `Price (${currencyCode})`,
            color: '#e0e0e0' // Axis title text color
          },
          ticks: {
            color: '#b0b0b0', // Tick label text color
            callback: function(value) {
                return formatPrice(value, currentCurrency);
            }
          },
          grid: {
            color: '#3a3a3a' // Grid line color
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
                color: '#e0e0e0' // Legend text color
            }
        }
      }
    }
  });
}

// --- DOM Content Loaded Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  console.log("[INIT] DOMContentLoaded event fired. Starting initialization sequence.");
  
  // 1. Attach navigation listeners first
  handleNavigation(); 

  // 2. Hide all content sections initially
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.add('hidden');
    console.log(`[INIT] Section hidden: ${sec.id}, hidden: ${sec.classList.contains('hidden')}`);
  });

  // 3. Simulate a click on the 'Crypto' nav link to initialize the display
  const cryptoNavLink = document.querySelector('.nav-link[data-section="crypto"]');
  if (cryptoNavLink) {
    console.log("[INIT] Simulating click on 'Crypto' nav link to set initial active section.");
    cryptoNavLink.click(); // Simulate click to trigger handleNavigation
  } else {
    console.error("[INIT] Crypto nav link element not found! Cannot set initial active section.");
    // Fallback: if crypto link not found, try to show home
    const homeNavLink = document.querySelector('.nav-link[data-section="home"]');
    if (homeNavLink) homeNavLink.click();
    else console.error("[INIT] Home nav link also not found. UI might not initialize correctly.");
  }

  // 4. Start data fetching
  fetchData(); 

  // Authentication button handling (disabled, no Firebase)
  const authButton = document.getElementById('authButton');
  if (authButton) {
    authButton.addEventListener('click', () => {
      console.log("Login button clicked. Login functionality is currently disabled.");
    });
    console.log("[INIT] Auth button listener attached.");
  } else {
    console.warn("[INIT] Auth button element not found.");
  }


  // Add event listener for the search bar
  const searchBar = document.querySelector('.search-bar');
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });
    console.log("[INIT] Search bar listener attached.");
  } else {
    console.warn("[INIT] Search bar element not found.");
  }

  // Listener for the modal close button
  const closeButton = document.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', closeChartModal);
    console.log("[INIT] Close button listener attached.");
  } else {
    console.warn("[INIT] Close button element not found.");
  }

  // Close modal if clicking outside the content (on the overlay)
  const chartModal = document.getElementById('chartModal');
  if (chartModal) {
    chartModal.addEventListener('click', (e) => {
      if (e.target === chartModal) {
        closeChartModal();
      }
    });
    console.log("[INIT] Chart modal overlay listener attached.");
  } else {
    console.warn("[INIT] Chart modal element not found.");
  }

  // Table sorting handling
  document.querySelectorAll('table thead th[data-sort-key]').forEach(header => {
    if (header) { // Check if header exists
      header.addEventListener('click', () => {
        console.log(`[DEBUG] Table header clicked: ${header.dataset.sortKey}`);
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

        // Ensure that the passed data are arrays or error objects
        const stocksToUpdate = Array.isArray(allFetchedData.stocks) ? allFetchedData.stocks : allFetchedData.stocks;
        const cryptosToUpdate = Array.isArray(allFetchedData.cryptos) ? allFetchedData.cryptos : allFetchedData.cryptos;
        const forexToUpdate = Array.isArray(allFetchedData.forex) ? allFetchedData.forex : allFetchedData.forex;
        const indicesToUpdate = Array.isArray(allFetchedData.indices) ? allFetchedData.indices : allFetchedData.indices;
        const commoditiesToUpdate = Array.isArray(allFetchedData.commodities) ? allFetchedData.commodities : allFetchedData.commodities;

        // Apply sorting and update the list
        if (tableId === 'stock-list') {
          updateLists(stocksToUpdate, [], forexToUpdate, indicesToUpdate, commoditiesToUpdate, { tableId: tableId, key: sortKey, direction: sortDirection });
        } else if (tableId === 'crypto-list') {
          updateLists([], cryptosToUpdate, [], [], [], { tableId: tableId, key: sortKey, direction: sortDirection });
        }
      });
      console.log(`[INIT] Sort header listener attached for: ${header.dataset.sortKey}`);
    }
  });


  // Data refresh interval (now every 4 hours)
  setInterval(fetchData, 14400000); // 14400000 ms = 4 hours
  console.log("[INIT] Data refresh interval set to 4 hours.");
});