import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import fs from "fs";
import path from "path"
import type { InfoCard, Video } from "../shared/models";
import {initialCards} from "./initial-card.ts"

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null; 

const serialize = (data: any): string | null => {
    if (data === null || data === undefined) return null;
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
};

const deserialize = (data: string | null): any => {
    if (!data) return null;
    try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
        return data;
    } catch (err) {
        return data;
    }
};

const mapRowToCard = (row: any): InfoCard => {
    return {
        ...row,
        title: deserialize(row.title),
        subtitle: deserialize(row.subtitle),
        content: deserialize(row.content),
        published: Boolean(row.published)
    };
};

const mapRowToVideo = (row: any): Video => {
    return {
        ...row,
        title: deserialize(row.title),
        description: deserialize(row.description),
        published: Boolean(row.published)
    };
};

async function initDb() {
  const dbDir = "./data";
  const dbPath = path.join(dbDir, "app.db");

  
  if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
  }

  const newDB = !fs.existsSync(dbPath);
  
  const db = await open ({
      filename: dbPath,
      driver: sqlite3.Database,
  });

  dbInstance = db;

  if (newDB) {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS info_cards (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            subtitle TEXT,
            content TEXT,
            image TEXT,
            category TEXT NOT NULL,
            subcategory TEXT,
            resource TEXT,
            position INTEGER,
            published BOOLEAN DEFAULT TRUE,
            date DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

      await db.exec(`
        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          src TEXT NOT NULL,
          image TEXT,
          category TEXT NOT NULL,
          description TEXT,
          published BOOLEAN DEFAULT TRUE,
          position INTEGER,
          date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `); 

      await infoCards.createList(initialCards);
  }

  return db;
}

function getDbInstance(): Database<sqlite3.Database, sqlite3.Statement>{
    if (!dbInstance) {
        throw new Error("База даних не ініціалізована");
    }
    return dbInstance;
}

export type QueryParams = {
  limit?: number, 
  category?: string, 
  orderByDate?: boolean
  includeUnpublished?: boolean
}

const infoCards = {
  async all({ category, orderByDate, limit, includeUnpublished }: QueryParams): Promise<InfoCard[]>{
    const db = getDbInstance();
    const select = "SELECT * FROM info_cards";
    const where = category ? ' WHERE category = ?' : '';
    const unpublishedClause = includeUnpublished ? '' : category ? ' AND published = TRUE' : ' WHERE published = TRUE';

    const orderClause = orderByDate ? ' ORDER BY date DESC' : ' ORDER BY position ASC';
    const limitClause = limit ? ' LIMIT ?' : '';

    const params = [category, limit].filter(Boolean);

    const rows = await db.all(select + where + unpublishedClause + orderClause + limitClause, params);
    return rows.map(mapRowToCard);
  },

  async listCategories(): Promise<string[]> {
    const db = getDbInstance();
    const rows = await db.all(`SELECT DISTINCT category FROM info_cards ORDER BY category ASC`);
    return rows.map(row => row.category);
  },

  async get(id: String, category?: string): Promise<InfoCard | null> {
    const db = getDbInstance();
    let row;
    if (category) {
      row = await db.get(`SELECT * FROM info_cards WHERE id = ? AND category = ?`, [id, category]);
    } else {
      row = await db.get(`SELECT * FROM info_cards WHERE id = ?`, [id]); 
    }
    return row ? mapRowToCard(row) : null; 
  },

  async createList(cards: InfoCard[]) {
      for (const card of cards) {
          await this.create(card);
      }  
  },

  async create(card: InfoCard): Promise<InfoCard> {
      const db = getDbInstance();
      await db.run (`INSERT INTO info_cards (id, title, subtitle, content, image, category, subcategory, resource, position, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [card.id, serialize(card.title), serialize(card.subtitle), serialize(card.content), card.image, card.category, card.subcategory, card.resource, card.position, card.published]);
      return card;
  },

  async update(card: InfoCard) {
      const db = getDbInstance();
      await db.run(
          `UPDATE info_cards SET title = ?, subtitle = ?, content = ?, image = ?, category = ?, subcategory = ?, resource = ?, position = ?, published = ? WHERE id = ?`,
          [ serialize(card.title), serialize(card.subtitle), serialize(card.content), card.image, card.category, card.subcategory, card.resource, card.position, card.published, card.id ]
      );
      return card;
  },

  async delete(id: string): Promise<void> {
      const db = getDbInstance();
      
      const existingCard = await db.get(`SELECT id FROM info_cards WHERE id = ?`, [id]);
      if (!existingCard) {
          throw new Error(`Картку з ID '${id}' не знайдено`);
      }
      
      await db.run(`DELETE FROM info_cards WHERE id = ?`, [id]);
  }
}

const videos = {
  async all({ includeUnpublished }: { includeUnpublished?: boolean }): Promise<Video[]> {
    const db = getDbInstance();
    const select = "SELECT * FROM videos";
    const where = includeUnpublished ? '' : ' WHERE published = TRUE';
    const order = " ORDER BY position DESC";
    const rows = await db.all(select + where + order);    
  
    return rows.map(mapRowToVideo);
  },

  async listCategories(): Promise<string[]> {
    const db = getDbInstance();
    return await db.all("SELECT DISTINCT(category) FROM videos ORDER BY category");
  },

  async get(id: string): Promise<Video | null> {
    const db = getDbInstance();
    const row = await db.get("SELECT * FROM videos WHERE id = ?", [id]);

    return row ? mapRowToVideo(row): null;
  },

  async create(video: Video): Promise<Video> {
    const db = getDbInstance();
    await db.run(
      `INSERT INTO videos (id, title, src, image, category, description, position, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [video.id, serialize(video.title), video.src, video.image, video.category, serialize(video.description), video.position, video.published]
    );
    return video;
  },

  async update(video: Video): Promise<Video> {
    const db = getDbInstance();
    await db.run(
      `UPDATE videos 
      SET title = ?, src = ?, image = ?, category = ?, description = ?, published = ?, position = ?
      WHERE id = ?`,
      [serialize(video.title), video.src, video.image, video.category, serialize(video.description), video.published, video.position, video.id]
    );
    return video;
  },

  async delete(id: string): Promise<void> {
    const db = getDbInstance();
    await db.run("DELETE FROM videos WHERE id = ?", [id]);
  }
};

export { initDb, infoCards, videos };