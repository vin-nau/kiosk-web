import { useCallback, useEffect, useState, useTransition } from 'react';
import type { InfoCard, LocalizedString } from "../../../shared/models";
import { useLoaderData, useNavigate, useParams } from 'react-router';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';
import './CardEditorPage.css';
import Editor from 'react-simple-wysiwyg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChain } from '@fortawesome/free-solid-svg-icons';
import { categoriesLoader } from '../lib/loaders';
import { getLocalizedText } from '../../lib/localization';

type PreviewFile = {
  preview: string;
}



function SubcategoryEdit({ subcategory, onChange, suggestions }: { subcategory: string, onChange: (subcategory: string) => void, suggestions: string[] }) {
  const handleSubcategoryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;    
    onChange(value);
  }, [onChange]);

  const datalistId = "subcategory-suggestions";

  return (
    <div>
      <label title="Картки дочірньої категорії будуть відображені при натисненні на дану">Дочірня категорія:</label>
      <input
        list={datalistId}
        value={subcategory}
        onChange={handleSubcategoryChange}
        placeholder="Введіть підкатегорію"
      />
      <datalist id={datalistId}>
        {suggestions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </div>
  );
}

async function updateInfo(card: InfoCard, imageFile: File | null, create: boolean, url: string): Promise<boolean> {
  const formData = new FormData();
  formData.append('title', JSON.stringify(card.title));
  formData.append('subtitle', JSON.stringify(card.subtitle));
  formData.append('content', JSON.stringify(card.content));

  if (card.category) formData.append('category', card.category);

  if (card.subcategory) formData.append('subcategory', card.subcategory);

  if (imageFile) {
    formData.append('image', imageFile);
  }

  const method = create ? 'POST' : 'PUT';
  const urlWithId = create ? url : `${url}/${card.id}`;
  const resp = await fetch(urlWithId, { method: method, body: formData });

  if (!resp.ok) {
    const error = await resp.json();
    toast.error(`Помилка: ${error.error || 'Невідома помилка'}`);
    return false;
  } else {
    toast.success(`Інформацію ${create ? 'створено' : 'оновлено'} успішно!`);
    return true;
  }
}

async function fetchSubcategories(setAvailableSubcategories: (categories: string[]) => void) {
  try {
    setAvailableSubcategories(await categoriesLoader());
  } catch (error) {
    console.error('Unable to load subcategory suggestions', error);
  }
}

