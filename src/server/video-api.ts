import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs'; 
import { videos } from './db';
import type { Video, VideoSubtitle } from './../shared/models';
import ffmpeg from 'fluent-ffmpeg';
import { videoPreviewsDir, videoUpload, videoUrl, videoPreviewUrl } from './upload';

const videoUploadDir = path.join(process.cwd(), 'data/public/uploads/videos');
const router = Router();

// Helper function to generate subtitles based on existing VTT files
function generateSubtitlesFromFiles(videoSrc: string, lang: 'uk' | 'en'): VideoSubtitle | null {  
  const videoFilename = path.parse(path.basename(videoSrc)).name;
  
  const subtitleFilename = `${videoFilename}.${lang}.vtt`;
  const subtitlePath = path.join(videoUploadDir, subtitleFilename);
  
  if (fs.existsSync(subtitlePath)) {
    return {
      language: lang,
      label: lang === 'uk' ? 'Українська' : 'English',
      src: videoUrl(subtitleFilename) ?? ''
    };
  }
  return null;
}

router.get('/videos', async (req: Request, res: Response) => {
  const allVideos = await videos.all({ includeUnpublished: req.query.all === 'true' });
  res.json(allVideos);
});

router.get('/videos/categories', async (req: Request, res: Response) => {
  const categories = await videos.listCategories();
  res.json(categories);
});

router.get('/videos/:id', async (req: Request, res: Response) => {
  const video = await videos.get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Відео не знайдено' });
  res.json(video);
});

router.get('/videos/:id/subtitles/:lang', async (req: Request, res: Response) => {
  const video = await videos.get(req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Відео не знайдено' });
  }
  const lang = req.params.lang as 'uk' | 'en';
  
  const videoFilename = path.parse(path.basename(video.src)).name;
  const subtitlePath = path.join(videoUploadDir, `${videoFilename}.${lang}.vtt`);
  
  console.log(subtitlePath);

  if (!fs.existsSync(subtitlePath)) {
    return res.status(404).json({ error: 'Субтитр не знайдено' });
  }
  
  res.sendFile(subtitlePath);
});

router.post('/videos', videoUpload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'subtitle_uk', maxCount: 1 },
  { name: 'subtitle_en', maxCount: 1 }
]), async (req: Request, res: Response) => {
  
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  if (!req.body.title || !req.body.category || !files?.video) {
    return res.status(400).json({ error: 'Обов\'язкові поля: title, category, video' });
  }

  let title = req.body.title;
  let description = req.body.description || '';

  try {
    if (typeof title === 'string' && (title.startsWith('[') || title.startsWith('{'))) {
        title = JSON.parse(title); 
    }
    if (typeof description === 'string' && (description.startsWith('[') || description.startsWith('{'))) {
        description = JSON.parse(description);
    }
  } catch (err) {
  }

  const category = req.body.category as string;
  const videoFilename = path.parse(files.video[0].filename).name; // Get filename without extension

  // Process subtitle files
  const allowedLanguages = ['uk', 'en'];
  
  for (const lang of allowedLanguages) {
    const subtitleField = `subtitle_${lang}`;
    if (files?.[subtitleField] && files[subtitleField][0]) {
      const subtitleFile = files[subtitleField][0];
      const subtitleFilename = `${videoFilename}.${lang}.vtt`;
      const subtitlePath = path.join(path.dirname(subtitleFile.path), subtitleFilename);
      
      // Rename/move the subtitle file to match the video filename
      try {
        fs.renameSync(subtitleFile.path, subtitlePath);
      } catch (error) {
        console.error(`Помилка збереження субтитрів ${lang}:`, error);
      }
    }
  }

  const video: Video = {
    id: crypto.randomUUID(),
    title: title,
    src: videoUrl(files.video[0].filename) ?? '',
    image: files?.image ? videoPreviewUrl(files.image[0].filename) : null,
    category,
    description: description,
    published: req.body.published === 'true' || req.body.published === true,
    position: 0
  };

  if (files?.video) {
    const videoPath = files.video[0].path;
    const previewFilename = `${files.video[0].filename}.jpg`;

    try {
        await new Promise ((resolve, reject) => {
          ffmpeg(videoPath)
            .screenshots ({
              timestamps: ['5'],
              filename: previewFilename,
              folder: videoPreviewsDir,
              size: '320x240'
            })
            .on('end', resolve)
            .on('error', reject);
        });
        video.image = videoPreviewUrl(previewFilename) ?? null;
    } catch (ffmpegError) {
      console.log("FFmpeg не зміг створити прев'ю відео:", ffmpegError);
    }
  } 

  await videos.create(video);
  // Return video without subtitles - fetch lazily via /videos/:id/subtitles
  res.status(201).json(video);
});

