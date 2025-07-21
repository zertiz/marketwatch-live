// Importations Firebase
// Les imports Firebase sont toujours présents mais ne sont plus utilisés dans la logique actuelle de l'app si la watchlist est retirée.
// Ils sont conservés pour la structure si une réintégration future est envisagée.

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

// Firebase variables (conservées pour la structure, mais non utilisées si watchlist retirée)
let app;
let db;
let auth;
let userId = null;
let userWatchlist = new Set();

// --- Fonctions Utilitaires ---

// Fonction pour obtenir le symbole de la devise (simplifiée pour USD)
function getCurrencySymbol(currencyCode) {
    return '$'; // Toujours USD
}

// Fonction pour formater un prix (simplifiée pour USD)
function formatPrice(price, currencyCode) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

// --- Initialisation Firebase (conservée mais désactivée si non nécessaire) ---
// Ces variables sont fournies par l'environnement Canvas
// Assurez-vous que __firebase_config est un objet JSON valide et non la chaîne "null"
const firebaseConfig = (typeof __firebase_config !== 'undefined' && __firebase_config && __firebase_config !== 'null') ? JSON.parse(__firebase_config) : null;
const initialAuthToken = (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && __initial_auth_token !== 'null') ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


async function initializeFirebase() {
  // Cette fonction n'est plus appelée dans DOMContentLoaded si la watchlist est retirée.
  // Elle est conservée pour la structure si une réintégration future est envisagée.
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

// --- Fonctions de Récupération et Mise à Jour des Données ---

async function fetchData() {
  const apiKey = '8C6eqw9VAcDUFxs1UERgRgY64pNe9xYd'; // Votre clé API FMP
  const cryptoUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,tron,polkadot,polygon,chainlink';
  const stockUrl = `https://financialmodelingprep.com/api/v3/quote/AAPL,NVDA,MSFT,TSLA,AMZN,META,GOOG,JPM,BAC,V?apikey=${apiKey}`;
  const forexUrl = `https://financialmodelingprep.com/api/v3/quote/EURUSD,USDJPY,GBPUSD,AUDUSD,USDCAD,USDCHF,USDCNY,USDHKD,USDSEK,USDSGD?apikey=${apiKey}`;
  const indicesUrl = `https://financialmodelingprep.com/api/v3/quote/%5EDJI,%5EIXIC,%5EGSPC,%5EFCHI,%5EGDAXI,%5EFTSE,%5EN225,%5EHSI,%5ESSMI,%5EBVSP?apikey=${apiKey}`;
  const commoditiesUrl = `https://financialmodelingprep.com/api/v3/quote/GCUSD,SIUSD,CLUSD,NGUSD,HGUSD,ALIUSD,PAUSD,PLUSD,KCUSD,SBUSD?apikey=${apiKey}`;

  // Display loading messages for main tables
  document.getElementById('stock-list').innerHTML = '<tr><td colspan="5">Chargement des données boursières...</td></tr>';
  document.getElementById('crypto-list').innerHTML = '<tr><td colspan="5">Chargement des données crypto...</td></tr>';
  document.getElementById('indices-list').innerHTML = '<li>Chargement des indices du marché...</li>';
  document.getElementById('recommendations').innerHTML = '<li>Chargement des recommandations...</li>';

  // Array to hold all fetch promises
  const fetchPromises = [
    { name: 'crypto', url: cryptoUrl },
    { name: 'stocks', url: stockUrl },
    { name: 'forex', url: forexUrl },
    { name: 'indices', url: indicesUrl },
    { name: 'commodities', url: commoditiesUrl }
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
      const { name, url } = fetchPromises[i];

      if (result.status === 'fulfilled') {
        try {
          const data = await result.value.json();
          console.log(`[DEBUG] Données brutes reçues pour ${name} (URL: ${url}):`, data);

          // Robust checks and assignments
          if (name === 'crypto') {
            tempFetchedData.cryptos = Array.isArray(data) ? data : [];
          } else if (name === 'stocks') {
            tempFetchedData.stocks = Array.isArray(data) ? data : [];
          } else if (name === 'forex') {
            tempFetchedData.forex = Array.isArray(data) ? data : [];
          } else if (name === 'indices') {
            // Spécifiquement pour les indices, si ce n'est pas un tableau, loggez l'objet entier
            if (!Array.isArray(data)) {
                console.error(`[ERROR] Données d'indices reçues non conformes (non un tableau). Objet reçu:`, data);
                // Vérifier si l'objet contient un message d'erreur de FMP
                // Correction ici: utiliser la notation entre crochets pour "Error Message"
                if (data && data['Error Message'] && data['Error Message'].includes('Free plan is limited to US stocks only')) {
                    tempFetchedData.indices = { error: "Limitation du plan FMP: Indices non disponibles sur le plan gratuit." };
                } else {
                    tempFetchedData.indices = []; // Assurez-vous que c'est un tableau vide si non conforme
                }
            } else {
                tempFetchedData.indices = data;
            }
          } else if (name === 'commodities') {
            tempFetchedData.commodities = Array.isArray(data) ? data : [];
          }
        } catch (jsonError) {
          console.error(`[ERROR] Erreur de parsing JSON pour ${name} (URL: ${url}):`, jsonError);
          let errorMessage = `Erreur de données pour ${name}.`;
          if (name === 'stocks') document.getElementById('stock-list').innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
          if (name === 'crypto') document.getElementById('crypto-list').innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
          if (name === 'indices') document.getElementById('indices-list').innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
          if (name === 'recommendations') document.getElementById('recommendations').innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
        }
      } else {
        console.error(`[ERROR] Échec de la récupération des données pour ${name} (URL: ${url}):`, result.reason);
        let errorMessage = `Erreur de chargement pour ${name}.`;
        if (result.reason instanceof Response) {
            errorMessage += ` Statut: ${result.reason.status}`;
            if (result.reason.status === 403) {
                errorMessage += " (Clé API invalide ou limites dépassées)";
            }
        } else if (result.reason instanceof Error) {
            errorMessage += ` Message: ${result.reason.message}`;
        }
        // Afficher un message d'erreur dans l'UI
        if (name === 'stocks') document.getElementById('stock-list').innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
        if (name === 'crypto') document.getElementById('crypto-list').innerHTML = `<tr><td colspan="5" class="error-message">${errorMessage}</td></tr>`;
        if (name === 'indices') document.getElementById('indices-list').innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
        if (name === 'recommendations') document.getElementById('recommendations').innerHTML = `<li><span class="error-message">${errorMessage}</span></li>`;
      }
    }

    // Assign all data at once after all fetches and parsing are complete
    allFetchedData = tempFetchedData;

    // --- Appel des fonctions de mise à jour de l'UI ---
    // Gérer spécifiquement les indices si c'est un objet d'erreur
    const indicesToUpdate = Array.isArray(allFetchedData.indices) ? allFetchedData.indices : [];

    const currentActiveSectionId = document.querySelector('.nav-link.active')?.dataset.section || 'home';
    if (currentActiveSectionId === 'stocks') {
        updateLists(allFetchedData.stocks, [], allFetchedData.forex, indicesToUpdate, allFetchedData.commodities);
    } else if (currentActiveSectionId === 'crypto') {
        updateLists([], allFetchedData.cryptos, [], [], []);
    } else { // 'home' or 'news' or if no section is active
        updateLists(allFetchedData.stocks, allFetchedData.cryptos, allFetchedData.forex, indicesToUpdate, allFetchedData.commodities);
    }
    updateIndices([...indicesToUpdate, ...allFetchedData.commodities]);

  } catch (error) {
    console.error("Erreur générale lors du chargement des données:", error);
    const genericErrorMessage = "Une erreur inattendue est survenue lors du chargement des données.";
    document.getElementById('stock-list').innerHTML = `<tr><td colspan="5" class="error-message">${genericErrorMessage}</td></tr>`;
    document.getElementById('crypto-list').innerHTML = `<tr><td colspan="5" class="error-message">${genericErrorMessage}</td></tr>`;
    document.getElementById('indices-list').innerHTML = `<li><span class="error-message">${genericErrorMessage}</span></li>`;
    document.getElementById('recommendations').innerHTML = `<li><span class="error-message">${genericErrorMessage}</span></li>`;
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
    newsContainer.innerHTML = html || '<p>Aucune actualité trouvée.</p>';
  } catch (error) {
    console.error("Erreur de chargement des actualités:", error);
    newsContainer.innerHTML = '<p class="error-message">Erreur de chargement des actualités. Veuillez vérifier votre connexion Internet ou réessayer plus tard.</p>';
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
  console.log("[DEBUG] updateLists - Données reçues:");
  console.log("  stocks:", stocks);
  console.log("  cryptos:", cryptos);
  console.log("  forex:", forex);
  console.log("  indices:", indices);
  console.log("  commodities:", commodities);

  const stockListTableBody = document.getElementById('stock-list');
  const cryptoListTableBody = document.getElementById('crypto-list');
  const recList = document.getElementById('recommendations');

  if (!stockListTableBody || !cryptoListTableBody || !recList) {
    console.error("[ERROR] updateLists - Éléments du DOM non trouvés.");
    return;
  }

  // Clear lists before adding new data
  stockListTableBody.innerHTML = '';
  cryptoListTableBody.innerHTML = '';

  const currencySymbol = getCurrencySymbol(currentCurrency); // Will always be '$'

  // Data for Stock/Forex/Indices/Commodities table (FMP data)
  const allNonCryptoAssets = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(forex) ? forex : []),
    // Assurez-vous que les indices sont bien des tableaux pour la concaténation
    ...(Array.isArray(indices) ? indices : []), 
    ...(Array.isArray(commodities) ? commodities : [])
  ];
  console.log("[DEBUG] updateLists - allNonCryptoAssets (après concaténation):", allNonCryptoAssets);


  // Apply sorting if a configuration is provided
  let sortedStocks = allNonCryptoAssets;
  let sortedCryptos = cryptos;

  if (sortConfig.tableId === 'stock-list') {
      sortedStocks = sortData(allNonCryptoAssets, sortConfig.key, sortConfig.direction);
  } else if (sortConfig.tableId === 'crypto-list') {
      sortedCryptos = sortData(cryptos, sortConfig.key, sortConfig.direction);
  }
  console.log("[DEBUG] updateLists - sortedStocks (après tri):", sortedStocks);
  console.log("[DEBUG] updateLists - sortedCryptos (après tri):", sortedCryptos);


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
          recommendation = '📉 Vendre';
        } else {
          recommendation = '🤝 Conserver';
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
      console.log("[DEBUG] stockListTableBody.innerHTML après ajout des lignes:", stockListTableBody.innerHTML); // Log du contenu final
  }


  // Data for Crypto table (CoinGecko data - already in USD)
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
      console.log("[DEBUG] cryptoListTableBody.innerHTML après ajout des lignes:", cryptoListTableBody.innerHTML); // Log du contenu final
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

  console.log("[DEBUG] updateIndices - Données reçues:", data);

  if (data && data.error) { // Si c'est un objet d'erreur de FMP
      list.innerHTML = `<li><span class="error-message">${data.error}</span></li>`;
      console.error("[ERROR] FMP Indices API Error:", data.error);
      return;
  }
  
  if (!Array.isArray(data)) {
    console.error("Les données pour updateIndices ne sont pas un tableau.", data);
    list.innerHTML = '<li>Aucun indice de marché disponible.</li>'; // Afficher le message si non un tableau
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

// Fonction pour afficher le modal du graphique
window.showChartModal = async function(symbol, type, name) { // Rendu global, 'period' retiré
  const modal = document.getElementById('chartModal');
  const chartTitle = document.getElementById('chartTitle');
  const chartLoading = document.getElementById('chartLoading');
  const chartError = document.getElementById('chartError');
  const chartCanvas = document.getElementById('historicalChart');
  const ctx = chartCanvas.getContext('2d');
  const chartPeriodSelector = document.getElementById('chartPeriodSelector'); // Référence au sélecteur de période

  // Store current asset details
  currentChartSymbol = symbol;
  currentChartType = type;
  currentChartName = name;

  chartTitle.textContent = `Évolution du prix pour ${name} (USD)`;
  if (chartLoading) chartLoading.classList.remove('hidden');
  if (chartError) chartError.classList.add('hidden');
  if (modal) modal.classList.remove('hidden'); // Assurez-vous que le modal est visible

  // Masquer le sélecteur de période car nous n'en avons plus besoin
  if (chartPeriodSelector) {
      chartPeriodSelector.innerHTML = ''; // Vider les boutons
      chartPeriodSelector.classList.add('hidden'); // Masquer le conteneur
  }

  // Destroy old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  try {
    // Appel de fetchHistoricalData sans le paramètre period, il est maintenant fixe à 1 an
    const historicalData = await fetchHistoricalData(symbol, type);

    if (historicalData && historicalData.length > 0) {
      renderChart(historicalData, name, ctx, currentCurrency);
      if (chartLoading) chartLoading.classList.add('hidden');
    } else {
      if (chartLoading) chartLoading.classList.add('hidden');
      if (chartError) chartError.classList.remove('hidden');
      if (chartError) chartError.textContent = "Aucune donnée historique disponible pour cet actif ou erreur API.";
    }
  } catch (error) {
    console.error("Erreur de chargement des données historiques:", error);
    if (chartLoading) chartLoading.classList.add('hidden');
    if (chartError) chartError.classList.remove('hidden');
    if (chartError) chartError.textContent = "Erreur lors du chargement des données historiques. Veuillez réessayer plus tard.";
  }
}

