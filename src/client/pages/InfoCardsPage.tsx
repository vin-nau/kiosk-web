import { useEffect, useState } from "react";
import type { InfoCard } from "../../shared/models";
import "./InfoCardsPage.css";
import CardButton, { CardSize } from "../components/cards/CardButton";
import { motion } from "motion/react";
import CloseButton from "../components/cards/CloseButton";
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { loadCategory } from "../lib/loaders";
import { logItemShown } from "../lib/firebase";
import DOMPurify from "dompurify";

type CardsListProps = {
  cards: InfoCard[];
  active?: InfoCard | null;
  onSelect: (info: InfoCard) => void;
};

type CardWithSubItems = InfoCard & {
  subItems?: InfoCard[];
};

export type InfoCardsPageProps = {
  title: string;
};

function decodeHtml(html: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function loadSubItems(card: CardWithSubItems | null, update: (i: CardWithSubItems) => void): void {
  if (card && card.subcategory && !card.subItems) {
    loadCategory(card.subcategory).then((data) => {
      card.subItems = data;
      update({ ...card }); // trigger re-render
    });
  }
}

function InfosList({ cards, active, onSelect }: CardsListProps) {
  const size = active == null ? CardSize.Full : CardSize.Minimized;
  const partiallyFilled = cards.length < 3;
  const { i18n } = useTranslation(); 

  return (
    <motion.div
      className={"info-cards" + (size === CardSize.Minimized ? " minimized" : "") + (partiallyFilled ? " partially-filled" : "")}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {cards.map((info) => {
        const isEn = i18n.language === 'en';
        const title = (isEn && info.title_en) ? info.title_en : info.title_ua;
        const subtitle = (isEn && info.subtitle_en) ? info.subtitle_en : info.subtitle_ua;
        
        const hasContent = !!info.content_ua || !!info.content_en;

        return (
          <CardButton
            key={info.id}
            title={title}     
            subtitle={subtitle}
            image={info.image}
            size={size}
            active={info.id === active?.id}
            onClick={() => {
              // ignore clicks on empty cards
              if (hasContent || info.subcategory) { 
                onSelect(info) 
              } 
            }}
            empty={!hasContent && !info.subcategory}
          />
        );
      })}
    </motion.div>
  );
}

function ActiveInfo({ info, onClose }: { info: CardWithSubItems; onClose: () => void }) {
  const [activeInfo, setActiveInfo] = useState<CardWithSubItems | null>(info);
  const { i18n } = useTranslation();

  useEffect(() => setActiveInfo(info), [info]);

  const renderContent = () => {
    const isEn = i18n.language === 'en';
    const contentText = (isEn && activeInfo?.content_en) ? activeInfo.content_en : activeInfo?.content_ua;

    if (!contentText) return null;

    const decoded = decodeHtml(contentText);
    const safeHtml = DOMPurify.sanitize(decoded);

    return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
  };

  const hasContent = !!activeInfo?.content_ua || !!activeInfo?.content_en;

  return (
    <>
      {info.subcategory ? (
        <InfosList cards={info.subItems ?? []} onSelect={setActiveInfo} active={activeInfo === info ? null : activeInfo} />
      ) : null}

      {activeInfo && hasContent && (
        <div className="active-info">
          <CloseButton onClick={onClose} />
          <section>
            <div className="content">{renderContent()}</div>
          </section>
        </div>
      )}
    </>
  );
}

function InfoCardsPage({ title }: InfoCardsPageProps) {
  const cards = useLoaderData() as CardWithSubItems[];
  const { t } = useTranslation();
  const [activeInfo, setActiveInfo] = useState<CardWithSubItems | null>(null);

  useEffect(() => loadSubItems(activeInfo, setActiveInfo), [activeInfo]);

  useEffect(() => {
    if (activeInfo) logItemShown(activeInfo.id);
  }, [activeInfo]);

  return (
    <div className="info-page">
      {activeInfo == null ? <h1>{t(title)}</h1> : null}

      <InfosList cards={cards} onSelect={setActiveInfo} active={activeInfo} />

      {activeInfo ? <ActiveInfo info={activeInfo} onClose={() => setActiveInfo(null)} /> : null}
    </div>
  );
}

export default InfoCardsPage;