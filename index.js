const puppeteer = require('puppeteer');
const fs = require('fs')
const async = require('async')
const argv = require('minimist')(process.argv.slice(2), {
  string: ['input', 'output'],
  boolean: ['enableFrames'],
  alias: {
    i: 'input',
    o: 'output',
    f: 'enableFrames',
    t: 'tabs',
    l: 'loadTime'
  }
});

const {loadTime: DOM_LOAD_DELAY = 4000} = argv

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getFrames(frame, depth=0, frameList) {
  if(!frame) return
  contents = await frame.content()
  frameList.push({
    depth,
    url: frame.url(),
    content: contents
  })
  for (let child of frame.childFrames())
    if(child) await getFrames(child, depth+1, frameList);
}

async function crawl(page, url, enableFrames) {
  if(!url) return
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  })
  await sleep(DOM_LOAD_DELAY)
  contents = await page.content()
  frameList = []
  frameList.push({
    depth: 0,
    url,
    content: contents
  })
  if(enableFrames) {
    frames = await page.frames()
    for (let frame of frames)
      await getFrames(frame, 0, frameList)
  }
  return {
    url,
    contents: frameList
  }
}

async function queue(pages, chunks, enableFrames, outStream) {
  return new Promise((resolve, reject) => {
    async.eachOf(chunks, async.asyncify(async (chunk, index) => {
      const page = pages[index]
      for (let url of chunk) {
        console.log('Processing ', url)
        let data = await crawl(page, url, enableFrames)
        if (data) outStream.write(JSON.stringify(data) + '\n\r')
      }
      return new Promise((resolve, reject) => resolve())
    }), (err, result) => {
      if(err) return reject(err)
      return resolve(result)
    })
  })
}

(async () => {
  console.time('elapsed')
  console.log('Puppet process started at', new Date().toLocaleString())
  if(process.argv.length <= 2) {
    console.log('Insufficient arguments')
    console.log('use: node index.js --input input.txt --output output.jl --enableframes true --tabs 2')
    process.exit(1)
  }

  const {
    input: inputFile,
    output: outputFile,
    enableFrames = false,
    tabs: tabsThreshold = 1,
  } = argv

  const browser = await puppeteer.launch()
  const urls = fs.readFileSync(inputFile).toString().split('\n');
  let outStream

  if(outputFile) outStream = fs.createWriteStream(outputFile, {flags:'a'})
  else outStream = process.stdout
  let pages = []
  for (let i = 0; i< tabsThreshold; i++) {
    pages.push(await browser.newPage())
  }
  const chunkSize = Math.ceil(urls.length/tabsThreshold)
  let chunks = []
  for (let i = 0, j = urls.length; i < j; i+=chunkSize) {
    chunks.push(urls.slice(i, i+chunkSize))
  }
  await queue(pages, chunks, enableFrames, outStream)
  if(outStream.end) outStream.end()
  await browser.close()
  console.timeEnd('elapsed')
  console.log('Puppet process ended at', new Date().toLocaleString())
})()

const handleError = (err) => {
  console.error('Exception @', new Date())
  console.log(err)
  process.exit(1)
}

process.on('uncaughtException', handleError)
process.on('unhandledRejection', handleError)
