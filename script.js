// Importations Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// Firebase variables
let app;
let db;
let auth;
let userId = null; // L'ID utilisateur sera défini après l'authentification
let userWatchlist = new Set(); // Stocke les symboles/IDs des éléments dans la watchlist de l'utilisateur

// --- Initialisation Firebase ---
// Ces variables sont fournies par l'environnement Canvas
// Assurez-vous que __firebase_config est un objet JSON valide et non la chaîne "null"
const firebaseConfig = (typeof __firebase_config !== 'undefined' && __firebase_config && __firebase_config !== 'null') ? JSON.parse(__firebase_config) : null;
const initialAuthToken = (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && __initial_auth_token !== 'null') ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


async function initializeFirebase() {
  // Vérifie si la configuration Firebase est manquante ou vide
  if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
    const errorMsg = "Firebase config is missing or empty. Cannot initialize Firebase. Ensure __firebase_config is set in your environment.";
    console.error(errorMsg);
    document.getElementById('authButton').textContent = 'Login Error (Config Missing)';
    document.getElementById('watchlist-loading').textContent = `Error: ${errorMsg}`;
    return; // Arrête l'initialisation si la config est mauvaise
  }

  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        userId = user.uid;
        console.log("User logged in:", userId);
        document.getElementById('authButton').textContent = `Logout (${userId.substring(0, 6)}...)`;
        setupWatchlistListener(); // Écoute les changements de la watchlist
      } else {
        userId = null;
        console.log("User logged out.");
        document.getElementById('authButton').textContent = 'Login';
        document.getElementById('my-watchlist').innerHTML = '<li id="watchlist-loading">Login to view your watchlist.</li>';
        userWatchlist.clear(); // Vide la watchlist en mémoire
      }
      // Re-fetch data pour s'assurer que les boutons de watchlist sont à jour
      fetchData();
    });

    // Tente de se connecter avec le jeton fourni ou de manière anonyme
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
    document.getElementById('authButton').textContent = 'Login Error';
    document.getElementById('watchlist-loading').textContent = `Error: ${errorMsg}. Check console.`;
  }
}

// --- Fonctions de la Watchlist (Firestore) ---

// Chemin de la collection de la watchlist pour l'utilisateur actuel
function getWatchlistCollectionRef() {
  if (!userId || !db) { // Vérifie si db est aussi initialisé
    console.error("User not authenticated or Firestore not initialized for watchlist operations.");
    return null;
  }
  // Utilise le chemin recommandé pour les données privées de l'utilisateur
  return collection(db, `artifacts/${appId}/users/${userId}/watchlists`);
}

