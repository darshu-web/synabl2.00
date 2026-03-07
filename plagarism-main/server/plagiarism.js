const STOPWORDS = new Set(["a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at", "by", "from", "for", "with", "in", "on", "to", "is", "are", "was", "were", "be", "been", "being", "it", "this", "that", "these", "those"]);

export function cosineSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  const words2 = text2.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));

  if (words1.length === 0 || words2.length === 0) return 0;

  const freq1 = {};
  const freq2 = {};
  words1.forEach(w => freq1[w] = (freq1[w] || 0) + 1);
  words2.forEach(w => freq2[w] = (freq2[w] || 0) + 1);

  const allWords = [...new Set([...Object.keys(freq1), ...Object.keys(freq2)])];

  const vector1 = allWords.map(word => freq1[word] || 0);
  const vector2 = allWords.map(word => freq2[word] || 0);

  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

function shingleSimilarity(a, b, k = 4) {
  const shingle = (text) => {
    const words = text.split(" ");
    const set = new Set();
    for (let i = 0; i <= words.length - k; i++) {
      set.add(words.slice(i, i + k).join(" "));
    }
    return set;
  };
  const sA = shingle(a);
  const sB = shingle(b);
  if (sA.size === 0 || sB.size === 0) return 0;

  const intersection = [...sA].filter(x => sB.has(x)).length;
  const union = new Set([...sA, ...sB]).size;
  return intersection / union;
}

function levenshteinRatio(s, t) {
  if (!s.length) return t.length ? 0 : 1;
  if (!t.length) return 0;

  const d = [];
  for (let i = 0; i <= s.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= t.length; j++) {
    d[0][j] = j;
  }

  for (let j = 1; j <= t.length; j++) {
    for (let i = 1; i <= s.length; i++) {
      if (s[i - 1] === t[j - 1]) {
        d[i][j] = d[i - 1][j - 1];
      } else {
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + 1
        );
      }
    }
  }
  const maxLen = Math.max(s.length, t.length);
  return (maxLen - d[s.length][t.length]) / maxLen;
}

export function computeSimilarity(original, webContent) {
  const scores = [];

  const normalizedOrig = original.toLowerCase().replace(/\s+/g, " ").trim();
  const normalizedWeb = webContent.toLowerCase().replace(/\s+/g, " ").trim();

  if (normalizedWeb.includes(normalizedOrig) && normalizedOrig.length > 20) return 1.0;

  const shingleScore = shingleSimilarity(normalizedOrig, normalizedWeb, 4);
  const cosScore = cosineSimilarity(original, webContent); // uses original with stopwords filter

  if (original.split(" ").length < 15) {
    const levScore = levenshteinRatio(normalizedOrig, normalizedWeb.substring(0, 500));
    scores.push(levScore * 0.8); // slight penalty to lev score to prevent false positives
  }

  scores.push(shingleScore, cosScore);
  return Math.max(...scores);
}

export function detectDOI(text) {
  const doiRegex = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi;
  const matches = text.match(doiRegex);
  return matches ? [...new Set(matches)] : [];
}

function cleanAbstract(abstract) {
  if (!abstract) return "";
  // Strip JATS XML tags like <title>, <p>, <italic> etc.
  return abstract
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchCrossrefDOI(doi) {
  try {
    const response = await fetch(`https://api.crossref.org/works/${doi}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error(`Crossref DOI fetch error for ${doi}:`, error);
    return null;
  }
}

export async function searchWeb(query) {
  const urls = [];

  try {
    const searchQuery = encodeURIComponent(query.slice(0, 200));
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${searchQuery}`;

    const response = await fetch(ddgUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const html = await response.text();

    const resultMatches = html.match(/uddg=([^"&]+)/g) || [];
    const ddgUrls = resultMatches
      .map((match) => {
        const encoded = match.replace("uddg=", "");
        try {
          return decodeURIComponent(encoded);
        } catch {
          return null;
        }
      })
      .filter(
        (url) => url && url.startsWith("http") && !url.includes("duckduckgo.com")
      )
      .slice(0, 6);

    urls.push(...ddgUrls.filter(url => url !== null));
  } catch (error) {
    console.error("DuckDuckGo search error:", error.message || error);
  }

  try {
    // Also search CrossRef for academic papers
    const searchQuery = encodeURIComponent(query.slice(0, 150));
    const crossrefUrl = `https://api.crossref.org/works?query=${searchQuery}&rows=10`;

    const response = await fetch(crossrefUrl);
    const data = await response.json();

    if (data.message?.items) {
      for (const item of data.message.items) {
        if (item.URL) {
          urls.push({
            url: item.URL,
            title: item.title?.[0],
            doi: item.DOI,
            journal: item['container-title']?.[0],
            abstract: cleanAbstract(item.abstract),
            source: 'Crossref Search'
          });
        }
      }
    }

    // Check for direct DOIs in text
    const dois = detectDOI(query);
    for (const doi of dois) {
      const metadata = await fetchCrossrefDOI(doi);
      if (metadata && metadata.URL) {
        urls.push({
          url: metadata.URL,
          title: metadata.title?.[0],
          doi: metadata.DOI,
          journal: metadata['container-title']?.[0],
          abstract: cleanAbstract(metadata.abstract),
          source: 'Crossref DOI'
        });
      }
    }
  } catch (error) {
    console.error("CrossRef search error:", error);
  }

  // Handle unique URLs while keeping metadata
  const seen = new Set();
  const uniqueResults = [];
  for (const item of urls) {
    const url = typeof item === 'string' ? item : item.url;
    if (!seen.has(url)) {
      seen.add(url);
      uniqueResults.push(item);
    }
  }

  return uniqueResults.slice(0, 15);
}

export async function fetchPageContent(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status}`);
      return "";
    }

    const html = await response.text();

    let text = html
      .replace(/<script[^>]*>.*?<\/script>/gis, "")
      .replace(/<style[^>]*>.*?<\/style>/gis, "")
      .replace(/<nav[^>]*>.*?<\/nav>/gis, "")
      .replace(/<header[^>]*>.*?<\/header>/gis, "")
      .replace(/<footer[^>]*>.*?<\/footer>/gis, "")
      .replace(/<aside[^>]*>.*?<\/aside>/gis, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text.slice(0, 5000);
  } catch (error) {
    // Silent handling for common network/bot errors to keep logs clean
    if (error.name === 'AbortError') {
      console.log(`Fetch timeout (8s): ${url.substring(0, 60)}...`);
    } else {
      const errorMsg = error.message || error.toString();
      console.log(`Fetch error: ${url.substring(0, 60)}... (${errorMsg})`);
    }
    return "";
  }
}

export function nGramSimilarity(text1, text2, n = 3) {
  const createNGrams = (text) => {
    const rawWords = text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 0);
    const ngrams = new Set();
    for (let i = 0; i <= rawWords.length - n; i++) {
      ngrams.add(rawWords.slice(i, i + n).join(" "));
    }
    return ngrams;
  };

  const ngrams1 = createNGrams(text1);
  const ngrams2 = createNGrams(text2);

  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

  let matches = 0;
  for (const gram of ngrams1) {
    if (ngrams2.has(gram)) matches++;
  }

  // Jaccard similarity for n-grams
  return matches / (ngrams1.size + ngrams2.size - matches);
}
