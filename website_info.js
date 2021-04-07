'use strict';

/* global ColorHash, CRC32 */

function websiteInfoRender(domainInfo, userId, renderTarget) {
  if (domainInfo.isUnsupportedPage) {
    return contentWrapper(`
      <div>
        This tab is not compatible with phishing protection.
      </div>
    `);
  }

  const domainName = domainInfo.identDomain;

  const colorHash = new ColorHash({ hash: str => CRC32.str(str) >>> 0 });
  const domainBgColor = colorHash.hex(userId + domainName);

  const domainEmoji = strToIdentityEmoji(userId + domainName, CRC32);

  const resourceName = domainInfo.isLocalFile ? 'file' : 'website';

  const warningCount = Object.keys(domainInfo.warnings).length;

  const t = escapeHtml;

  const helpUrl = 'https://anti-phishing.zecops.com/';
  const reportUrl = 'https://anti-phishing.zecops.com/report';

  const content = `
    ${warningCount === 0 ? '' : `
      <div class="zecops-anti-phishing-extension-tooltip-heading">
        ⚠️ ${warningCount > 1 ? 'Warnings' : 'Warning'} ⚠️
      </div>
      <div class="zecops-anti-phishing-extension-tooltip-warnings">
        ${!domainInfo.warnings.smallVisitCount ? '' : `
          <div>
            ${warningCount > 1 ? '• ' : ''}
            ${domainInfo.visitCount === 0 ? `
              This is the first time that this ${resourceName} is visited on this device.
            ` : domainInfo.visitCount === 1 ? `
              This ${resourceName} was visited only once on this device.
            ` : `
              This ${resourceName} was visited only ${domainInfo.visitCount} times on this device.
            `}
            ${domainInfo.isLocalFile ? `
              Make sure that you got the file from a trusted contact,
              and beware of entering sensitive information.
            ` : `
              Carefully verify the address in the address bar.
            `}
          </div>
        `}
        ${!domainInfo.warnings.unicodeDomain ? '' : `
          <div>
            ${warningCount > 1 ? '• ' : ''}
            The domain name contains Unicode characters (${t(domainInfo.warnings.unicodeDomain).replace(
              /[^\x20-\x7e]+/ug,
              '<span class="zecops-anti-phishing-extension-tooltip-red">$&</span>'
            )}).
            Make sure that this is the website that you intended to visit.
          </div>
        `}
        ${!domainInfo.warnings.similarTopDomain ? '' : `
          <div>
            ${warningCount > 1 ? '• ' : ''}
            The domain name,
            <span class="zecops-anti-phishing-extension-tooltip-red">${t(domainName)}</span>,
            is visually similar to another domain of a popular website,
            <span class="zecops-anti-phishing-extension-tooltip-green">${t(domainInfo.warnings.similarTopDomain)}</span>.
          </div>
        `}
        ${!domainInfo.warnings.insecure ? '' : `
          <div>
            ${warningCount > 1 ? '• ' : ''}
            The connection to this website is not secure.
            Refrain from entering sensitive information, such as passwords
            or credit cards, on this site.
          </div>
        `}
      </div>
      <hr>
    `}
    ${!domainInfo.isPopular ? '' : `
      <div>
        <span class="zecops-anti-phishing-extension-tooltip-green">
          ✔
        </span>
        <strong>${t(domainName)}</strong> is a well known website
      </div>
      <hr>
    `}
    <div>
      <div class="zecops-anti-phishing-extension-tooltip-domain"
        style="background-color: ${domainBgColor};">
        ${t(domainName)}
      </div>
      <div class="zecops-anti-phishing-extension-tooltip-domain-emoji">
        ${domainEmoji}
      </div>
    </div>
    <div>
      <strong>Times visited:</strong>
      <span class="zecops-anti-phishing-extension-tooltip-visit-count">
        ${domainInfo.visitCount}
        ${domainInfo.warnings.smallVisitCount ? '⚠️' : ''}
      </span>
    </div>
    <hr>
    <div class="zecops-anti-phishing-extension-tooltip-actions">
      <a title="Get help on using the extension and avoiding phishing" href="${helpUrl}" target="_blank">
        <div class="zecops-anti-phishing-extension-tooltip-actions-icon">
          ${iconQuestionCircle(32)}
        </div>
        Help
      </a>
      <a title="Report a suspicious website" href="${reportUrl}?url=${encodeURIComponent(domainInfo.url.href)}" target="_blank">
        <div class="zecops-anti-phishing-extension-tooltip-actions-icon">
          ${iconFlag(32)}
        </div>
        Report
      </a>
      ${renderTarget === 'tooltip' ? `
        <a title="Hide the phishing balloon for this session" href="#" class="zecops-anti-phishing-extension-dismiss">
          <div class="zecops-anti-phishing-extension-tooltip-actions-icon">
            ${iconClose(32)}
          </div>
          Dismiss
        </a>
      ` : `
        <a title="Show extension options" href="#" class="zecops-anti-phishing-extension-options">
          <div class="zecops-anti-phishing-extension-tooltip-actions-icon">
            ${iconCog(32)}
          </div>
          Options
        </a>
      `}
    </div>
  `;

  return contentWrapper(content);
}

function misleadingLinkInfoRender(misleadingLinkInfo) {
  const { linkDomain, textDomain } = misleadingLinkInfo;

  const t = escapeHtml;

  const content = `
    <div class="zecops-anti-phishing-extension-tooltip-heading">
      ⚠️ Warning ⚠️
    </div>
    <div class="zecops-anti-phishing-extension-tooltip-warnings">
      <div>
        The link is misleading. The text shows
        <span class="zecops-anti-phishing-extension-tooltip-red">${t(textDomain)}</span>,
        while the actual link leads to
        <span class="zecops-anti-phishing-extension-tooltip-red">${t(linkDomain)}</span>.
      </div>
    </div>
  `;

  return contentWrapper(content);
}