// Écoute les changements en temps réel de la watchlist
function setupWatchlistListener() {
  const watchlistRef = getWatchlistCollectionRef();
  if (!watchlistRef) {
    document.getElementById('my-watchlist').innerHTML = '<li>Please log in to manage your watchlist.</li>';
    return;
  }

  onSnapshot(watchlistRef, (snapshot) => {
    userWatchlist.clear();
    const watchlistItems = [];
    snapshot.forEach((doc) => {
      const item = doc.data();
      item.id = doc.id; // Stocke l'ID du document Firestore (qui est uniqueId)
      userWatchlist.add(item.uniqueId); // Utilise uniqueId pour un suivi facile
      watchlistItems.push(item);
    });
    updateWatchlistUI(watchlistItems);
    // Rafraîchit les tableaux principaux pour mettre à jour l'état des boutons
    updateLists(allFetchedData.stocks, allFetchedData.cryptos, allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
  }, (error) => {
    console.error("Error listening to watchlist:", error);
    document.getElementById('my-watchlist').innerHTML = '<li>Error loading your watchlist. Please check console.</li>';
  });
}

// Ajoute un élément à la watchlist
async function addToWatchlist(asset) {
  if (!userId) {
    console.warn("Please login to add items to your watchlist.");
    // Vous pouvez afficher un message temporaire dans l'UI ici
    return;
  }
  const watchlistRef = getWatchlistCollectionRef();
  if (!watchlistRef) return;

  // Créer un ID unique pour l'actif (symbole + type)
  const uniqueId = `${asset.symbol || asset.id}_${asset.type}`;
  if (userWatchlist.has(uniqueId)) {
    console.log(`${asset.name} is already in watchlist.`);
    return;
  }

  try {
    // Utiliser setDoc avec un ID spécifique pour éviter les doublons et faciliter la suppression
    await setDoc(doc(watchlistRef, uniqueId), {
      name: asset.name,
      symbol: asset.symbol || asset.id, // Pour crypto, l'ID est le symbole
      type: asset.type, // 'stock_fmp' ou 'crypto'
      uniqueId: uniqueId, // Stocke l'uniqueId aussi dans le document pour faciliter la suppression
      timestamp: new Date()
    });
    console.log(`${asset.name} added to watchlist.`);
    // userWatchlist est mis à jour par le listener onSnapshot
  } catch (error) {
    console.error("Error adding to watchlist:", error);
  }
}

// Supprime un élément de la watchlist
async function removeFromWatchlist(uniqueId) {
  if (!userId) {
    console.error("User not authenticated to remove from watchlist.");
    return;
  }
  const watchlistRef = getWatchlistCollectionRef();
  if (!watchlistRef) return;

  try {
    await deleteDoc(doc(watchlistRef, uniqueId));
    console.log(`Item ${uniqueId} removed from watchlist.`);
    // userWatchlist est mis à jour par le listener onSnapshot
  } catch (error) {
    console.error("Error removing from watchlist:", error);
  }
}

// Met à jour l'UI de la watchlist dans la barre latérale
function updateWatchlistUI(watchlistItems) {
  const watchlistUl = document.getElementById('my-watchlist');
  if (!watchlistUl) return;

  if (watchlistItems.length === 0) {
    watchlistUl.innerHTML = '<li>Your watchlist is empty. Add some assets!</li>';
  } else {
    watchlistUl.innerHTML = watchlistItems.map(item => {
      // uniqueId est déjà l'ID du document Firestore
      return `
        <li>
          ${item.name}
          <button class="watchlist-btn added" onclick="removeFromWatchlist('${item.uniqueId}')" title="Remove from Watchlist">⭐</button>
        </li>
      `;
    }).join('');
  }
}

// --- Fonctions de Récupération et Mise à Jour des Données (Existantes, avec modifications pour Watchlist) ---

async function fetchData() {
  const cryptoUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,tron,polkadot,polygon,chainlink';
  const stockUrl = 'https://financialmodelingprep.com/api/v3/quote/AAPL,NVDA,MSFT,TSLA,AMZN,META,GOOG,JPM,BAC,V?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';
  const forexUrl = 'https://financialmodelingprep.com/api/v3/quote/EURUSD,USDJPY,GBPUSD,AUDUSD,USDCAD,USDCHF,USDCNY,USDHKD,USDSEK,USDSGD?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';
  const indicesUrl = 'https://financialmodelingprep.com/api/v3/quote/%5EDJI,%5EIXIC,%5EGSPC,%5EFCHI,%5EGDAXI,%5EFTSE,%5EN225,%5EHSI,%5ESSMI,%5EBVSP?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';
  const commoditiesUrl = 'https://financialmodelingprep.com/api/v3/quote/GCUSD,SIUSD,CLUSD,NGUSD,HGUSD,ALIUSD,PAUSD,PLUSD,KCUSD,SBUSD?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';

  // Display loading messages for main tables
  document.getElementById('stock-list').innerHTML = '<tr><td colspan="6">Loading stock data...</td></tr>';
  document.getElementById('crypto-list').innerHTML = '<tr><td colspan="6">Loading crypto data...</td></tr>';
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
        document.getElementById('stock-list').innerHTML = `<tr><td colspan="6" class="error-message">${errorMessage}</td></tr>`;
        document.getElementById('crypto-list').innerHTML = `<tr><td colspan="6" class="error-message">Loading crypto data...</td></tr>`; // Crypto might still load
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
    // This ensures tables are populated even after data reload
    const currentActiveSectionId = document.querySelector('.nav-link.active')?.dataset.section || 'home';
    if (currentActiveSectionId === 'stocks') {
        updateLists(allFetchedData.stocks, [], allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
    } else if (currentActiveSectionId === 'crypto') {
        updateLists([], allFetchedData.cryptos, [], [], []);
    } else { // 'home' or 'news' or if no section is active
        // For 'home' and 'news', main tables are hidden, but sidebar needs all data
        // Call updateLists with all data for recommendations, even if tables are hidden
        updateLists(allFetchedData.stocks, allFetchedData.cryptos, allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
    }
    updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);

  } catch (error) {
    console.error("Error loading data:", error);
    const genericErrorMessage = "An unexpected error occurred while loading data.";
    document.getElementById('stock-list').innerHTML = `<tr><td colspan="6" class="error-message">${genericErrorMessage}</td></tr>`;
    document.getElementById('crypto-list').innerHTML = `<tr><td colspan="6" class="error-message">${genericErrorMessage}</td></tr>`;
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

  // Data for Stock/Forex/Indices/Commodities table
  const allNonCryptoAssets = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  if (allNonCryptoAssets.length === 0) {
      stockListTableBody.innerHTML = '<tr><td colspan="6">No stock, forex, indices, or commodities data available.</td></tr>';
  } else {
      allNonCryptoAssets.forEach(asset => {
        const change = asset.changesPercentage ?? 0;
        const price = asset.price ?? 0;
        const cap = asset.marketCap ?? 0;
        const isGain = change >= 0;
        // Translated recommendations with emojis
        let recommendation = '';
        if (change > 3) {
          recommendation = '📈 Buy';
        } else if (change < -3) {
          recommendation = '📉 Sell';
        } else {
          recommendation = '🤝 Hold';
        }
        const changeClass = isGain ? 'gain' : 'loss';
        const changeArrow = isGain ? '▲' : '▼'; // Arrow indicator

        // Unique ID for watchlist tracking
        const uniqueId = `${asset.symbol}_stock_fmp`;
        const isAddedToWatchlist = userWatchlist.has(uniqueId);
        const watchlistButtonClass = isAddedToWatchlist ? 'added' : '';
        const watchlistButtonText = isAddedToWatchlist ? '⭐' : '☆'; // Filled star if added, empty if not

        // Add data-symbol and data-type attribute for click
        // Use asset.symbol for FMP, and a generic type like 'stock_fmp' to distinguish them
        const row = `
          <tr>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">${asset.name}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">$${price.toLocaleString()}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')" class="${changeClass}">${change.toFixed(2)}% ${changeArrow}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">${cap ? '$' + (cap / 1e9).toFixed(1) + 'B' : 'N/A'}</td>
            <td onclick="showChartModal('${asset.symbol}', 'stock_fmp', '${asset.name}')">${recommendation}</td>
            <td>
              <button class="watchlist-btn ${watchlistButtonClass}" 
                      onclick="${isAddedToWatchlist ? `removeFromWatchlist('${uniqueId}')` : `addToWatchlist({name: '${asset.name}', symbol: '${asset.symbol}', type: 'stock_fmp', uniqueId: '${uniqueId}'})`}"
                      title="${isAddedToWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}">
                ${watchlistButtonText}
              </button>
            </td>
          </tr>
        `;
        stockListTableBody.innerHTML += row;
      });
  }


  // Data for Crypto table
  if (Array.isArray(cryptos) && cryptos.length === 0) {
      cryptoListTableBody.innerHTML = '<tr><td colspan="6">No cryptocurrency data available.</td></tr>';
  } else {
      (Array.isArray(cryptos) ? cryptos : []).forEach(asset => {
        const change = asset.price_change_percentage_24h ?? 0;
        const price = asset.current_price ?? 0;
        const cap = asset.market_cap ?? 0;
        const isGain = change >= 0;
        // Translated recommendations with emojis
        let recommendation = '';
        if (change > 3) {
          recommendation = '📈 Buy';
        } else if (change < -3) {
          recommendation = '📉 Sell';
        } else {
          recommendation = '🤝 Hold';
        }
        const changeClass = isGain ? 'gain' : 'loss';
        const changeArrow = isGain ? '▲' : '▼'; // Arrow indicator

        // Unique ID for watchlist tracking
        const uniqueId = `${asset.id}_crypto`;
        const isAddedToWatchlist = userWatchlist.has(uniqueId);
        const watchlistButtonClass = isAddedToWatchlist ? 'added' : '';
        const watchlistButtonText = isAddedToWatchlist ? '⭐' : '☆'; // Filled star if added, empty if not

        // Add data-symbol and data-type attribute for click (use asset.id for CoinGecko crypto)
        const row = `
          <tr>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">${asset.name}</td>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">$${price.toLocaleString()}</td>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')" class="${changeClass}">${change.toFixed(2)}% ${changeArrow}</td>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">${cap ? '$' + (cap / 1e9).toFixed(1) + 'B' : 'N/A'}</td>
            <td onclick="showChartModal('${asset.id}', 'crypto', '${asset.name}')">${recommendation}</td>
            <td>
              <button class="watchlist-btn ${watchlistButtonClass}" 
                      onclick="${isAddedToWatchlist ? `removeFromWatchlist('${uniqueId}')` : `addToWatchlist({name: '${asset.name}', symbol: '${asset.id}', type: 'crypto', uniqueId: '${uniqueId}'})`}"
                      title="${isAddedToWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}">
                ${watchlistButtonText}
              </button>
            </td>
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
        // Translated recommendations with emojis (already present)
        const recommendation = change > 3 ? '📈 Buy' : change < -3 ? '📉 Sell' : '🤝 Hold';
        return `<li>${asset.name}: ${recommendation}</li>`;
      }).join('');
  }
}

// Function to update the indices list in the sidebar
function updateIndices(data) {
  const list = document.getElementById('indices-list');
  if (!list) return;

  // Check if data is an array before processing
  if (!Array.isArray(data)) {
    console.error("Data for updateIndices is not an array.", data);
    list.innerHTML = '<li>No market indices available.</li>'; // Display message if no data
    return;
  }
  
  if (data.length === 0) {
      list.innerHTML = '<li>No market indices available.</li>';
  } else {
      list.innerHTML = data.map(item => {
        const change = item.changesPercentage?.toFixed(2);
        const cls = change >= 0 ? 'gain' : 'loss';
        const changeArrow = change >= 0 ? '▲' : '▼'; // Arrow indicator
        return `<li>${item.name}: <span class="${cls}">${change}% ${changeArrow}</span></li>`;
      }).join('');
  }
}

// Function to filter and display search results
function performSearch(query) {
  const lowerCaseQuery = query.toLowerCase();

  // If query is empty, revert to the last active section view
  if (query === '') {
    // Restore active navigation link
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-section="${lastActiveSection}"]`).classList.add('active');

    // Restore active content section
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(lastActiveSection).classList.remove('hidden');

    // Repopulate lists with all data based on the restored section
    if (lastActiveSection === 'stocks') {
      updateLists(allFetchedData.stocks, [], allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
    } else if (lastActiveSection === 'crypto') {
      updateLists([], allFetchedData.cryptos, [], [], []); // Only crypto data for crypto section
    } else if (lastActiveSection === 'news') {
      fetchNews(); // Refetch news if it was the active tab
    } else if (lastActiveSection === 'home') {
        // For 'home' section, main tables are hidden
        document.getElementById('stocks').classList.add('hidden');
        document.getElementById('crypto').classList.add('hidden');
        document.getElementById('news').classList.add('hidden');
    }
    // For general recommendations and sidebar indices, use all data
    updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);
    return; // Exit function
  }

  // Store current active section before performing search
  const currentActiveNavLink = document.querySelector('.nav-link.active');
  if (currentActiveNavLink) {
    lastActiveSection = currentActiveNavLink.dataset.section;
  }

  // Filter all data types
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

  // Deactivate all navigation links and activate 'Stocks' for search results
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector('.nav-link[data-section="stocks"]').classList.add('active');

  // Hide all content sections and show 'stocks' section for search results
  document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById('stocks').classList.remove('hidden');
  // Ensure crypto section is hidden if search redirects to stocks
  document.getElementById('crypto').classList.add('hidden');
  document.getElementById('news').classList.add('hidden');
  document.getElementById('home').classList.add('hidden');


  // Update lists with filtered data
  updateLists(filteredStocks, filteredCryptos, filteredForex, filteredIndices, filteredCommodities);
  // Update sidebar indices with filtered indices and commodities
  updateIndices([...filteredIndices, ...filteredCommodities]);
}

// Handle navigation between sections
function handleNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;

      // Update the last active section when a navigation link is clicked
      lastActiveSection = section;

      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
      const activeSection = document.getElementById(section);
      if (activeSection) activeSection.classList.remove('hidden');

      // If switching to a tab displaying data, repopulate with all data
      if (section === 'stocks') {
        updateLists(allFetchedData.stocks, [], allFetchedData.forex, allFetchedData.indices, allFetchedData.commodities);
        updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);
      } else if (section === 'crypto') {
        updateLists([], allFetchedData.cryptos, [], [], []); // Only crypto data
        updateIndices([...allFetchedData.indices, ...allFetchedData.commodities]);
      } else if (section === 'news') {
        fetchNews();
      } else if (section === 'home') {
        // When navigating to home, ensure main tables are hidden
        document.getElementById('stocks').classList.add('hidden');
        document.getElementById('crypto').classList.add('hidden');
        document.getElementById('news').classList.add('hidden');
      }
      // Clear search bar on navigation
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

  chartTitle.textContent = `Price Evolution Chart for ${name}`;
  chartLoading.classList.remove('hidden');
  chartError.classList.add('hidden');
  modal.classList.remove('hidden');

  // Create period buttons if they don't exist
  if (!chartPeriodSelector.hasChildNodes()) {
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
              // Remove active class from all buttons
              document.querySelectorAll('.chart-period-selector button').forEach(btn => btn.classList.remove('active'));
              // Add active class to the clicked button
              button.classList.add('active');
              // Reload chart with new period
              showChartModal(currentChartSymbol, currentChartType, currentChartName, p);
          });
          chartPeriodSelector.appendChild(button);
      }
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
    const historicalData = await fetchHistoricalData(symbol, type, period);

    if (historicalData && historicalData.length > 0) {
      renderChart(historicalData, name, ctx);
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
    myChart.destroy(); // Destroy chart to free up resources
  }
  // Clear period selector buttons
  document.getElementById('chartPeriodSelector').innerHTML = '';
}

