import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { infoCards } from "../db";
import type { InfoCard } from "../../shared/models";

type FacultyInfo = {
  title: string,
  content: string
};

async function parseFacultyInfo(url: string): Promise<FacultyInfo> {

  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) {
    throw new Error(`Не вдалося завантажити сторінку факультету: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  let title = $("h1").first().text().trim();
  title = title.replace('Факультет ', '');
  title = title.replace('інформаційних технологій', 'ІТ');
  title = title.charAt(0).toUpperCase() + title.slice(1);

  const selectors = [
    "div.col-lg-8.mb-3",
    "div.col.pt-3.content"
  ];

  let combinedHtml = "";

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      $(el).find("img").each((_, img) => {
        const src = $(img).attr("src") || $(img).attr("data-src");
        if (src) {
          if (src.startsWith("http://") || src.startsWith("https://")) {
            $(img).attr("src", src);
          } else if (src.startsWith("//")) {
            $(img).attr("src", `https:${src}`);
          } else if (src.startsWith("/")) {
            const baseUrl = new URL(url);
            $(img).attr("src", `${baseUrl.origin}${src}`);
          } else {
            const baseUrl = new URL(url);
            $(img).attr("src", `${baseUrl.origin}/${src}`);
          }
        }
      });

      const blockHtml = $(el).html();
      if (blockHtml) combinedHtml += blockHtml + "\n\n";
    });
  }

  combinedHtml = combinedHtml.trim();

  if (!combinedHtml) {
    console.warn(`[ПОПЕРЕДЖЕННЯ]: Не знайдено контент у ${url}`);
    combinedHtml = $("body").html() || "";
  }

  return { title, content: combinedHtml } as FacultyInfo;
}

export async function syncFacultyInfo(faculty: InfoCard): Promise<InfoCard> {
  const {title, content } = await parseFacultyInfo(faculty.resource!);
  return {...faculty, title, content};
}

export async function loadAllFaculties(): Promise<void> {
  const facultyCards = await infoCards.all({ category: "faculties", includeUnpublished: true});

  const allLoaded = facultyCards
    .filter(faculty => faculty.resource)
    .map(async (faculty) => {
      try {
        const info = await parseFacultyInfo(faculty.resource!);

        if (faculty.title != info.title) {
          console.log(`Оновлення інформації про факультет ${faculty.title}`);
          const updatedFaculty = {
            ...faculty,
            title: info.title,
            content: info.content
          };

          return await infoCards.update(updatedFaculty);
        }
      } catch (error) {
        console.warn(`Помилка при парсингу інформації про ${faculty.title}:`, error);
        return null;
      }
    })

  await Promise.all(allLoaded);
}