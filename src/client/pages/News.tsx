import type { InfoCard } from "../../shared/models";
import './News.css';
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next"; 

type ArticleProps = {
  article: InfoCard;
  isEnglish: boolean;
};

function NewsArticle({ article, isEnglish }: ArticleProps) {
  const title = (isEnglish && article.title_en) ? article.title_en : article.title_ua;
  const content = (isEnglish && article.content_en) ? article.content_en : article.content_ua;

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