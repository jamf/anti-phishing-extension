'use strict';

/* global browser, DomainRankingManager, psl, punycode, escapeRegExp */

const config = {
  maxRankWellKnownDomain: 20000,
  maxRankConsiderSubdomains: 1000,
  smallVisitCountLimit: 3,
  unknownDomainVisitCountLimit: 10,
  domainInfoCacheSeconds: 2,
};

const domainRankingManager = new DomainRankingManager({
  domainMaxCount: config.maxRankWellKnownDomain,
  updateInterval: 1000 * 60 * 60 * 24 * 7
});

const tabsDomainInfo = {};

// Some websites, such as Google Docs, fire the browser.tabs.onUpdated listener
// multiple times on load, which causes the extension loading to be delayed for
// several seconds due to ongoing access to browser history. Caching the domain
// info fixes this.
const domainInfoCache = {};

browser.runtime.onMessage.addListener(onMessage);
browser.tabs.onCreated.addListener(onCreatedTab);
browser.tabs.onUpdated.addListener(onUpdatedTab);
browser.tabs.onRemoved.addListener(onRemovedTab);

function onMessage(request, sender) {
  if (request.type === 'getDomainInfo') {
    return onGetDomainInfo(sender);
  } else if (request.type === 'misleadingLinkInfo') {
    return onMisleadingLinkInfo(request.link, request.text);
  }
}

async function onMisleadingLinkInfo(link, text) {
  let linkDomain = null;
  let textDomain = null;

  try {
    linkDomain = new URL(link).hostname;

    let textUrl = text;
    if (!textUrl.startsWith('http://') && !textUrl.startsWith('https://')) {
      textUrl = 'https://' + textUrl;
    }
    textDomain = new URL(textUrl).hostname;
  } catch (e) {
    return null;
  }

  if (linkDomain.replace(/^www\./, '') === textDomain.replace(/^www\./, '')) {
    return null;
  }

  if (!isIpAddress(textDomain)) {
    const parsed = psl.parse(textDomain);
    if (!parsed.listed || !parsed.sld) {
      return null;
    }
  } else if (!text.match(/^https?:\/\//)) {
    // To avoid false positives, such as a number (1234 is a valid IP address)
    // or a version number (1.2.3.4), treat the text as a link only if it's
    // prefixed with a protocol.
    return null;
  }

  if (!isIpAddress(linkDomain)) {
    const domainRanking = await domainRankingManager.getDomainRanking();

    let linkDomainToCheck = linkDomain;

    const parsed = psl.parse(linkDomainToCheck);
    if (parsed.domain && parsed.subdomain) {
      const rank = domainRanking.getDomainRank(parsed.domain);
      if (rank && rank <= config.maxRankConsiderSubdomains) {
        linkDomainToCheck = parsed.domain;
      } else if (parsed.subdomain === 'www') {
        linkDomainToCheck = parsed.domain;
      }
    }

    if (domainRanking.getDomainRank(linkDomainToCheck)) {
      return null; // popular domain
    }
  }

  return {
    linkDomain,
    textDomain
  };
}

async function onGetDomainInfo(sender) {
  let tab = sender.tab;
  if (!tab) {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs[0]) {
      return null;
    }

    tab = tabs[0];
  }

  if (tab.id === browser.tabs.TAB_ID_NONE) {
    return null;
  }

  if (tabsDomainInfo[tab.id] === undefined) {
    onCreatedTab(tab);
  }

  return tabsDomainInfo[tab.id].data;
}

function onCreatedTab(tab) {
  tabsDomainInfo[tab.id] = {
    url: tab.url,
    data: updateDataForTab(tab.id, tab.url)
  };
}

function onUpdatedTab(tabId, changeInfo, tabInfo) {
  if (!changeInfo.url && changeInfo.status !== 'loading') {
    return;
  }

  tabsDomainInfo[tabId] = {
    url: tabInfo.url,
    data: updateDataForTab(tabId, tabInfo.url)
  };
}

function onRemovedTab(tabId, removeInfo) {
  delete tabsDomainInfo[tabId];
}

