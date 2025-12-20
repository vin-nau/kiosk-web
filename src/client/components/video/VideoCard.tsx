import type { Video, LocalizedString } from '../../../shared/models';
import CardButton, { CardSize } from '../cards/CardButton';
import { useTranslation } from "react-i18next";

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

function getLocalized(value: LocalizedString | undefined, lang: string): string {
  if (!value) return "";
  
  if (typeof value === 'string') {
    return value;
  }

  if (lang === 'en' && value.en) {
    return value.en;
  }
  
  return value.ua || "";
}

export default function VideoCard({ video, onClick }: VideoCardProps) {
  const { i18n } = useTranslation();

  const title = getLocalized(video.title, i18n.language);
  const description = getLocalized(video.description, i18n.language);

  return <CardButton 
    title={title} 
    subtitle={description} 
    image={video.image} 
    onClick={() => onClick(video)} 
    size={CardSize.Full} 
    empty={true} 
  />;
};
