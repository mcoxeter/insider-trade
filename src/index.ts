#!/usr/bin/env node
import { Page, webkit } from 'playwright';
import fs from 'fs';
const config = require('./config.json');

async function app() {
  const browser = await webkit.launch({
    headless: true
  });

  const results = new Map<string, IDataGram>();
  const page = await browser.newPage();

  let pageResults: Map<string, IDataGram>;

  let i = 1;

  do {
    pageResults = await evaluatePage(page, i);
    pageResults.forEach((v, k) => results.set(k, v));
    console.log('processed page ' + i, pageResults.size);
    i++;
  } while (pageResults.size > 1);

  const resultsAsArray = Array.from(results.values()).sort((a, b) =>
    a.symbol.localeCompare(b.symbol)
  );

  try {
    fs.writeFileSync(
      `./results.json`,
      JSON.stringify(resultsAsArray, undefined, 4)
    );
  } catch (err) {
    console.error(err);
  }

  await browser.close();
}

interface IDataGram {
  symbol: string;
  filingDate: string;
  transactionDate: string;

  relationship: string;
}

async function evaluatePage(
  page: Page,
  pageIndex: number
): Promise<Map<string, IDataGram>> {
  const result = new Map<string, IDataGram>();
  const url = `https://www.dataroma.com/m/ins/ins.php?t=h&po=1&tp=1&am=0&sym=&o=fd&d=d&L=${pageIndex}`;

  await goto(page, url, 4);

  const table = await page.$('#grid');

  if (table) {
    const rows = await table.$$('tr');
    if (rows) {
      for (let row of rows) {
        if (row) {
          const filingDate = (
            (await (await row.$('.f_date'))?.innerText()) ?? ''
          ).replace('\n', '');
          const symbol = (
            (await (await row.$('.iss_sym'))?.innerText()) ?? ''
          ).replace('\n', '');
          const transactionDate = (
            (await (await row.$('.f_date'))?.innerText()) ?? ''
          ).replace('\n', '');
          const relationship = (
            (await (await row.$('.rel'))?.innerText()) ?? ''
          ).replace('\n', '');
          const dataGram: IDataGram = {
            symbol,
            filingDate,
            transactionDate,
            relationship
          };
          result.set(symbol, dataGram);
        }
      }
    }
  }
  return result;
}

async function goto(page: Page, url: string, retry: number) {
  for (let i = 0; i < retry; i++) {
    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle', { timeout: 0 });
      return;
    } catch {}
  }
}

app();
