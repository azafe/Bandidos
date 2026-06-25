import logo from "../../assets/bandidos-logo.jpg";
import "../../styles/loading-screen.css";

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo-wrapper">
        <div className="loading-glow" />
        <img src={logo} alt="Bandidos" className="loading-logo" />
      </div>
    </div>
  );
}
