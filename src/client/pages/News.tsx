import type { InfoCard } from "../../shared/models";
import './News.css';
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next"; 

type ArticleProps = {
  article: InfoCard;
  isEnglish: boolean;
};

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

function NewsArticle({ article, isEnglish }: ArticleProps) {
  const title = getLocalizedText(article.title, isEnglish);
  const content = getLocalizedText(article.content, isEnglish);

  return (
    <div className="article">
      <div className="news-h1">
        <h1>{title}</h1>
      </div>
      <div className="news-content">
        { article.image && <img src={article.image} alt={title} /> }
        
        <div 
          className="article-content"
          dangerouslySetInnerHTML={{ __html: content || '' }} 
        />
      </div>
    </div>
  );
}

function News() {
  const news = useLoaderData() as InfoCard[];
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';

  return (
    <div className="news-container">
      { 
        news.map((article, index) => (
          <NewsArticle 
            key={index} 
            article={article} 
            isEnglish={isEnglish} 
          />
        )) 
      }
    </div>
  );
}

export default News;