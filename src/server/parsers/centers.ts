import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { URL } from "url";
import crypto from 'crypto';
import { infoCards } from "../db";
import type { InfoCard } from "../../shared/models";
import config from "../config";
import { downloadedAsset } from "../upload";


const BASE_URL = config.centersBaseUrl;
const TARGET_CATEGORY = "centers";
const DEFAULT_IMAGE = "/img/default_avatar.jpg"

type CenterCard = {
  id: string;
  title: string;
  content: string;
  image: string | null;
};

async function parseCentersPage(): Promise<CenterCard[]> {
  const response = await fetch(BASE_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`Status: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const cards: CenterCard[] = [];

  $(".card-outline").each((_, el) => {
    const btnText = $(el).find("button").text().trim();
    if (!btnText) return;

    const title = btnText;
    const contentContainer = $(el).find(".card-body");
    
    contentContainer.find("img").each((_, img) => {
      const src = $(img).attr("src") || $(img).attr("data-src");
      if (src && !src.startsWith("http")) {
        try {
          const cleanPath = src.startsWith("/") ? src : `/${src}`;
          const baseOrigin = new URL(BASE_URL).origin;
          $(img).attr("src", `${baseOrigin}${cleanPath}`);
        } catch (e) {}
      }
      $(img).addClass("img-fluid").css("max-width", "100%").css("height", "auto");
    });

    const contentHtml = contentContainer.html()?.trim() || "";
    
    const imageSrc = contentContainer.find("img").attr("src");
    let image: string | null = null;
    if (imageSrc) {
      try {
        image = imageSrc.startsWith("http") ? imageSrc : new URL(imageSrc, BASE_URL).href;
      } catch (e) {
        image = null;
      }
    }

    const id = crypto.createHash("sha1").update(title || "unknown").digest("hex");

    if (title) {
      cards.push({ id: `centers_${id}`, title, content: contentHtml, image });
    }
  });

  return cards;
}

export async function syncCentersData() {
  try {
    const parsedCards = await parseCentersPage();
    let updatedCount = 0;

    for (const [index, card] of parsedCards.entries()) {
      const cleanTitle = card.title;
      const finalContent = card.content || "no info";

      const existing = await infoCards.get(card.id);

      const isAdminUploadedImage = !!existing && (
        (!!existing.resource && existing.resource.startsWith('/uploads')) ||
        (!!existing.image && existing.image.startsWith('/uploads'))
      );

      if (existing && existing.title_ua === cleanTitle) continue;

      let imageValue: string | null;
      let resourceValue: string | undefined;

      if (isAdminUploadedImage) {
        imageValue = existing!.image ?? DEFAULT_IMAGE;
        resourceValue = existing!.resource;
      } else {
        imageValue = DEFAULT_IMAGE;
        resourceValue = undefined;
      }

      const centerCard: InfoCard = {
        id: card.id,
        title_ua: cleanTitle,
        title_en: "",
        subtitle_ua: "",
        subtitle_en: "",
        content_ua: finalContent,
        content_en: "",
        image: imageValue,
        category: TARGET_CATEGORY,
        subcategory: null,
        resource: resourceValue,
        position: index,
        published: true
      };

      updatedCount++;

      if (existing) {
        await infoCards.update({
        ...existing, 
        ...centerCard,
        title_en: existing.title_en || "",
        subtitle_en: existing.subtitle_en || "",
        content_en: existing.content_en || "", 
        published: existing.published });
      } else {
        await infoCards.create(centerCard);
      }
    }

    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} centers cards.`);
    }
  } catch (error) {
    console.error("Помилка:", error);
    return 0;
  }
}

export async function loadAllCenters() {
  return await syncCentersData();
}