import "../../styles/studentLayout.css";

export default function StudentTopbar({ onMenuClick, title, username }) {
  return (
    <header className="studentTopbar">
      <div className="topbarRow">
        <button className="hamburger" onClick={onMenuClick} aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>

        <div className="topTitle">{title || "EventVerse"}</div>

        <div className="topRight">
          <span className="welcomeText">Welcome,</span>
          <span className="welcomeName">{username}</span>
        </div>
      </div>
    </header>
  );
}