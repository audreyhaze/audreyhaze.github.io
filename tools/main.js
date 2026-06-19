let tlds = [];
const TLD_FILE_PATH = "assets/tlds-alpha-by-domain.txt";
fetch(TLD_FILE_PATH)
  .then(res => {
    if (!res.ok) throw new Error('File not found');
    return res.text();
  })
  .then(text => {
    tlds = text
      .split(/\r?\n/)
      .map(line => line.trim().toLowerCase())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => line.startsWith('.') ? line.slice(1) : line);
    tlds.sort((a, b) => b.length - a.length);
    document.getElementById('output').textContent =
      `Type a string and hit Enter.`;
  })
  .catch(err => {
    document.getElementById('output').textContent =
      `ERROR "${TLD_FILE_PATH}".`;
  });

function cleanString(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[:\/\?#\[\]@!$&'()*+,;=\s"<>\\^`{|}]/g, '');
}

function getFuzziness() {
  const slider = document.getElementById('fuzzy');
  const n = slider ? parseInt(slider.value, 10) : 1;
  return Math.max(1, Math.min(5, isNaN(n) ? 1 : n));
}

function findSplits(str) {
  const results = [];
  const lower = str.toLowerCase();
  for (const tld of tlds) {
    if (tld.length === 0 || tld.length >= lower.length) continue;
    if (lower.endsWith(tld)) {
      const base = lower.slice(0, lower.length - tld.length);
      if (base.length > 0) {
        results.push(`${base}.${tld}`);
      }
    }
  }
  return results;
}

function findFuzzySplits(str, exactMatches, fuzziness) {
  const results = [];
  const lower = str.toLowerCase();
  const exactTlds = new Set(exactMatches.map(m => m.slice(m.lastIndexOf('.') + 1)));
  const n = Math.max(1, parseInt(fuzziness, 10) || 1);

  for (const tld of tlds) {
    if (exactTlds.has(tld)) continue;

    // remove k characters (input has k extra chars after the tld)
    for (let k = 1; k <= n; k++) {
      const totalLen = tld.length + k;
      if (totalLen >= lower.length) continue;

      const suffix = lower.slice(lower.length - totalLen);
      const base = lower.slice(0, lower.length - totalLen);
      const tldPart = suffix.slice(0, tld.length);
      const extraChars = suffix.slice(tld.length);

      if (base.length > 0 && tldPart === tld) {
        results.push({ type: 'extra', base, tld, extraChars, k });
      }
    }

    // add k characters (input is missing the last k chars of the tld)
    for (let k = 1; k <= n; k++) {
      if (tld.length - k < 1) continue;
      const tldPrefix = tld.slice(0, tld.length - k);
      const missingChars = tld.slice(tld.length - k);

      if (tldPrefix.length < lower.length) {
        const base = lower.slice(0, lower.length - tldPrefix.length);
        const suffix = lower.slice(lower.length - tldPrefix.length);

        if (base.length > 0 && suffix === tldPrefix) {
          results.push({ type: 'missing', base, tldPrefix, missingChars, k });
        }
      }
    }
  }

  // reorder: smallest edit distance first, then 'extra' before 'missing'
  results.sort((a, b) => {
    if (a.k !== b.k) return a.k - b.k;
    if (a.type === b.type) return 0;
    return a.type === 'extra' ? -1 : 1;
  });

  return results;
}

function run() {
  const raw = document.getElementById('inputString').value;
  const output = document.getElementById('output');
  const outputMatch = document.getElementById('outputmatch');

  if (tlds.length === 0) {
    output.textContent = 'Please load a TLD .txt file first.';
    if (outputMatch) outputMatch.textContent = '';
    return;
  }

  const cleaned = cleanString(raw);
  if (!cleaned) {
    output.textContent = 'Please enter a valid string.';
    if (outputMatch) outputMatch.textContent = '';
    return;
  }

  const matches = findSplits(cleaned);

  if (matches.length === 0) {
    output.textContent = `No TLD matches found for "${cleaned}".`;
  } else {
    output.innerHTML = matches
      .map(m => {
        const dot = m.lastIndexOf('.');
        const base = m.slice(0, dot + 1);
        const tld = m.slice(dot + 1);
        return `${base}<span class="tld">${tld}</span>`;
      })
      .join('\n');
  }

  if (outputMatch) {
    const fuzziness = getFuzziness();
    const fuzzyMatches = findFuzzySplits(cleaned, matches, fuzziness);
    if (fuzzyMatches.length === 0) {
      outputMatch.textContent = `No close (up to ${fuzziness}-character) TLD matches found.`;
    } else {
      outputMatch.innerHTML = fuzzyMatches
        .map(m => {
          if (m.type === 'missing') {
            return `${m.base}.<span class="tld">${m.tldPrefix}<span class="extrachar">${m.missingChars}</span></span>`;
          } else {
            return `${m.base}.<span class="tld">${m.tld}</span><span class="minuschar">${m.extraChars}</span>`;
          }
        })
        .join('\n');
    }
  }
}

function showOutputMatch() {
  document.getElementById('toggleBtn').classList.remove('hide');
}

document.getElementById('goBtn').addEventListener('click', function () {
  run();
  showOutputMatch();
});

document.getElementById('inputString').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    run();
    showOutputMatch();
  }
});

document.getElementById('toggleBtn').addEventListener('click', function () {
  const wrapper = document.getElementById('outputMatchWrapper');
  const btn = document.getElementById('toggleBtn');

  wrapper.classList.toggle('collapse');
  btn.textContent = wrapper.classList.contains('collapse') ? '>' : 'v';
});

function updateFuzzyCount() {
  const slider = document.getElementById('fuzzy');
  const countEl = document.getElementById('fuzzycount');
  if (slider && countEl) {
    const val = parseInt(slider.value, 10) || 1;
    const count = (val);
    countEl.textContent = count;
  }
}

const fuzzySlider = document.getElementById('fuzzy');
if (fuzzySlider) {
  fuzzySlider.addEventListener('input', function () {
    updateFuzzyCount();
    const inputEl = document.getElementById('inputString');
    if (inputEl && inputEl.value.trim().length > 0) {
      run();
    }
  });
}

// initialize on page load
updateFuzzyCount();
