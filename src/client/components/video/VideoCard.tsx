import type { Video } from '../../../shared/models';
import CardButton, { CardSize } from '../cards/CardButton';
import { useTranslation } from "react-i18next";

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

export default function VideoCard({ video, onClick }: VideoCardProps) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const title = (isEn && video.title_en) ? video.title_en : video.title_ua;
  const description = (isEn && video.description_en) ? video.description_en : video.description_ua;

  return <CardButton 
    title={title} 
    subtitle={description} 
    image={video.image} 
    onClick={() => onClick(video)} 
    size={CardSize.Full} 
    empty={true} 
  />;
};
