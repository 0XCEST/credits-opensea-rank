let ranksData = null;

async function initRanks() {
  try {
    const resourceUrl = chrome.runtime.getURL("ranks.json");
    const response = await fetch(resourceUrl);
    ranksData = await response.json();
    console.log("[Credits Extension] Database loaded successfully! Total records:", Object.keys(ranksData).length);
    renderBadges();
  } catch (error) {
    console.error("[Credits Extension] Failed to load ranks database:", error);
  }
}

function getRarityTier(rank) {
  if (rank <= 100) return "tier-mythic";
  if (rank <= 1000) return "tier-legendary";
  if (rank <= 5000) return "tier-rare";
  return "tier-standard";
}

function renderBadges() {
  if (!ranksData) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;

  while ((node = walker.nextNode())) {
    const text = node.nodeValue ? node.nodeValue.trim() : "";
    const match = text.match(/Credit\s*#?(\d+)/i) || text.match(/^#(\d+)$/);
    if (!match) continue;

    const tokenId = match[1];
    const itemData = ranksData[tokenId];
    if (!itemData) continue;

    const parentElem = node.parentElement;
    if (!parentElem || parentElem.closest('.credits-badge-wrapper') || parentElem.getAttribute('data-credits-processed')) continue;

    const container = parentElem.closest('article') || 
                      parentElem.closest('tr') || 
                      parentElem.closest('[role="row"]') || 
                      parentElem.closest('a') || 
                      parentElem;

    if (container.querySelector('.credits-badge-wrapper')) continue;

    parentElem.setAttribute('data-credits-processed', 'true');

    const rank = itemData.r;
    const score = itemData.s;
    const eights = itemData.e;
    const tierClass = getRarityTier(rank);

    // Badge wrapper container
    const wrapper = document.createElement('div');
    wrapper.className = 'credits-badge-wrapper';

    // 1. Primary Rank & Score Badge
    const rankBadge = document.createElement('span');
    rankBadge.className = `credits-badge ${tierClass}`;
    
    let label = `#${rank.toLocaleString()}`;
    if (score) {
      label += ` · ${score}`;
    }
    rankBadge.innerText = label;
    wrapper.appendChild(rankBadge);

    // 2. Eights Pattern Badge (Bronze: 3, Silver: 4, Gold: 5+)
    if (eights && eights >= 3) {
      const eightsBadge = document.createElement('span');
      if (eights === 3) {
        eightsBadge.className = 'credits-badge eights-bronze';
        eightsBadge.innerText = '🥉 3×8s';
        eightsBadge.title = 'Bronze: 3 Eights Pattern';
      } else if (eights === 4) {
        eightsBadge.className = 'credits-badge eights-silver';
        eightsBadge.innerText = '🥈 4×8s';
        eightsBadge.title = 'Silver: 4 Eights Pattern';
      } else if (eights >= 5) {
        eightsBadge.className = 'credits-badge eights-gold';
        eightsBadge.innerText = `👑 ${eights}×8s`;
        eightsBadge.title = `Gold: Ultra Rare ${eights} Eights Pattern`;
      }
      wrapper.appendChild(eightsBadge);
    }

    // Attach to layout (row vs card view)
    if (container.tagName === 'TR' || container.getAttribute('role') === 'row') {
      wrapper.classList.add('inline-view');
      parentElem.appendChild(wrapper);
    } else {
      container.style.position = 'relative';
      container.appendChild(wrapper);
    }
  }
}

// Observe DOM mutations for infinite scroll
let debounceTimer = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderBadges, 120);
});

observer.observe(document.body, { childList: true, subtree: true });

initRanks();