function contentWrapper(content) {
  return `
    <div class="zecops-anti-phishing-extension-tooltip">
      <div class="zecops-anti-phishing-extension-tooltip-heading">
        ZecOps <span style="white-space: nowrap;">Anti-Phishing</span>
      </div>
      <hr>
      ${content}
    </div>
  `;
}

function strToIdentityEmoji(str, CRC32) {
  const emoji = [
    '💎','🏄','🚴','🏆','⚽','🏀','🎳','🏓',
    '🎵','🎧','🎸','🎹','📺','📷','🍇','🍉','🍋','🍌','🍍','🍎','🍒','🍓',
    '🥝','🍅','🥑','🍆','🥕','🌽','🧀','🍕','🌭','🎂','🍫','☕','🍺',
    '🐵','🐶','🐈','🐎','🐷','🐘','🐰','🐊','🐢','🐍','🌸','🌲','🌵','⚡',
    '💣','🚦','🎲','💡','🔑','💰','🌍','🌞','☔','⌚','🎈',
  ];

  // Unsigned integer:
  // https://github.com/SheetJS/js-crc32/issues/10#issuecomment-349891951
  const hash = CRC32.str(str) >>> 0;

  return emoji[hash % emoji.length];
}

// https://fontawesome.com/icons/question-circle?style=regular
function iconQuestionCircle(size) {
  return `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="question-circle" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-question-circle fa-w-16"
    style="width: ${size}px; vertical-align: middle;">
    <path fill="currentColor" d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 448c-110.532 0-200-89.431-200-200 0-110.495 89.472-200 200-200 110.491 0 200 89.471 200 200 0 110.53-89.431 200-200 200zm107.244-255.2c0 67.052-72.421 68.084-72.421 92.863V300c0 6.627-5.373 12-12 12h-45.647c-6.627 0-12-5.373-12-12v-8.659c0-35.745 27.1-50.034 47.579-61.516 17.561-9.845 28.324-16.541 28.324-29.579 0-17.246-21.999-28.693-39.784-28.693-23.189 0-33.894 10.977-48.942 29.969-4.057 5.12-11.46 6.071-16.666 2.124l-27.824-21.098c-5.107-3.872-6.251-11.066-2.644-16.363C184.846 131.491 214.94 112 261.794 112c49.071 0 101.45 38.304 101.45 88.8zM298 368c0 23.159-18.841 42-42 42s-42-18.841-42-42 18.841-42 42-42 42 18.841 42 42z" class=""></path></svg>
    `;
}

// https://fontawesome.com/icons/flag?style=regular
function iconFlag(size) {
  return `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="flag" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-flag fa-w-16"
    style="width: ${size}px; vertical-align: middle;">
    <path fill="currentColor" d="M336.174 80c-49.132 0-93.305-32-161.913-32-31.301 0-58.303 6.482-80.721 15.168a48.04 48.04 0 0 0 2.142-20.727C93.067 19.575 74.167 1.594 51.201.104 23.242-1.71 0 20.431 0 48c0 17.764 9.657 33.262 24 41.562V496c0 8.837 7.163 16 16 16h16c8.837 0 16-7.163 16-16v-83.443C109.869 395.28 143.259 384 199.826 384c49.132 0 93.305 32 161.913 32 58.479 0 101.972-22.617 128.548-39.981C503.846 367.161 512 352.051 512 335.855V95.937c0-34.459-35.264-57.768-66.904-44.117C409.193 67.309 371.641 80 336.174 80zM464 336c-21.783 15.412-60.824 32-102.261 32-59.945 0-102.002-32-161.913-32-43.361 0-96.379 9.403-127.826 24V128c21.784-15.412 60.824-32 102.261-32 59.945 0 102.002 32 161.913 32 43.271 0 96.32-17.366 127.826-32v240z" class=""></path></svg>
    `;
}

// https://fontawesome.com/icons/window-close?style=regular
function iconClose(size) {
  return `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="window-close" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-window-close fa-w-16"
    style="width: ${size}px; vertical-align: middle;">
    <path fill="currentColor" d="M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm0 394c0 3.3-2.7 6-6 6H54c-3.3 0-6-2.7-6-6V86c0-3.3 2.7-6 6-6h404c3.3 0 6 2.7 6 6v340zM356.5 194.6L295.1 256l61.4 61.4c4.6 4.6 4.6 12.1 0 16.8l-22.3 22.3c-4.6 4.6-12.1 4.6-16.8 0L256 295.1l-61.4 61.4c-4.6 4.6-12.1 4.6-16.8 0l-22.3-22.3c-4.6-4.6-4.6-12.1 0-16.8l61.4-61.4-61.4-61.4c-4.6-4.6-4.6-12.1 0-16.8l22.3-22.3c4.6-4.6 12.1-4.6 16.8 0l61.4 61.4 61.4-61.4c4.6-4.6 12.1-4.6 16.8 0l22.3 22.3c4.7 4.6 4.7 12.1 0 16.8z" class=""></path></svg>
    `;
}

// https://fontawesome.com/icons/cog?style=solid
function iconCog(size) {
  return `<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="cog" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-cog fa-w-16"
    style="width: ${size}px; vertical-align: middle;">
    <path fill="currentColor" d="M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z" class=""></path></svg>
    `;
}

// https://stackoverflow.com/a/6234804
// Modified (added '/') per Mozilla reviewer request.
function escapeHtml(unsafe) {
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#x27;")
       .replace(/\//g, "&#x2F;");
}