async function updateDataForTab(tabId, url) {
  let domainInfo = null;

  if (url) {
    try {
      const urlObject = new URL(url);

      const cacheKey = urlObject.protocol + (urlObject.protocol === 'file:' ? urlObject.href : urlObject.hostname);

      if (domainInfoCache[cacheKey]) {
        domainInfo = await domainInfoCache[cacheKey];
      } else {
        const domainInfoPromise = getDomainInfo(urlObject);
        domainInfoCache[cacheKey] = domainInfoPromise;
        setTimeout(() => {
          if (domainInfoCache[cacheKey] === domainInfoPromise) {
            delete domainInfoCache[cacheKey];
          }
        }, 1000 * config.domainInfoCacheSeconds);

        domainInfo = await domainInfoPromise;
      }
    } catch (e) { }
  }

  const warningCount = domainInfo ? Object.keys(domainInfo.warnings).length : 0;

  browser.browserAction.setBadgeBackgroundColor({
    tabId,
    color: [217, 0, 0, 255]
  });
  browser.browserAction.setBadgeText({
    tabId,
    text: warningCount > 0 ? warningCount.toString() : ''
  });

  return domainInfo;
}

async function getDomainInfo({ protocol, hostname, href }) {
  const domainRanking = await domainRankingManager.getDomainRanking();

  const data = {
    url: {
      protocol,
      hostname,
      href
    },
    warnings: {}
  };

  if (protocol === 'file:') {
    let identDomain = href;

    data.isLocalFile = true;
    data.identDomain = identDomain;
    data.isPopular = false;
    data.visitCount = await getUrlVisitCount(identDomain);
  } else if (protocol !== 'http:' && protocol !== 'https:') {
    data.isUnsupportedPage = true;
    data.identDomain = href;
  } else {
    let identDomain = hostname;

    if (!isIpAddress(hostname)) {
      const parsed = psl.parse(hostname);
      if (parsed.domain && parsed.subdomain) {
        const rank = domainRanking.getDomainRank(parsed.domain);
        if (rank && rank <= config.maxRankConsiderSubdomains) {
          identDomain = parsed.domain;
        } else if (parsed.subdomain === 'www') {
          identDomain = parsed.domain;
        }
      }
    }

    data.identDomain = identDomain;
    data.isPopular = !!domainRanking.getDomainRank(identDomain);
    data.visitCount = await getDomainVisitCount(identDomain);

    if (!data.isPopular) {
      const similarTopDomain = domainRanking.getSimilarTopDomain(identDomain);
      if (similarTopDomain) {
        data.warnings.similarTopDomain = similarTopDomain;
      }

      const punycodeDecoded = punycode.toUnicode(identDomain);
      if (punycodeDecoded !== identDomain) {
        data.warnings.unicodeDomain = punycodeDecoded;
      }
    }

    if (protocol === 'http:') {
      data.warnings.insecure = true;
    }
  }

  if (!data.isUnsupportedPage) {
    // Exclude this visit.
    data.visitCount = Math.max(data.visitCount - 1, 0);

    if (!data.isPopular && data.visitCount <= config.smallVisitCountLimit) {
      data.warnings.smallVisitCount = true;
    }

    // If the domain name is seemingly suspicious (e.g. Unicode),
    // but it was visited enough times, don't nag too much about it,
    // it's probably OK.
    data.alertedMode = !!(
      data.warnings.insecure ||
      (data.visitCount <= config.unknownDomainVisitCountLimit && Object.keys(data.warnings).length > 0)
    );
  }

  return data;
}

function isIpAddress(domain) {
  // Reference:
  // https://stackoverflow.com/a/17871737

  if (domain.match(/^((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])$/)) {
    return true; // IPv4
  }

  if (domain.match(/^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/)) {
    return true; // IPv6
  }

  return false;
}

async function getDomainVisitCount(domain) {
  const visits = await browser.history.search({
    text: domain,
    startTime: 0,
    maxResults: 1000
  });

  let visitCount = 0;
  const urlMatchRegex = new RegExp('^https?://([0-9a-z\\-]+\\.)*' + escapeRegExp(domain) + '(/|$)', 'i');
  for (const visit of visits) {
    if (visit.url && visit.visitCount && visit.url.match(urlMatchRegex)) {
      visitCount += visit.visitCount;
    }
  }

  return visitCount;
}

async function getUrlVisitCount(url) {
  const visits = await browser.history.getVisits({ url });

  let visitCount = 0;
  for (const visit of visits) {
    if (visit.transition !== 'reload') {
      visitCount++;
    }
  }

  return visitCount;
}
