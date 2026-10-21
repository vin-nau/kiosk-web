import { ClockLoader } from "react-spinners";
import './Loader.css';

// Loader centered in the page
export function Loader() {
  return (
    <div className="loader">
      <ClockLoader color="var(--foreground)" />
    </div>
  );
}