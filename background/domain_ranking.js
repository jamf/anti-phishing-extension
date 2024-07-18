'use strict';

/* global browser */

class DomainRanking {
  constructor(topDomainsArray) {
    this.topDomains = this._topDomainsFromArray(topDomainsArray);
  }

  getDomainRank(domain) {
    return this.topDomains.map[domain] ?? null;
  }

  getSimilarTopDomain(domain) {
    const canonicalDomain = this._toCanonicalDomain(domain);
    const matchRank = this.topDomains.canonicalMap[canonicalDomain];
    if (!matchRank) {
      return null;
    }

    return this.topDomains.array[matchRank - 1];
  }

  _topDomainsFromArray(topDomainsArray) {
    const array = topDomainsArray;

    const map = topDomainsArray.reduce((map, domain, index) => {
      map[domain] = index + 1;
      return map;
    }, {});

    const canonicalMap = topDomainsArray.reduce((acc, domain, index) => {
      const canonicalDomain = this._toCanonicalDomain(domain);
      if (!acc[canonicalDomain]) {
        acc[canonicalDomain] = index + 1;
      }
      return acc;
    }, {});

    return {
      array,
      map,
      canonicalMap
    };
  }

  _toCanonicalDomain(domain) {
    if (domain.startsWith('xn--')) {
      return domain;
    }

    // Reference:
    // https://security.stackexchange.com/a/128463

    return domain
      .replace(/0/g, 'o')
      .replace(/[1i]/g, 'l')
      .replace(/2/g, 'z')
      .replace(/5/g, 's')
      .replace(/6/g, 'b')
      .replace(/[9g]/g, 'q')
      .replace(/u/g, 'v')
      .replace(/ci/g, 'a')
      .replace(/cl/g, 'd')
      .replace(/cj/g, 'g')
      .replace(/rn/g, 'm')
      .replace(/vv/g, 'w')
      .replace(/-/g, '')
      ;
  }
}

class DomainRankingManager {
  constructor({ domainMaxCount, updateInterval }) {
    this.config = {
      domainMaxCount,
      updateInterval
    };

    this.domainRanking = null;

    this.initPromise = this._init();
  }

  async getDomainRanking() {
    await this.initPromise;
    return this.domainRanking;
  }

  async _init() {
    let nextUpdateTimeout = this.config.updateInterval;

    try {
      const data = await browser.storage.local.get([
        'topDomainsTimestamp',
        'topDomains'
      ]);

      let dataAge = null;
      if (data.topDomains && data.topDomainsTimestamp) {
        dataAge = Date.now() - data.topDomainsTimestamp;
      }

      if (dataAge !== null && dataAge >= 0 && dataAge < this.config.updateInterval) {
        this.domainRanking = new DomainRanking(data.topDomains);
        nextUpdateTimeout -= dataAge;
      } else {
        this.domainRanking = new DomainRanking([]);
        nextUpdateTimeout = 0;
      }
    } catch (e) {
      console.error(e);
      this.domainRanking = new DomainRanking([]);
    }

    setTimeout(() => {
      this._updateTopDomains();
      setInterval(() => this._updateTopDomains(), this.config.updateInterval);
    }, nextUpdateTimeout);
  }

  async _updateTopDomains() {
    const topDomainsArray = await this._getTopDomainsArray(this.config.domainMaxCount);
    await browser.storage.local.set({
      topDomains: topDomainsArray,
      topDomainsTimestamp: Date.now()
    });
    this.domainRanking = new DomainRanking(topDomainsArray);
  }

  async _getTopDomainsArray(amount) {
    const url = 'https://downloads.majestic.com/majestic_million.csv';

    const data = await fetch(url).then(r => r.text());

    let topDomainsRetrieved = data
      .replace(/^.*\n(?:\d+,){2}/, '')
      .split(/(?:,[^,]*){9}\n(?:\d+,){2}/, amount);
    return topDomainsRetrieved;
  }
}
