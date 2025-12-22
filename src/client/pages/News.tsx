import type { InfoCard } from "../../shared/models";
import { getLocalizedText } from "../lib/localization";
import './News.css';
import { useLoaderData } from "react-router";
import { useTranslation } from "react-i18next"; 

type ArticleProps = {
  article: InfoCard;
};


function NewsArticle({ article}: ArticleProps) {
  const {i18n} = useTranslation();
  const title = getLocalizedText(article.title, i18n.language);
  const content = getLocalizedText(article.content, i18n.language);

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

  return (
    <div className="news-container">
      { 
        news.map((article, index) => (
          <NewsArticle 
            key={index} 
            article={article} 
          />
        )) 
      }
    </div>
  );
}

export default News;