'use strict';

/* global browser, escapeRegExp */

startOptions();

async function startOptions() {
  const options = (await browser.storage.sync.get('options')).options || {};

  const tooltipWarnings = document.getElementById('tooltip-warnings');
  const tooltipNoWarnings = document.getElementById('tooltip-no-warnings');
  const misleadingLinks = document.getElementById('misleading-links');
  const excludedWebsites = document.getElementById('excluded-websites');
  const saveButton = document.getElementById('save-button');

  if (options.tooltipWarnings) {
    tooltipWarnings.value = options.tooltipWarnings;
  }

  if (options.tooltipNoWarnings) {
    tooltipNoWarnings.value = options.tooltipNoWarnings;
  }

  if (options.misleadingLinks !== undefined) {
    misleadingLinks.checked = options.misleadingLinks;
  }

  if (options.excludedWebsites) {
    excludedWebsites.value = options.excludedWebsites;
  }

  tooltipWarnings.addEventListener('change', () => {
    saveButton.disabled = false;
  });

  tooltipNoWarnings.addEventListener('change', () => {
    saveButton.disabled = false;
  });

  misleadingLinks.addEventListener('change', () => {
    saveButton.disabled = false;
  });

  excludedWebsites.addEventListener('input', () => {
    saveButton.disabled = false;
  });

  saveButton.addEventListener('click', () => {
    saveButton.disabled = true;
    browser.storage.sync.set({
      options: {
        tooltipWarnings: tooltipWarnings.value,
        tooltipNoWarnings: tooltipNoWarnings.value,
        misleadingLinks: misleadingLinks.checked,
        excludedWebsites: excludedWebsites.value,
        excludedWebsitesRegex: excludedWebsitesToRegex(excludedWebsites.value),
      }
    });
  });
}

function excludedWebsitesToRegex(excludedWebsites) {
  let regex = '';

  for (const website of excludedWebsites.trim().split(/\s+/)) {
    regex += escapeRegExp(website).replace(/^\\\*\\\./, '(.*\\.)?').replace(/\\\*/g, '.*') + '|';
  }

  regex = regex.slice(0, -1);

  return '^(' + regex + ')$';
}
