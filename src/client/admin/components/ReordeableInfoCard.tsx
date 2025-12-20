import { Reorder, useMotionValue } from "motion/react";
import { useRaisedShadow } from "../lib/raised-shadow";
import type { InfoCard, LocalizedString } from "../../../shared/models";
import './ReordeableInfoCard.css';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faFilePen, faLink, faList, faRotate, faTrash } from "@fortawesome/free-solid-svg-icons";
import { NavLink } from "react-router";

interface Props {
  card: InfoCard;
  adminUrlPrefix: string;
  onDelete?: () => void;
  onPublishingChanged: () => void;
  onSync: () => void;
}

function getLocalizedText(value: LocalizedString | undefined): string {
  if (!value) return "";
  if (typeof value === 'string') return value;
  return value.ua || value.en || "";
}

export const ReordeableInfoCard = ({ card, adminUrlPrefix, onDelete, onPublishingChanged, onSync }: Props) => {
  const y = useMotionValue(0);
  const boxShadow = useRaisedShadow(y);

  const title = getLocalizedText(card.title);
  const subtitle = getLocalizedText(card.subtitle);
  const content = getLocalizedText(card.content);

  return (
    <Reorder.Item value={card} id={card.id} className="card" style={{ boxShadow, y }}>      
      <div className="card-data">
        {
          card.image && <img src={card.image} alt={title} className="card-image" />
        }
        <div> 
          
          <NavLink to={`${adminUrlPrefix}/edit/${card.id}`}>
            <h3>{title}</h3>
          </NavLink>

          {subtitle && <h4>{subtitle}</h4>}
          
          {card.subcategory && <div title="Підменю" className="card-subcategory">
            <FontAwesomeIcon icon={faList} /> {card.subcategory} <NavLink to={`/admin/categories/${card.subcategory}`}>→</NavLink>
          </div>}

          <div className="card-content">
            {
              card.resource && <div className="ext-link"> 
                <FontAwesomeIcon icon={faLink} /> {card.resource} 
              </div> 
            }
            {content ? content.substring(0, 100) + '...' : (card.subcategory ? '' : 'Немає вмісту')}
          </div>
        </div>
      </div>

      <div>
        <FontAwesomeIcon 
          title={card.published ? 'Приховати' : 'Опублікувати'} 
          className="action-btn" 
          icon={card.published ? faEye : faEyeSlash} 
          onClick={onPublishingChanged} />
        &nbsp;
        {card.resource && <>
          <FontAwesomeIcon title="Синхронізувати" className="action-btn" icon={faRotate} onClick={onSync} />&nbsp;
        </>}
        <NavLink to={`${adminUrlPrefix}/edit/${card.id}`} className="action-btn">
          <FontAwesomeIcon title="Редагувати картку" className="action-btn" icon={faFilePen} />
        </NavLink>
        &nbsp;
        <FontAwesomeIcon title="Видалити картку" className="action-btn" icon={faTrash} onClick={onDelete} />
      </div>
    </Reorder.Item>
  );
};