// Fonction pour fermer le modal du graphique
function closeChartModal() {
  const modal = document.getElementById('chartModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  if (myChart) {
    myChart.destroy(); // Détruire le graphique pour libérer les ressources
  }
  // Clear period selector buttons (already hidden, but good practice)
  const chartPeriodSelector = document.getElementById('chartPeriodSelector');
  if (chartPeriodSelector) chartPeriodSelector.innerHTML = '';
}

// Function to fetch historical data (period fixed to 1 year)
async function fetchHistoricalData(symbol, type) { // 'period' parameter removed
  const apiKey = '8C6eqw9VAcDUFxs1UERgRgY64pNe9xYd'; // Your FMP API key
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

  console.log(`[DEBUG] Requête historique URL: ${url}`); // Ajout d'un log pour l'URL complète

  try {
    const response = await fetch(url);
    console.log(`[DEBUG] Réponse API historique - Statut: ${response.status} pour URL: ${url}`); // Log du statut de réponse
    if (!response.ok) { // Check if response status is not 2xx
        const errorText = await response.text();
        console.error(`Erreur API pour les données historiques (${type}, ${symbol}): Statut ${response.status} - ${errorText}`);
        // Throw an error to be caught by showChartModal
        throw new Error(`Échec de la récupération des données historiques: ${response.statusText || 'Erreur inconnue'}. Vérifiez la clé API et la console.`);
    }
    const data = await response.json();
    console.log(`[DEBUG] Données brutes reçues pour ${symbol} (${type}):`, data); // Log des données brutes

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
      console.warn(`Aucune donnée historique trouvée pour ${symbol} (${type}). Réponse de l'API:`, data);
      return [];
    }
    return historicalPrices;
  } catch (error) {
    console.error(`Erreur de récupération des données historiques pour ${symbol} (${type}):`, error);
    throw error;
  }
}

