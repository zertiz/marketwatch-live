// Global variables to store all fetched data
let allFetchedData = {
  stocks: [],
  cryptos: [],
  forex: [],
  indices: [],
  commodities: []
};

// Variable to keep track of the last active section before a search
let lastActiveSection = 'home';

async function fetchData() {
  const cryptoUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin,tron,polkadot,polygon,chainlink';
  const stockUrl = 'https://financialmodelingprep.com/api/v3/quote/AAPL,NVDA,MSFT,TSLA,AMZN,META,GOOG,JPM,BAC,V?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';
  const forexUrl = 'https://financialmodelingprep.com/api/v3/quote/EURUSD,USDJPY,GBPUSD,AUDUSD,USDCAD,USDCHF,USDCNY,USDHKD,USDSEK,USDSGD?apikey=86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS';
  // Corrected indices URL: encoding '^' to '%5E' to fix 404 error
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
    newsContainer.innerHTML = '<p>Error loading news.</p>';
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

  allNonCryptoAssets.forEach(asset => {
    const change = asset.changesPercentage ?? 0;
    const price = asset.price ?? 0;
    const cap = asset.marketCap ?? 0;
    const isGain = change >= 0;
    // Translated recommendations
    const recommendation = change > 3 ? 'Buy' : change < -3 ? 'Sell' : 'Hold';
    const changeClass = isGain ? 'gain' : 'loss';

    // Add data-symbol and data-type attribute for click
    // Use asset.symbol for FMP, and a generic type like 'stock_fmp' to distinguish them
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

  // Data for Crypto table
  (Array.isArray(cryptos) ? cryptos : []).forEach(asset => {
    const change = asset.price_change_percentage_24h ?? 0;
    const price = asset.current_price ?? 0;
    const cap = asset.market_cap ?? 0;
    const isGain = change >= 0;
    // Translated recommendations
    const recommendation = change > 3 ? 'Buy' : change < -3 ? 'Sell' : 'Hold';
    const changeClass = isGain ? 'gain' : 'loss';

    // Add data-symbol and data-type attribute for click (use asset.id for CoinGecko crypto)
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

  // Data for Recommendations sidebar
  const allAssetsForRecommendations = [
    ...(Array.isArray(stocks) ? stocks : []),
    ...(Array.isArray(cryptos) ? cryptos : []),
    ...(Array.isArray(forex) ? forex : []),
    ...(Array.isArray(indices) ? indices : []),
    ...(Array.isArray(commodities) ? commodities : [])
  ];

  recList.innerHTML = allAssetsForRecommendations.map(asset => {
    const change = asset.price_change_percentage_24h ?? asset.changesPercentage ?? 0;
    // Translated recommendations
    const recommendation = change > 3 ? '📈 Buy' : change < -3 ? '📉 Sell' : '🤝 Hold';
    return `<li>${asset.name}: ${recommendation}</li>`;
  }).join('');
}

// Function to update the indices list in the sidebar
function updateIndices(data) {
  const list = document.getElementById('indices-list');
  if (!list) return;

  // Check if data is an array before processing
  if (!Array.isArray(data)) {
    console.error("Data for updateIndices is not an array.", data);
    return;
  }

  list.innerHTML = data.map(item => {
    const change = item.changesPercentage?.toFixed(2);
    const cls = change >= 0 ? 'gain' : 'loss';
    return `<li>${item.name}: <span class="${cls}">${change}%</span></li>`;
  }).join('');
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

// Variables for the chart
let myChart; // To store the Chart.js instance

// Function to display the chart modal
async function showChartModal(symbol, type, name) {
  const modal = document.getElementById('chartModal');
  const chartTitle = document.getElementById('chartTitle');
  const chartLoading = document.getElementById('chartLoading');
  const chartError = document.getElementById('chartError');
  const chartCanvas = document.getElementById('historicalChart');
  const ctx = chartCanvas.getContext('2d');

  chartTitle.textContent = `Price Evolution Chart for ${name}`; // Translated chart title
  chartLoading.classList.remove('hidden');
  chartError.classList.add('hidden');
  modal.classList.remove('hidden'); // Show modal

  // Destroy old chart if it exists
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
      chartError.textContent = "No historical data available for this asset or API error."; // Translated error message
    }
  } catch (error) {
    console.error("Error loading historical data:", error);
    chartLoading.classList.add('hidden');
    chartError.classList.remove('hidden');
    chartError.textContent = "Error loading historical data. Please try again later."; // Translated error message
  }
}

// Function to close the chart modal
function closeChartModal() {
  document.getElementById('chartModal').classList.add('hidden');
  if (myChart) {
    myChart.destroy(); // Destroy chart to free up resources
  }
}

// Function to fetch historical data
async function fetchHistoricalData(symbol, type) {
  const apiKey = '86QS6gyJZ8AhwRqq3Z4WrNbGnm3XjaTS'; // Your FMP API key
  let url = '';
  let dataPath = ''; // To know where price data is in the response

  if (type === 'crypto') {
    // CoinGecko uses a unique ID for each crypto (e.g., 'bitcoin')
    // The 'symbol' passed here is already the CoinGecko ID
    url = `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=30`; // 30 days of data
    dataPath = 'prices'; // Price data is under the 'prices' key
  } else {
    // For stocks, forex, indices, commodities (Financial Modeling Prep)
    // Using 'historical-price-full' endpoint
    url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}`;
    dataPath = 'historical'; // Historical data is under the 'historical' key
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (type === 'crypto' && data[dataPath]) {
      // CoinGecko returns an array of [timestamp, price]
      return data[dataPath].map(item => ({
        date: new Date(item[0]).toLocaleDateString('en-US'), // Changed to en-US for date format
        price: item[1]
      }));
    } else if (data[dataPath]) {
      // FMP returns an array of objects with 'date' and 'close'
      // We want the most recent data first, so reverse
      return data[dataPath].map(item => ({
        date: item.date,
        price: item.close
      })).reverse(); // Reverse to have dates in ascending order
    } else {
      console.warn(`No historical data found for ${symbol} (${type}). API response:`, data);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol} (${type}):`, error);
    return [];
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
        label: `Price of ${assetName} (USD)`, // Translated chart label
        data: prices,
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allows the chart to adapt to canvas size
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date' // Translated axis title
          }
        },
        y: {
          title: {
            display: true,
            text: 'Price (USD)' // Translated axis title
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

// Initialize navigation and data fetching on DOM load
document.addEventListener('DOMContentLoaded', () => {
  handleNavigation(); // Initializes navigation and section visibility
  fetchData(); // Initial data fetch
  // Add event listener for the search bar
  const searchBar = document.querySelector('.search-bar');
  if (searchBar) {
    searchBar.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });
  }

  // Listener for modal close button
  const closeButton = document.querySelector('.close-button');
  if (closeButton) {
    closeButton.addEventListener('click', closeChartModal);
  }

  // Close modal if clicking outside content (on overlay)
  const chartModal = document.getElementById('chartModal');
  if (chartModal) {
    chartModal.addEventListener('click', (e) => {
      if (e.target === chartModal) {
        closeChartModal();
      }
    });
  }

  // Data refresh interval (very long here, adjust if needed)
  setInterval(fetchData, 1000000);
});
