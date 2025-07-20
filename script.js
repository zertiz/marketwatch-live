async function fetchData() {
  const cryptoUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum';
  const stockUrl = 'https://financialmodelingprep.com/api/v3/quote/AAPL,NVDA,MSFT,TSLA?apikey=GKTmxyXWbKpCSjj67xYW9xf7pPK86ALi';

  try {
    const [cryptoRes, stockRes] = await Promise.all([
      fetch(cryptoUrl),
      fetch(stockUrl)
    ]);

    const cryptoData = await cryptoRes.json();
    const stockData = await stockRes.json();

    updateLists(stockData, cryptoData);
    updateIndices(stockData);
  } catch (error) {
    console.error("Erreur lors du chargement des données :", error);
  }
}

function updateLists(stocks, cryptos) {
  const stockList = document.getElementById('stock-list');
  const cryptoList = document.getElementById('crypto-list');
  const recList = document.getElementById('recommendations');

  if (!stockList || !cryptoList || !recList) return;

  stockList.innerHTML = '';
  cryptoList.innerHTML = '';

  const allAssets = [...stocks, ...cryptos];

  allAssets.forEach(asset => {
    const change = asset.price_change_percentage_24h ?? asset.changesPercentage;
    const price = asset.current_price ?? asset.price;
    const cap = asset.market_cap ?? asset.marketCap;
    const isGain = change >= 0;
    const recommendation = change > 3 ? 'Acheter' : change < -3 ? 'Vendre' : 'Conserver';
    const changeClass = isGain ? 'gain' : 'loss';

    const row = `
      <tr>
        <td>${asset.name}</td>
        <td>$${price.toLocaleString()}</td>
        <td class="${changeClass}">${change.toFixed(2)}%</td>
        <td>$${(cap / 1e9).toFixed(1)}B</td>
        <td>${recommendation}</td>
      </tr>
    `;

    if (asset.symbol && ['AAPL', 'NVDA', 'MSFT', 'TSLA'].includes(asset.symbol)) {
      stockList.innerHTML += row;
    } else {
      cryptoList.innerHTML += row;
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
  if (!list) return;

  list.innerHTML = data.map(item => {
    const change = item.changesPercentage?.toFixed(2);
    const cls = change >= 0 ? 'gain' : 'loss';
    return `<li>${item.name}: <span class="${cls}">${change}%</span></li>`;
  }).join('');
}

async function fetchNews() {
  const newsContainer = document.getElementById('news-articles');
  if (!newsContainer) return;

  newsContainer.innerHTML = '<p>Chargement...</p>';

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
  setInterval(fetchData, 60000);
});
