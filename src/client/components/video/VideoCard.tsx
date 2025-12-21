import type { Video, LocalizedString } from '../../../shared/models';
import CardButton, { CardSize } from '../cards/CardButton';
import { useTranslation } from "react-i18next";
import { getLocalizedText } from '../../lib/localization';

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}


export default function VideoCard({ video, onClick }: VideoCardProps) {
  const { i18n } = useTranslation();

  const title = getLocalizedText(video.title, i18n.language);
  const description = getLocalizedText(video.description, i18n.language);

  return <CardButton 
    title={title} 
    subtitle={description} 
    image={video.image} 
    onClick={() => onClick(video)} 
    size={CardSize.Full} 
    empty={true} 
  />;
};
