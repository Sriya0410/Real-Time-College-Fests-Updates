export default function CertificateCard({
  title,
  subtitle,
  badge,
  badgeClass = "",
  details = [],
  buttonText,
  onClick,
  disabled = false,
}) {
  return (
    <div className="certCard">
      {badge ? <div className={`certBadge ${badgeClass}`}>{badge}</div> : null}

      <h3>{title}</h3>
      {subtitle ? <p className="certSubtitle">{subtitle}</p> : null}

      <div className="certDetails">
        {details.map((item, idx) => (
          <p key={idx}>
            <b>{item.label}:</b> {item.value}
          </p>
        ))}
      </div>

      {buttonText ? (
        <button
          className={`certBtn ${disabled ? "disabled" : ""}`}
          onClick={onClick}
          disabled={disabled}
        >
          {buttonText}
        </button>
      ) : null}
    </div>
  );
}