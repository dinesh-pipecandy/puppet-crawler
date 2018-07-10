# Puppeteer crawler

## Usage
`node index.js -i input.txt -o output.jl -f false -t 5`

## Arguments
 * -i, --input - File containing list of URLs to crawl
 * -o, --output - Output file
 * -f, --enableframes - Get all frames in page
 * -t, --tabs - Threshold for concurrent open tabs
 * -l, --loadTime - DOM load time in milliseconds
 
## Install node
```bash
sudo apt-get install make
curl -L https://git.io/n-install | bash
```

## Install dependencies
```bash
sudo apt-get update
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

## Output json-line
```json
{
  "url": "<seed-url>",
  "contents": [
    {
      "depth": 0,
      "title": "<page-title>",
      "actualUrl": "<crawled-url>",
      "finalUrl": "<final-redirected-url>",
      "content": "<raw-html>",
      "redirectChain": ["<redirected-chain-of-urls>"],
      "tag": "HOME"
    },
    {
      "depth": "<depth-of-frame>",
      "frameUrl": "<frame-url>",
      "content": "<frame-contents-raw-html>",
      "tag": "FRAME"
    }
  ],
  "error": "<error-contents>"
}
```