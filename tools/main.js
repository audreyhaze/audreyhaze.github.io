let tlds = [];
const TLD_FILE_PATH = "tlds-alpha-by-domain.txt";
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

function findFuzzySplits(str, exactMatches) {
  const results = [];
  const lower = str.toLowerCase();
  const exactTlds = new Set(exactMatches.map(m => m.slice(m.lastIndexOf('.') + 1)));

  for (const tld of tlds) {
    if (exactTlds.has(tld)) continue;

    // remove a character
    if (tld.length + 1 < lower.length) {
      const suffix = lower.slice(lower.length - (tld.length + 1));
      const base = lower.slice(0, lower.length - (tld.length + 1));
      const extraChar = suffix.slice(tld.length);

      if (base.length > 0 && suffix.slice(0, tld.length) === tld) {
        results.push({ type: 'extra', base, tld, extraChar });
      }
    }

    // add extra character
    if (tld.length >= 2) {
      const tldPrefix = tld.slice(0, -1);
      const missingChar = tld.slice(-1);

      if (tldPrefix.length < lower.length) {
        const base = lower.slice(0, lower.length - tldPrefix.length);
        const suffix = lower.slice(lower.length - tldPrefix.length);

        if (base.length > 0 && suffix === tldPrefix) {
          results.push({ type: 'missing', base, tldPrefix, missingChar });
        }
      }
    }
  }

  //reorder
  results.sort((a, b) => {
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
    const fuzzyMatches = findFuzzySplits(cleaned, matches);
    if (fuzzyMatches.length === 0) {
      outputMatch.textContent = 'No close (1-character) TLD matches found.';
    } else {
      outputMatch.innerHTML = fuzzyMatches
        .map(m => {
          if (m.type === 'missing') {
            return `${m.base}.<span class="tld">${m.tldPrefix}<span class="extrachar">${m.missingChar}</span></span>`;
          } else {
            return `${m.base}.<span class="tld">${m.tld}</span><span class="minuschar">${m.extraChar}</span>`;
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
