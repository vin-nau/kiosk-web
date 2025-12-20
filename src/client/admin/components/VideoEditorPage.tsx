import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLoaderData } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';
import './VideoEditorPage.css';
import type { Video, LocalizedString } from '../../../shared/models';
import config from '../../lib/config';
import { videoCategoriesLoader } from '../lib/loaders';

type PreviewFile = {
  preview: string;
}

const initValue = (val: LocalizedString | undefined, lang: 'ua' | 'en'): string => {
  if (!val) return "";
  if (typeof val === 'string') {
    return lang === 'ua' ? val : "";
  }
  return (lang === 'en' ? val.en : val.ua) || "";
}

export function VideoEditorPage() {
  const { id } = useParams<{ id: string }>();
  const loadedVideo = useLoaderData<Video>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState(initValue(loadedVideo?.title, 'ua'));
  const [titleEn, setTitleEn] = useState(initValue(loadedVideo?.title, 'en'));
  const [description, setDescription] = useState(initValue(loadedVideo?.description, 'ua'));
  const [descriptionEn, setDescriptionEn] = useState(initValue(loadedVideo?.description, 'en'));
  
  const [category, setCategory] = useState(loadedVideo?.category || '');
  const [published, setPublished] = useState(loadedVideo?.published || false);
  const [src] = useState(loadedVideo?.src || '');
  const [image, setImage] = useState(loadedVideo?.image || null);

  const [videoFile, setVideoFile] = useState<File & PreviewFile | null>(null);
  const [imageFile, setImageFile] = useState<File & PreviewFile | null>(null);
  const [subtitleUkFile, setSubtitleUkFile] = useState<File | null>(null);
  const [subtitleEnFile, setSubtitleEnFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableSubtitles, setAvailableSubtitles] = useState<{ uk: boolean; en: boolean }>({ uk: false, en: false });

  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps
  } = useDropzone({
    multiple: false,
    accept: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov'] },
    onDrop: (files) => { 
      if (files[0]) {
        setVideoFile(Object.assign(files[0], { preview: URL.createObjectURL(files[0]) }));
      }
    }
  });

  const {
    getRootProps: getImageRootProps,
    getInputProps: getImageInputProps
  } = useDropzone({
    multiple: false,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
    onDrop: (files) => { 
      if (files[0]) {
        setImageFile(Object.assign(files[0], { preview: URL.createObjectURL(files[0]) }));
      }
    }
  });

  const {
    getRootProps: getSubtitleUkRootProps,
    getInputProps: getSubtitleUkInputProps
  } = useDropzone({
    multiple: false,
    accept: { 'text/vtt': ['.vtt'] },
    onDrop: (files) => { 
      if (files[0]) {
        setSubtitleUkFile(files[0]);
      }
    }
  });

  const {
    getRootProps: getSubtitleEnRootProps,
    getInputProps: getSubtitleEnInputProps
  } = useDropzone({
    multiple: false,
    accept: { 'text/vtt': ['.vtt'] },
    onDrop: (files) => { 
      if (files[0]) {
        setSubtitleEnFile(files[0]);
      }
    }
  });

  useEffect(() => {
    return () => {
      if (imageFile?.preview) {
        URL.revokeObjectURL(imageFile.preview);
      }
      if (videoFile?.preview) {
        URL.revokeObjectURL(videoFile.preview);
      }
    };
  }, [imageFile, videoFile]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categories = await videoCategoriesLoader();
        setAvailableCategories(categories);
      } catch (error) {
        console.error('Unable to load video category suggestions', error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const checkSubtitles = async () => {
      if (!isEditMode || !id || !src) return;
      
      const checkSubtitle = async (lang: 'uk' | 'en') => {
        try {
          const response = await fetch(`${config.baseUrl}api/videos/${id}/subtitles/${lang}`);
          return response.ok;
        } catch {
          return false;
        }
      };

      const [ukExists, enExists] = await Promise.all([
        checkSubtitle('uk'),
        checkSubtitle('en')
      ]);

      setAvailableSubtitles({ uk: ukExists, en: enExists });
    };

    checkSubtitles();
  }, [isEditMode, id, src]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !category) {
      toast.error('Заповніть всі обов\'язкові поля');
      return;
    }

    if (!isEditMode && !videoFile) {
      toast.error('Додайте відео файл');
      return;
    }

    try {
      setSaving(true);

      const formDataToSend = new FormData();
      formDataToSend.append('title', JSON.stringify({ ua: title, en: titleEn }));
      formDataToSend.append('description', JSON.stringify({ ua: description || "", en: descriptionEn || "" }));
      formDataToSend.append('category', category);
      formDataToSend.append('published', published ? 'true' : 'false');

      if (videoFile) {
        formDataToSend.append('video', videoFile);
      }
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }
      if (subtitleUkFile) {
        formDataToSend.append('subtitle_uk', subtitleUkFile);
      }
      if (subtitleEnFile) {
        formDataToSend.append('subtitle_en', subtitleEnFile);
      }

      const url = isEditMode ? `/api/videos/${id}` : '/api/videos';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Помилка збереження');
      }

      toast.success(`Відео ${isEditMode ? 'оновлено' : 'створено'} успішно!`);
      
      // Reset subtitle files after successful save
      setSubtitleUkFile(null);
      setSubtitleEnFile(null);
      
      // Refresh subtitle availability
      if (isEditMode) {
        setTimeout(async () => {
          const checkSubtitle = async (lang: 'uk' | 'en') => {
            try {
              const response = await fetch(`${config.baseUrl}api/videos/${id}/subtitles/${lang}`);
              return response.ok;
            } catch {
              return false;
            }
          };
          const [ukExists, enExists] = await Promise.all([
            checkSubtitle('uk'),
            checkSubtitle('en')
          ]);
          setAvailableSubtitles({ uk: ukExists, en: enExists });
        }, 500);
      }
      setTimeout(() => navigate('/admin/categories/videos'), 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не вдалося зберегти відео');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!id) return;
    
    try {
      setSaving(true);
      const formDataToSend = new FormData();
      formDataToSend.append('title', JSON.stringify({ ua: title, en: titleEn }));
      formDataToSend.append('category', category);
      formDataToSend.append('description', JSON.stringify({ ua: description || "", en: descriptionEn || "" }));
      formDataToSend.append('published', published ? 'true' : 'false');
      formDataToSend.append('removeImage', 'true');

      const response = await fetch(`/api/videos/${id}`, {
        method: 'PUT',
        body: formDataToSend
      });

      if (!response.ok) throw new Error('Помилка збереження');
      
      setImage(null);
      toast.success('Зображення видалено');
    } catch (err) {
      toast.error('Не вдалося видалити зображення');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubtitle = async (lang: 'uk' | 'en') => {
    if (!id) return;
    
    try {
      setSaving(true);
      const formDataToSend = new FormData();
      formDataToSend.append('title', JSON.stringify({ ua: title, en: titleEn }));
      formDataToSend.append('category', category);
      formDataToSend.append('description', JSON.stringify({ ua: description || "", en: descriptionEn || "" }));
      formDataToSend.append('published', published ? 'true' : 'false');
      formDataToSend.append('removeSubtitles', JSON.stringify([lang]));

      const response = await fetch(`/api/videos/${id}`, {
        method: 'PUT',
        body: formDataToSend
      });

      if (!response.ok) throw new Error('Помилка збереження');
      
      setAvailableSubtitles(prev => ({ ...prev, [lang]: false }));
      toast.success(`Субтитри ${lang === 'uk' ? 'українською' : 'англійською'} видалено`);
    } catch (err) {
      toast.error('Не вдалося видалити субтитри');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="video-editor-page">
      <Toaster position="top-center" />
      <div className="header-container">
        <div className="right-header">
          <h3>Редагування відео</h3>
          <div className="publish-toggle">
            <button 
              type="button"
              className={`small ${published ? 'published' : 'unpublished'}`}
              onClick={() => setPublished(!published)}
              title={published ? 'Відео опубліковано' : 'Відео не опубліковано'}
            >
              {published ? '✓ Опубліковано' : '○ Не опубліковано'}
            </button>
          </div>
        </div>
        <div className="action-buttons">
          <button type="submit" form="video-form" disabled={saving}>
            {saving ? 'Збереження...' : isEditMode ? 'Зберегти зміни' : 'Створити відео'}
          </button>
          <button type="button" onClick={() => navigate('/admin')} disabled={saving}>
            Скасувати
          </button>
        </div>
      </div>

      <form id="video-form" onSubmit={handleSubmit}>
        <div>
          <label title="Назва відео українською">Назва відео (UA):</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Введіть назву відео українською"
          />
        </div>

        <div>
          <label title="Назва відео англійською">Назва відео (EN):</label>
          <input
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Введіть назву відео англійською"
          />
        </div>

        <div>
          <label>
            Відео файл {!isEditMode && <span className="required">*</span>}
          </label>
          {isEditMode && src && !videoFile && (
            <div className="file-info" style={{ marginBottom: '1em' }}>
              Поточне відео: {src}
            </div>
          )}
          {videoFile && (
            <div className="file-info" style={{ marginBottom: '1em' }}>
              Вибрано нове відео: {videoFile.name}
              <button 
                type="button" 
                onClick={() => {
                  if (videoFile.preview) {
                    URL.revokeObjectURL(videoFile.preview);
                  }
                  setVideoFile(null);
                }}
                className="small"
                style={{ marginLeft: '1em' }}
              >
                Скасувати вибір
              </button>
            </div>
          )}
          <div className="dropzone" {...getVideoRootProps()}>
            <input {...getVideoInputProps()} />
            <p>Перетягніть відео файл або натисніть щоб обрати файл (MP4, WebM, OGG)</p>
          </div>
        </div>

        <div>
          <label>Зображення (прев'ю):</label>
          <div className="image-upload">
            {imageFile ? (
              <img
                src={imageFile.preview}
                alt="Нове зображення"
                onLoad={() => { URL.revokeObjectURL(imageFile.preview) }}
              />
            ) : image && (
              <div style={{ marginBottom: '10px' }}>
                <img
                  src={image}
                  alt="Поточне зображення"
                  style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {isEditMode && (
                  <button 
                    type="button" 
                    onClick={handleRemoveImage}
                    className="small"
                    disabled={saving}
                    style={{ marginTop: '10px' }}
                  >
                    Видалити зображення
                  </button>
                )}
              </div>
            )}
            <div>
              <div className="dropzone" {...getImageRootProps()}>
                <input {...getImageInputProps()} />
                <p>Перетягніть зображення або натисніть щоб обрати файл</p>
              </div>
              {imageFile && (
                <button 
                  type="button" 
                  onClick={() => {
                    if (imageFile.preview) {
                      URL.revokeObjectURL(imageFile.preview);
                    }
                    setImageFile(null);
                  }}
                  className="small"
                  style={{ marginTop: '10px' }}
                >
                  Скасувати вибір
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="category">
            Категорія <span className="required">*</span>
          </label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="category-suggestions"
            required
            placeholder="Введіть категорію"
          />
          <datalist id="category-suggestions">
            {availableCategories.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="description">Опис (UA):</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Введіть опис відео українською"
          />
        </div>

        <div>
          <label htmlFor="description_en">Опис (EN):</label>
          <textarea
            id="description_en"
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            rows={5}
            placeholder="Введіть опис відео англійською"
          />
        </div>

        <div>
          <label>Субтитри:</label>
          <div style={{ display: 'flex', gap: '1em', alignItems: 'center', marginTop: '0.5em' }}>
            {/* Ukrainian subtitles */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5em' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                border: '2px solid #ccc', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: availableSubtitles.uk ? '#e3f2fd' : '#f5f5f5',
                position: 'relative'
              }}>
                {availableSubtitles.uk ? (
                  <>
                    <span style={{ fontSize: '1.5em' }}>🇺🇦</span>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtitle('uk')}
                        className="small"
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        disabled={saving}
                        title="Видалити субтитри"
                      >
                        ×
                      </button>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: '1.2em', color: '#999' }}>UK</span>
                )}
              </div>
              {!availableSubtitles.uk && (
                <div className="dropzone" style={{ minHeight: '40px', padding: '0.5em', width: '60px' }} {...getSubtitleUkRootProps()}>
                  <input {...getSubtitleUkInputProps()} />
                  <span style={{ fontSize: '0.8em', cursor: 'pointer' }}>+</span>
                </div>
              )}
              {subtitleUkFile && (
                <div style={{ fontSize: '0.8em', color: '#4caf50' }}>
                  {subtitleUkFile.name}
                  <button
                    type="button"
                    onClick={() => setSubtitleUkFile(null)}
                    className="small"
                    style={{ marginLeft: '0.5em' }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* English subtitles */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5em' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                border: '2px solid #ccc', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: availableSubtitles.en ? '#e3f2fd' : '#f5f5f5',
                position: 'relative'
              }}>
                {availableSubtitles.en ? (
                  <>
                    <span style={{ fontSize: '1.5em' }}>🇬🇧</span>
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtitle('en')}
                        className="small"
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        disabled={saving}
                        title="Видалити субтитри"
                      >
                        ×
                      </button>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: '1.2em', color: '#999' }}>EN</span>
                )}
              </div>
              {!availableSubtitles.en && (
                <div className="dropzone" style={{ minHeight: '40px', padding: '0.5em', width: '60px' }} {...getSubtitleEnRootProps()}>
                  <input {...getSubtitleEnInputProps()} />
                  <span style={{ fontSize: '0.8em', cursor: 'pointer' }}>+</span>
                </div>
              )}
              {subtitleEnFile && (
                <div style={{ fontSize: '0.8em', color: '#4caf50' }}>
                  {subtitleEnFile.name}
                  <button
                    type="button"
                    onClick={() => setSubtitleEnFile(null)}
                    className="small"
                    style={{ marginLeft: '0.5em' }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}

export default VideoEditorPage;