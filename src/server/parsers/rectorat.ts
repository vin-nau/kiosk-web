import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { URL } from "url";
import crypto from 'crypto';
import { infoCards } from "../db"; 
import type { InfoCard } from "../../shared/models";
import config from "../config";
import { downloadedAsset } from "../upload";


const BASE_URL = config.rectoratBaseUrl;
const TARGET_CATEGORY = "rectorat_members"; 
const NBSP = '\u00A0'; 
const DEFAULT_IMAGE = "/img/default_avatar.jpg"


type RectoratCard = {
  id: string;
  title: string;
  position: string;
  phone: string;
  image: string | null;
};


async function parseRectoratePage(): Promise<RectoratCard[]> {
  const response = await fetch(BASE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`Status: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const cards: RectoratCard[] = [];
  
  $("div.row.mb-2.py-2").each((_, el) => {
    const name = $(el).find("p.h5.font-weight-bold").text().trim();
    const allTexts = $(el).find("div.col p").toArray().map(p => $(p).text().trim()).filter(Boolean);

    let position = allTexts.find(text => text !== name && !text.toLowerCase().includes("тел")) || "";
    
    position = position.replace(/^[\(\)]+|[\(\)]+$/g, "").trim();

    const phoneRaw = allTexts.find(text => text.toLowerCase().startsWith("тел")) || "";
    
    let phone = phoneRaw.replace(/^(тел\.|тел|tel\.|tel|факс)\s*:?\s*/gi, "").trim();
    
    phone = phone.split(' ').join(NBSP).split('-').join(`-${NBSP}`); 

    const imageSrc = $(el).find("img.img-fluid").attr("src");
    let image: string | null = null;
    if (imageSrc) {
        image = new URL(imageSrc, BASE_URL).href;
        if (image.includes('/pro-universitet/assets')) {
            image = image.replace('/pro-universitet/assets', '/assets');
        }
    }

    const id = crypto.createHash("sha1").update(name || "unknown").digest("hex");

    if (name) {
      cards.push({ id: `rectorat_${id}`, title: name, position, phone, image });
    }
  });

  return cards;
}

export async function syncRectoratData() {
  try {
    const parsedCards = await parseRectoratePage();
    let updatedCount = 0;

    for (const [index, card] of parsedCards.entries()) {
      
      const cleanTitle = card.title;
      let subtitleContent = card.position;
      
      if (card.phone) {
        subtitleContent += ` | 📞${NBSP}${card.phone}`;
      }

      const existing = await infoCards.get(card.id);

      // if the card already exists and matches a fetched one skip it
      if (existing && 
        existing.resource === card.image &&
        existing.title_ua === cleanTitle &&
        existing.subtitle_ua === subtitleContent
      ) continue;

      const memberCard: InfoCard = {
        id: card.id,
        title_ua: cleanTitle, 
        title_en: "",
        subtitle_ua: subtitleContent,
        subtitle_en: "",
        content_ua: "", 
        content_en: "",
        image: card.image ? await downloadedAsset(card.image, "rectorat") : DEFAULT_IMAGE,
        category: TARGET_CATEGORY,
        subcategory: null,
        resource: card.image ?? undefined,
        position: index, 
        published: true
      };

      updatedCount++;

      if (existing) {
        await infoCards.update({
          ...existing,
          ...memberCard, 
          title_en: existing.title_en || "",
          subtitle_en: existing.subtitle_en || "",
          content_en: existing.content_en || "",
          published: existing.published });
      } else {
        await infoCards.create(memberCard);
      }
    }

    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} rectorate cards.`);
    }
  } catch (error) {
    console.error(" Помилка:", error);
    return 0;
  }
}