router.put('/videos/:id', videoUpload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'subtitle_uk', maxCount: 1 },
  { name: 'subtitle_en', maxCount: 1 }
]), async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const existingVideo = await videos.get(req.params.id);

  if (!existingVideo) {
    return res.status(404).json({ error: 'Відео не знайдено' });
  }

  const category = req.body.category as string;

  let title = req.body.title || existingVideo.title;
  let description = req.body.description || existingVideo.description;

  try {
    if (typeof req.body.title === 'string' && (req.body.title.startsWith('[') || req.body.title.startsWith('{'))) {
        title = JSON.parse(req.body.title);
    }
    if (typeof req.body.description === 'string' && (req.body.description.startsWith('[') || req.body.description.startsWith('{'))) {
        description = JSON.parse(req.body.description);
    }
  } catch (err) {
  }

  // Determine video filename (use existing or new)
  let videoFilename: string;
  if (files?.video && files.video[0]) {
    videoFilename = path.parse(files.video[0].filename).name;
  } else {
    // Extract filename from existing video src
    const existingSrc = existingVideo.src;
    videoFilename = path.parse(path.basename(existingSrc)).name;
  }

  // Process subtitle files
  const allowedLanguages = ['uk', 'en'];
  
  for (const lang of allowedLanguages) {
    const subtitleField = `subtitle_${lang}`;
    if (files?.[subtitleField] && files[subtitleField][0]) {
      const subtitleFile = files[subtitleField][0];
      const subtitleFilename = `${videoFilename}.${lang}.vtt`;
      const subtitlePath = path.join(path.dirname(subtitleFile.path), subtitleFilename);
      
      // Rename/move the subtitle file to match the video filename
      try {
        // Remove old subtitle file if it exists
        if (fs.existsSync(subtitlePath)) {
          fs.unlinkSync(subtitlePath);
        }
        
        fs.renameSync(subtitleFile.path, subtitlePath);
      } catch (error) {
        console.error(`Помилка збереження субтитрів ${lang}:`, error);
      }
    }
  }
  
  // Handle subtitle removal if requested
  if (req.body.removeSubtitles) {
    try {
      const languagesToRemove = typeof req.body.removeSubtitles === 'string'
        ? JSON.parse(req.body.removeSubtitles)
        : req.body.removeSubtitles;
      
      if (Array.isArray(languagesToRemove)) {
        // Remove subtitle files
        for (const lang of languagesToRemove) {
          if (allowedLanguages.includes(lang)) {
            const subtitleFilename = `${videoFilename}.${lang}.vtt`;
            const subtitlePath = path.join(videoUploadDir, subtitleFilename);
            if (fs.existsSync(subtitlePath)) {
              fs.unlinkSync(subtitlePath);
            }
          }
        }
      }
    } catch (error) {
      console.error('Помилка видалення субтитрів:', error);
    }
  }

  const updatedVideo: Video = {
    ...existingVideo,
    
    title: title,
    
    description: description,

    src: files?.video ? videoUrl(files.video[0].filename) ?? '' : existingVideo.src,
    image: req.body.removeImage === 'true' ? null : 
          files?.image ?  videoPreviewUrl(files.image[0].filename) ?? null : existingVideo.image,
    category,
    published: req.body.published === 'true' || req.body.published === true
  };

  await videos.update(updatedVideo);
  res.json(updatedVideo);

});

router.put('/videos/:id/published', async (req: Request, res: Response) => {
  try {
    const video = await videos.get(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Відео не знайдено' });
    }

    video.published = req.body.published === true || req.body.published === 'true';
    await videos.update(video);

    res.json(video);
  } catch (error) {
    console.error('Помилка оновлення статусу публікації:', error);
    res.status(500).json({ error: 'Помилка оновлення статусу публікації' });
  }
});

router.delete('/videos/:id', async (req: Request, res: Response) => {
  try {
    await videos.delete(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Помилка видалення відео:', error);
    res.status(500).json({ error: 'Помилка видалення відео' });
  }
});

export default router;