export function formatTimeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  
  if (seconds < 60) {
    return "just now";
  }
  
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days}d ago`;
  }

  const months = Math.floor(days / 30);

  if (months < 12) {
    return `${months}mo ago`;
  }

  const years = Math.floor(months / 12);

  return `${years}y ago`;
}

export const sanitizeUrl = (url) => {
  let sanitizedUrl = url.replace(/^https?:\/\//, "");

  const basePath = "file:///Users/baris/Projects/the-simplest-bitcoin-book/";

  if (sanitizedUrl.startsWith(basePath)) {
    const relativePath = sanitizedUrl.slice(basePath.length);

    sanitizedUrl = `https://dhalsim.github.io/the-simplest-bitcoin-book/${relativePath}`;
  }

  console.log("sanitizedUrl", sanitizedUrl);

  return sanitizedUrl;
};

export const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);

  return true;
};
