import express, { type Request, type Response } from "express";
import { infoCards } from "./db.ts";
import { authorized } from "./auth.ts";
import { imageUrl, singleImageUpload } from "./upload.ts";
import { validateCategory, validateOrderRequest, validatePublished, rejectInvalid } from "./validation.ts";
import { syncNewsArticle } from "./parsers/news.ts";
import { syncFacultyInfo } from "./parsers/faculties.ts";

const cards = express.Router();

cards.get("/", async (req: Request, res: Response) => {
  console.log("Fetching all categories");
  const categories = await infoCards.listCategories();
  res.json(categories);
});

cards.get("/:category", validateCategory, rejectInvalid, async (req: Request, res: Response) => {
  res.json(await infoCards.all({
    category: req.params.category,
    orderByDate: req.query.orderByDate === 'true',
    includeUnpublished: req.query.all === 'true',
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
  }));
});

cards.get("/:category/:id", validateCategory, rejectInvalid, async (req: Request, res: Response) => {
  console.log(`Fetching card ${req.params.id} in category ${req.params.category}`);
  const info = await infoCards.get(req.params.id, req.params.category);
  if (!info) {
      return res.status(404).json({ error: "Картку не знайдено" });
  }    
  res.json(info);
});

cards.post("/:category", validateCategory, rejectInvalid, authorized, singleImageUpload, async (req: Request, res: Response) => {
  const card = req.body;
  const category = req.params.category;
  card.id = crypto.randomUUID();
  card.category = category;
  
  console.log(`Creating new ${category} card:`, card);

  const ALLOWED_FOLDERS = new Set(['centers', 'rectorat', 'subtitles']);
  const subfolder = ALLOWED_FOLDERS.has(category) ? category : null;
  card.image = imageUrl((req.file as Express.Multer.File)?.filename, subfolder);
  const newCard = await infoCards.create(card);
  res.status(201).json(newCard);
});

cards.put("/:category/reorder", validateCategory, validateOrderRequest, rejectInvalid, async (req: Request, res: Response) => {
  const { order } = req.body;
  
  console.log(`Updating cards order for category ${req.params.category}:` + order.join(', '));
  
  const allCards = await infoCards.all({
    category: req.params.category,    
    includeUnpublished: req.query.all === 'true'    
  });

  const updatedCards = allCards.map((card) => {
    const newPosition = order.indexOf(card.id);
    
    if (newPosition !== -1) {
      card.position = newPosition;
      return infoCards.update(card);
    } else {
      return Promise.resolve(card);
    }
  });

  await Promise.all(updatedCards);

  res.status(204).send();
});

cards.put("/:category/:id", validateCategory, rejectInvalid, authorized, singleImageUpload, async (req: Request, res: Response) => {
  const card = req.body;   
  card.id = req.params.id;
  card.category = req.params.category;

  console.log('Updating info card:', card);

  const oldCard = await infoCards.get(card.id);

  if (!oldCard) {
      return res.status(404).json({ error: "Картку не знайдено" });
  }

  
  const ALLOWED_FOLDERS = new Set(['centers', 'rectorat', 'subtitles']);
  const subfolder = ALLOWED_FOLDERS.has(req.params.category) ? req.params.category : null;
  card.image = imageUrl((req.file as Express.Multer.File)?.filename, subfolder) || oldCard.image;
  
  const updateCard = await infoCards.update(card);
  res.json(updateCard);
});

cards.put("/:category/:id/published", validateCategory, validatePublished, rejectInvalid, async (req: Request, res: Response) => {
  console.log(`Changing publishing status for card ${req.params.id} to ${req.body.published}`);
  const info = await infoCards.get(req.params.id, req.params.category);

  if (!info) {
      return res.status(404).json({ error: "Картку не знайдено" });
  }

  info.published = req.body.published;
  await infoCards.update(info);

  res.json(info);
});

cards.post("/:category/:id/sync", validateCategory, rejectInvalid, async (req: Request, res: Response) => {
  console.log(`Resyncing item '${req.params.id}' in '${req.params.category}' category`);
  const info = await infoCards.get(req.params.id, req.params.category);

  if (!info) {
      return res.status(404).json({ error: "Картку не знайдено" });
  }

  if (!info.resource) {
      return res.status(400).json({ error: "Картку було додано вручну" });
  }

  let updatedInfo = info;

  switch (req.params.category) {
    case 'news': updatedInfo = await syncNewsArticle(info); break;
    case 'faculties': updatedInfo = await syncFacultyInfo(info); break;
  }

  await infoCards.update(updatedInfo)

  res.json(updatedInfo);
});

cards.delete("/:category/:id", validateCategory, rejectInvalid, authorized, async (req: Request, res: Response) => {
  const delcard = await infoCards.delete(req.params.id);
  
  console.log(`Deleted card ${req.params.id} with category ${req.params.category}`);

  res.status(204).json(delcard);
});

export default cards;