function CardEditorPage({ create }: { create?: boolean }) {
  const navigate = useNavigate();
  const card = useLoaderData() as InfoCard;

  const url = `/api/info/${card.category}`;

  const [title, setTitle] = useState(getLocalizedText(card.title, 'ua'));
  const [titleEn, setTitleEn] = useState(getLocalizedText(card.title, 'en'));

  const [subtitle, setSubtitle] = useState(getLocalizedText(card.subtitle, 'ua'));
  const [subtitleEn, setSubtitleEn] = useState(getLocalizedText(card.subtitle, 'en'));

  const [content, setContent] = useState<string | null>(getLocalizedText(card.content, 'ua'));
  const [contentEn, setContentEn] = useState<string | null>(getLocalizedText(card.content, 'en'));

  const [image, setImage] = useState(card.image);
  const [category, setCategory] = useState(card.category ?? '');
  const [subcategory, setSubcategory] = useState<string | null>(card.subcategory ?? null);
  const [imageFile, setImageFile] = useState<File & PreviewFile | null>(null);
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);

  const {
    acceptedFiles,
    fileRejections,
    getRootProps,
    getInputProps
  } = useDropzone({
    multiple: false,
    accept: { 'image/png': ['.png'] },
    onDrop: (files) => { setImageFile(Object.assign(files[0], { preview: URL.createObjectURL(files[0]) })) }
  });

  useEffect(() => {  
    fetchSubcategories(setAvailableSubcategories);
  }, []);

  const [previewFileData, setPreviewFileData] = useState(
    {} as {
      previewType: string;
      previewUrl: string | ArrayBuffer | null;
      previewName: string;
      isDragging: boolean;
    }
  );

  const handleSave = () => {
    updateInfo(
      {
        ...card, 
        title: { ua: title, en: titleEn },
        subtitle: { ua: subtitle, en: subtitleEn },
        content: { ua: content || "", en: contentEn || "" }, 
        subcategory, 
        category
      },
      imageFile,
      create || false, url).then((success) => {
      if (success) navigate(-1);
    });
  }

  // just navigate back
  const handleCancel = () => { navigate(-1); }

  const handleFileUploading = async (file: { name: "" }) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setPreviewFileData({
      previewType: "image",
      previewUrl: "https://picsum.photos/300/224",
      previewName: file.name,
      isDragging: false,
    });
  };

  const handleModeToggle = () => {
    if (subcategory != null) {
      // switch to content mode
      setSubcategory(null);
      setContent('');
      setContentEn(''); 
    } else {
      // switch to menu mode
      setContent(null);
      setContentEn(null);
      setSubcategory(card.subcategory ?? '');
    }
  };

  return (
    <div className="card-editor-page">
      <div className='header-container'>
        <div className="right-header">
          <h3>Редагування інформації</h3>
          <div className="mode-toggle">
            <button 
              className="small" 
              onClick={handleModeToggle}
              title={subcategory != null ? 'Зараз кнопка відображає меню для вказаної підкатегорії' : 'Зараз кнопка відображає заданий контент'}
            >
              {subcategory != null ? 'Перейти в режим картки' : 'Перейти в режим меню'}
            </button>
          </div>
        </div>
        <div className="action-buttons">
          <button onClick={handleSave}>{create ? 'Створити' : 'Зберегти'}</button>
          <button onClick={handleCancel}>Скасувати</button>
        </div>
      </div>
      <Toaster position="top-center" />
      <div>
        { card.resource && <div className="card-resource">
          <span>Згенеровано на основі: <FontAwesomeIcon icon={faChain}/> <a href={card.resource}>{card.resource}</a></span>
          </div>
        }
        
        <div>
          <label title="Основна назва картки">Назва (UA):</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Введіть назву українською"
          />
          <label title="Назва англійською" style={{ marginTop: '10px' }}>Назва (EN):</label>
          <input
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Enter title in English"
          />
        </div>

        <div>
          <label title="Додаткова інформація під основним заголовком">Підзаголовок (UA):</label>
          <input
            value={subtitle ?? ""}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Введіть підзаголовок українською"
          />
          <label title="Додаткова інформація під основним заголовком">Підзаголовок (EN):</label>
          <input
            value={subtitleEn}
            onChange={(e) => setSubtitleEn(e.target.value)}
            placeholder="Введіть підзаголовок англійською"
          />
        </div>

        <div>
          <label title="Визначає в якому меню відображатиметься дана картка">Категорія:</label>
          <input
            value={category}
            list="category-suggestions"
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Введіть категорію"
          />
          <datalist id="category-suggestions">
            {availableSubcategories.map((item) => (<option key={item} value={item} />))}
          </datalist>
        </div>

        {subcategory != null ? (
          <SubcategoryEdit
            subcategory={subcategory}
            onChange={(value) => setSubcategory(value)}
            suggestions={availableSubcategories}
          />
        ) : (
          <div>
            <label>Контент (UA):</label>
            <Editor
              value={content ?? ''}
              onChange={evt => setContent(evt.target.value)}
              containerProps={{
                style: {
                  resize: 'vertical',
                  minHeight: '500px',
                  marginBottom: '20px'
                }
              }}
            />
            
            <label>Контент (EN):</label>
             <Editor
              value={contentEn ?? ''}
              onChange={evt => setContentEn(evt.target.value)}
              containerProps={{
                style: {
                  resize: 'vertical',
                  minHeight: '500px',
                }
              }}
            />
          </div>
        )}
      </div>

      <div className="image-upload">
        {imageFile ? <img
          src={imageFile.preview}
          // Revoke data uri after image is loaded
          onLoad={() => { URL.revokeObjectURL(imageFile.preview) }}
        /> : image && (
          <div style={{ marginBottom: '10px' }}>
            <img
              src={image}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )
        }

        <div>
          <div className="dropzone" {...getRootProps()}>
            <input {...getInputProps()} />
            <p>Перетягніть зображення або натисніть щоб обрати файл (тільки PNG)</p>
          </div>
        </div>

      </div>


    </div>
  );
}

export default CardEditorPage;