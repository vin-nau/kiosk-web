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

const getLocalizedText = (
  input: string | { ua: string; en?: string } | null | undefined | any, 
  isEnglish: boolean
): string => {
  if (!input) return "";

  if (typeof input === 'object') {
    if (isEnglish && input.en) {
      return input.en;
    }
    return input.ua || "";
  }

  if (typeof input === 'string') {
    try {
      const trimmed = input.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(input);
        
        if (Array.isArray(parsed)) {
          if (isEnglish && parsed[1]) return parsed[1];
          return parsed[0] || "";
        }
        
        if (typeof parsed === 'object' && parsed !== null) {
           if (isEnglish && parsed.en) return parsed.en;
           return parsed.ua || "";
        }
      }
    } catch (err) {
    }
    return input;
  }

  return "";
};

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
  const isEnglish = i18n.language === 'en';

  return (
    <motion.div
      className={"info-cards" + (size === CardSize.Minimized ? " minimized" : "") + (partiallyFilled ? " partially-filled" : "")}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {cards.map((info) => {
        const title = getLocalizedText(info.title, isEnglish);
        const subtitle = getLocalizedText(info.subtitle, isEnglish);
        const contentVal = getLocalizedText(info.content, isEnglish);
        
        const hasContent = !!contentVal;

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
  const isEnglish = i18n.language === 'en';

  useEffect(() => setActiveInfo(info), [info]);

  const renderContent = () => {
    if (!activeInfo?.content) return null;

    const localizedContent = getLocalizedText(activeInfo.content, isEnglish);
    if (!localizedContent) return null;

    const decoded = decodeHtml(localizedContent);
    const safeHtml = DOMPurify.sanitize(decoded);

    return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
  };

  return (
    <>
      {info.subcategory ? (
        <InfosList cards={info.subItems ?? []} onSelect={setActiveInfo} active={activeInfo === info ? null : activeInfo} />
      ) : null}

      {activeInfo && getLocalizedText(activeInfo.content, isEnglish) && (
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