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
  content = await frame.content()
  frameList.push({
    depth,
    frameUrl: frame.url(),
    content,
    tag: "FRAME"
  })
  for (let child of frame.childFrames())
    if(child) await getFrames(child, depth+1, frameList);
}

async function crawl(context, url, enableFrames) {
  if(!url) return
  let page = await context.newPage()
  let frameList = []
  let error = ""
  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    })
    await sleep(DOM_LOAD_DELAY)
    content = await page.content()
    let chain = response.request().redirectChain()
    chain = chain.map(res => res.url())
    const title = await page.title()
    const finalUrl = page.url()
    frameList.push({
      depth: 0,
      title,
      actualUrl: url,
      finalUrl,
      content,
      redirectChain: chain,
      tag: "HOME"
    })
    if(enableFrames) {
      frames = await page.frames()
      for (let frame of frames)
        await getFrames(frame, 0, frameList)
    }
  } catch (err) {
    console.log(err.message)
    error = err.message
  }
  return {
    url,
    contents: frameList,
    error
  }
}

async function queue(browser, chunks, enableFrames, outStream) {
  return new Promise((resolve, reject) => {
    async.eachOf(chunks, async.asyncify(async (chunk, index) => {
      let context = await browser.createIncognitoBrowserContext();
      for (let url of chunk) {
        console.log('Processing ', url)
        let data = await crawl(context, url, enableFrames)
        if (data) outStream.write(JSON.stringify(data) + '\n\r')
      }
      await context.close()
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

  const browser = await puppeteer.launch({headless: true})
  const urls = fs.readFileSync(inputFile).toString().split('\n');
  let outStream

  if(outputFile) outStream = fs.createWriteStream(outputFile, {flags:'a'})
  else outStream = process.stdout

  const chunkSize = Math.ceil(urls.length/tabsThreshold)
  let chunks = []
  for (let i = 0, j = urls.length; i < j; i+=chunkSize) {
    chunks.push(urls.slice(i, i+chunkSize))
  }
  await queue(browser, chunks, enableFrames, outStream)

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