// Fonction pour rendre le graphique avec Chart.js
function renderChart(historicalData, assetName, ctx, currencyCode) {
  const labels = historicalData.map(data => data.date);
  const prices = historicalData.map(data => data.price);

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Prix de ${assetName} (${currencyCode})`,
        data: prices,
        borderColor: '#61dafb', // Couleur du graphique bleu clair
        backgroundColor: 'rgba(97, 218, 251, 0.1)', // Fond du graphique transparent
        tension: 0.2, // Légère courbure pour un aspect plus doux
        fill: true,
        pointRadius: 0 // Cacher les points individuels
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
            text: `Prix (${currencyCode})`,
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

// --- Initialisation au chargement du DOM ---
document.addEventListener('DOMContentLoaded', () => {
  // initializeFirebase(); // Initialisation Firebase retirée
  handleNavigation(); // Initialise la navigation et la visibilité des sections
  fetchData(); // Première récupération des données

  // Gestion du bouton d'authentification (désactivé, sans Firebase)
  document.getElementById('authButton').addEventListener('click', () => {
    console.log("Le bouton de connexion a été cliqué. La fonctionnalité de connexion est actuellement désactivée.");
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
        sortDirection = 'asc'; // Par défaut à asc
      }

      // Réinitialiser les flèches de tri pour tous les en-têtes du même tableau
      header.closest('thead').querySelectorAll('th[data-sort-key]').forEach(th => {
        if (th !== header) {
          th.dataset.sortDirection = 'none'; // Masquer la flèche
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


  // Interval de rafraîchissement des données (environ toutes les 25 minutes)
  setInterval(fetchData, 1500000); // 1500000 ms = 25 minutes
});
