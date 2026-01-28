import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { URL } from "url";
import type { InfoCard } from "../../shared/models";
import { infoCards } from "../db";
import config from "../config";
import crypto from 'crypto';

const BASE_URL = config.newsBaseUrl;

async function loadArticleContents(link: string): Promise<string> {
  const detailsResponse = await fetch(link, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!detailsResponse.ok) {
    throw new Error(`Не вдалося завантажити деталі для ${link}: ${detailsResponse.status}`);
  }

  const detailsHtml = await detailsResponse.text();
  const $$ = cheerio.load(detailsHtml);

  const article = $$("div.content p:not(.d-none)");

  const content = article.text().trim();

  return content;
}

async function parseCurrentNewsPage(targetUrl: string): Promise<InfoCard[]> {
  try {
    const response = await fetch(targetUrl, { headers: { "User-Agent": "Mozilla/5.0" }});

    if (!response.ok) {
      throw new Error(`Не вдалося завантажити список новин: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const newsContainers = $("div.node.clearfix");
    const elements = newsContainers.toArray();

    return await Promise.all(
      elements
      .filter(el => $(el).find("a[href]").first().length > 0)
      .map(async (el) => {
        const titleLinkElement = $(el).find("a[href]").first();
        const imageElement = $(el).find("img.logo").first();

        const relLink = titleLinkElement.attr("href");
        const link = new URL(relLink || "", BASE_URL).href;
        
        const image = imageElement.length
          ? new URL(imageElement.attr("src") || "", BASE_URL).href
          : null;

        const dateTextWithViews = $(el).find("p.my-2").text();
        const date = /(\d{2}\.\d{2}\.\d{4})/.exec(dateTextWithViews)?.[0];

        const content = await loadArticleContents(link);

        var shasum = crypto.createHash('sha1');
        shasum.update(link);
        const id = shasum.digest('hex');

        return ({
          id: `news_${id}`,
          title: titleLinkElement.text().trim(),
          resource: link,
          content,
          image,
          category: "news",
          position: 0,
          published: true,
          date: date ? new Date(date) : new Date(),
        }) as InfoCard;
    }));

  } catch (error) {
    console.error(`Під час парсингу новин сталася помилка:`, error);
    return [];
  }
}

export async function syncNewsArticle(info: InfoCard): Promise<InfoCard> {
  if (!info.resource) throw new Error("Resource link is missing for the news article.");
  const content = await loadArticleContents(info.resource);    
  
  return {...info, content };
}

// Load news from the public site and save to the database
// If the article already exists, it will be skipped
export async function updateNews(): Promise<void> {
  const pages = [1, 2, 3, 4];

  const urls = pages.map(page => {
    try {
      const urlObj = new URL(BASE_URL);
      urlObj.searchParams.set('page', page.toString());
      return urlObj.toString()
    } catch (e) {
        return `${BASE_URL}?page=${page}`
    }
  })

  const result = await Promise.all(
    urls.map(url => parseCurrentNewsPage(url))
  )

  const articles = result.flat();

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    
    article.position = i; 

    try {
      const existing = await infoCards.get(article.id);

      if (existing && 
          existing.title === article.title &&
          existing.content === article.content &&
          existing.image === article.image &&
          existing.position === article.position 
      ) {
        continue;
      }

      if (existing) {
        await infoCards.update({
            ...existing, 
            ...article,
            position: i, 
            published: existing.published 
        });
      } else {
         await infoCards.create(article);
         console.log(`Додано: ${article.title} (pos: ${i})`);
      }
    } catch(err) { 
      console.error(`Помилка при оновленні новин:`, err);
    };
  }
}