// Function to fetch historical data
async function fetchHistoricalData(symbol, type, period) {
  const apiKey = '86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS'; // Your FMP API key
  let url = '';
  let dataPath = '';

  if (type === 'crypto') {
    let days = period;
    if (period === '7d') days = '7';
    else if (period === '30d') days = '30';
    else if (period === '90d') days = '90';
    else if (period === '365d') days = '365';
    else if (period === 'max') days = 'max';
    else days = '30'; // Default to 30 days

    url = `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=${days}`;
    dataPath = 'prices';
  } else {
    let endDate = new Date();
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
        startDate.setFullYear(endDate.getFullYear() - 5); // Fetch 5 years for 'max'
    } else {
        startDate.setDate(endDate.getDate() - 30); // Default to 30 days
    }

    const formatDate = (date) => date.toISOString().split('T')[0];
    url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?from=${formatDate(startDate)}&to=${formatDate(endDate)}&apikey=${apiKey}`;
    dataPath = 'historical';
  }

  try {
    const response = await fetch(url);
    if (!response.ok) { // Check if response status is not 2xx
        const errorText = await response.text();
        console.error(`API error for historical data (${type}, ${symbol}, ${period}): Status ${response.status} - ${errorText}`);
        // Throw an error to be caught by showChartModal
        throw new Error(`Failed to fetch historical data: ${response.statusText || 'Unknown error'}. Check API key and console.`);
    }
    const data = await response.json();

    if (type === 'crypto' && data[dataPath]) {
      return data[dataPath].map(item => ({
        date: new Date(item[0]).toLocaleDateString('en-US'),
        price: item[1]
      }));
    } else if (data[dataPath]) {
      return data[dataPath].map(item => ({
        date: item.date,
        price: item.close
      })).reverse();
    } else {
      console.warn(`No historical data found for ${symbol} (${type}). API response:`, data);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol} (${type}):`, error);
    // Re-throw the error to be handled by showChartModal
    throw error;
  }
}

// Function to render the chart with Chart.js
function renderChart(historicalData, assetName, ctx) {
  const labels = historicalData.map(data => data.date);
  const prices = historicalData.map(data => data.price);

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `Price of ${assetName} (USD)`,
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
            text: 'Price (USD)',
            color: '#e0e0e0'
          },
          ticks: {
            color: '#b0b0b0',
            callback: function(value) {
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
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
                label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
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
  initializeFirebase(); // Initialise Firebase et l'authentification
  handleNavigation(); // Initialise la navigation et la visibilité des sections
  fetchData(); // Première récupération des données

  // Gestion du bouton d'authentification
  document.getElementById('authButton').addEventListener('click', async () => {
    if (!auth) { // Si l'objet auth n'est pas initialisé
      console.error("Firebase Auth object is not initialized. Cannot perform login/logout. Attempting re-initialization.");
      initializeFirebase(); // Tente de réinitialiser Firebase
      return;
    }
    if (auth.currentUser) { // Si un utilisateur est déjà connecté
      await signOut(auth);
    } else { // Si aucun utilisateur n'est connecté
      await signInAnonymously(auth);
    }
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

  // Interval de rafraîchissement des données (très long ici, ajuster si nécessaire)
  setInterval(fetchData, 1000000);
});

