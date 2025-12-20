import './VideoManagementPage.css'
import { NavLink, useLoaderData } from 'react-router-dom';
import { useState} from 'react';
import type { Video, LocalizedString } from '../../../shared/models';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faFilePen, faIcons, faSquarePlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import config from '../../lib/config';
import toast, { Toaster } from 'react-hot-toast';
import performWithUndo from '../lib/undo';

function getLocalizedText(value: LocalizedString | undefined): string {
  if (!value) return "";
  if (typeof value === 'string') return value;
  return value.ua || value.en || "";
}

export function VideoManagementPage() {
  const loadedVideos = useLoaderData<Video[]>();
  const [videos, setVideos] = useState<Video[]>(loadedVideos || []);

  const handleDelete = (video: Video) => {
    const index = videos.indexOf(video);
    setVideos(prevVideos => prevVideos.filter(v => v.id !== video.id)); 

    const deletionAction = async () => {
      const deleteResp = await fetch(`${config.baseUrl}api/videos/${video.id}`, { method: 'DELETE' });

      if (!deleteResp.ok) {
        const errorData = await deleteResp.json();
        throw new Error(errorData.error || `Помилка видалення: ${deleteResp.status}`);
      }
    }

    const undoAction = () => {
      setVideos((prev) => {
          const newItems = [...prev];        
          newItems.splice(index, 0, video); // Restore to original position
          return newItems;
        })
    }

    performWithUndo("Відео видалено", deletionAction, { onUndo: undoAction });
  };

  const togglePublishing = (video: Video) => {
    const updateAction = async () => {
      const updateResp = await fetch(`${config.baseUrl}api/videos/${video.id}/published`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !video.published })
      });

      if (!updateResp.ok) {
        const errorData = await updateResp.json();
        throw new Error(errorData.error || `Помилка оновлення статусу: ${updateResp.status}`);
      }

      return await updateResp.json();
    };

    const updateVideo = (publish: boolean) => {
      setVideos((prev) => {
        return prev.map((v) => v.id === video.id ? { ...v, published: publish } : v);
      });
    }

    performWithUndo(`Відео ${!video.published ? 'опубліковано' : 'приховано'}`, updateAction, { onUndo: () => updateVideo(video.published) });
    
    updateVideo(!video.published);
  };

    return (
      <div className="cards-list">
        <Toaster position="top-center" />
        <div className="main-controls">
          <NavLink to="/admin/categories/videos/new" className="action-btn">
            <FontAwesomeIcon className="action-btn" icon={faSquarePlus} />
          </NavLink>
        </div>

        {
          videos.length === 0 ? <div>Відео ще немає. Додайте перше відео!</div>: <></>
        } 
        <ul>
        {          
          videos.map(video => (
            <li key={video.id} className="card video">            
              <div className="card-content">
                {video.image ? <img src={video.image} alt={getLocalizedText(video.title)} className="preview" /> : (
                  <div className="preview">📹</div>
                )}

                <div className="video-content">
                  <NavLink to={`/admin/categories/videos/${video.id}/edit`}>
                    <h3>{getLocalizedText(video.title)}</h3>
                  </NavLink>                
                  <div><FontAwesomeIcon icon={faIcons} /> {video.category}</div>
                </div>
              </div>

              <div className="actions">
                <FontAwesomeIcon 
                  title={video.published ? 'Приховати' : 'Опублікувати'} 
                  className="action-btn" 
                  icon={video.published ? faEye : faEyeSlash} 
                  onClick={() => togglePublishing(video)} 
                />
                &nbsp;
                <NavLink to={`/admin/categories/videos/${video.id}/edit`} className="action-btn">
                  <FontAwesomeIcon title="Редагувати" className="action-btn" icon={faFilePen} />
                </NavLink>
                &nbsp;
                <FontAwesomeIcon title="Видалити відео" className="action-btn" icon={faTrash} onClick={() => handleDelete(video)} />
              </div>
            </li>
        ))}
        </ul>
      </div>
  );
}

export default VideoManagementPage;