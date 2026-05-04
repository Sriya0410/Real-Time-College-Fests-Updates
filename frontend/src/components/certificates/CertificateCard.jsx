export default function CertificateCard({
  title,
  subtitle,
  badge,
  badgeClass,
  details = [],
  buttonText = "Open",
  downloadText = "Download",
  onClick,
  onDownload,
  disabled = false,
  downloadDisabled = false,
}) {
  return (
    <div className="certCard">
      {badge ? (
        <div className={`certBadge ${badgeClass || ""}`}>{badge}</div>
      ) : null}

      <h3>{title}</h3>

      {subtitle ? <p className="certSubtitle">{subtitle}</p> : null}

      <div className="certDetails">
        {details.map((item, index) => (
          <p key={index}>
            <strong>{item.label}:</strong> {item.value}
          </p>
        ))}
      </div>

      <div className="certActions">
        <button
          type="button"
          className={`certBtn ${disabled ? "disabled" : ""}`}
          onClick={onClick}
          disabled={disabled}
        >
          {buttonText}
        </button>

        {onDownload ? (
          <button
            type="button"
            className={`certBtn certDownloadBtn ${
              downloadDisabled ? "disabled" : ""
            }`}
            onClick={onDownload}
            disabled={downloadDisabled}
          >
            {downloadText}
          </button>
        ) : null}
      </div>
    </div>
  );
}