import './CardButton.css';
import { motion } from "motion/react";

export enum CardSize {
  Full = "full",
  Minimized = "minimized",
  Micro = "micro"
}

type ButtonProps = {
  title?: string | null,
  subtitle?: string | null,
  image?: string | null,
  active?: boolean,
  size?: CardSize | null,
  empty?: boolean,
  onClick?: () => void
};

export default function CardButton({ title, subtitle, image, active, onClick, size, empty }: ButtonProps) {
  const safeTitle = title || "";
  
  const downsizeText = safeTitle.length > 50;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      whileHover={{ scale: 1.05 }}
      whileTap={ empty ? {} : { scale: 0.95 }}
      className={"info-card" + (active ? " active" : "") + (size ? ` ${size}` : "") + (empty ? " empty" : " actionable" + (downsizeText ? " downsized" : ""))}
      onClick={ () => {        
        if (onClick) onClick()
      }}>      
        { image ? <img src={image} alt={safeTitle} /> : <></> }   
        <div className="card-text">
          <h3>{safeTitle}</h3>      
          { (size != CardSize.Minimized && subtitle) ? <p className="subtitle">{subtitle}</p> : <></> }
        </div>
    </motion.div>
  );
}