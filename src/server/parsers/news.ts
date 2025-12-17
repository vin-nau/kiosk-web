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

async function parseCurrentNewsPage(): Promise<InfoCard[]> {
  try {
    const response = await fetch(BASE_URL, { headers: { "User-Agent": "Mozilla/5.0" }});

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
          title_ua: titleLinkElement.text().trim(),
          title_en: "",
          subtitle_ua: "",
          subtitle_en: "",
          resource: link,
          content_ua: content,
          content_en: "",
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
  const content_ua = await loadArticleContents(info.resource);    
  
  return {...info, content_ua };
}

// Load news from the public site and save to the database
// If the article already exists, it will be skipped
export async function updateNews(): Promise<void> {
  const articles = await parseCurrentNewsPage();

  Promise.all(articles.map(async (article) => {
    const existing = await infoCards.get(article.id);

    if (!existing) {      
      await infoCards.create(article);
      console.log(`Додано новину: ${article.title_ua}`);
    }
  })).catch((err) => {
    console.error(`Помилка при оновленні новин:`, err);
  });
}