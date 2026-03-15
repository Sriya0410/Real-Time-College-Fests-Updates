import { useState } from "react";
import { verifyUpdateCode } from "../../services/verifiedUpdateService";
import "../../styles/updates.css";

export default function VerifyUpdate() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const normalize = (v) => String(v || "").trim().toUpperCase();

  const onCheck = async (e) => {
    e.preventDefault();
    setErr("");
    setRes(null);

    const v = normalize(code);
    if (!v) return setErr("Enter verification code (example: FEST-1A2B3C)");

    try {
      setLoading(true);
      const r = await verifyUpdateCode(v);
      setRes(r);
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Verify failed");
    } finally {
      setLoading(false);
    }
  };

  const onPasteExample = () => setCode("FEST-1A2B3C");

  const copyText = async (t) => {
    try {
      await navigator.clipboard.writeText(String(t));
    } catch {
      // ignore
    }
  };

  const resultFound = !!res?.found;

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Verify Update Code</h1>
        
      </div>

      <form className="card verifyCard" onSubmit={onCheck}>
        <div className="field">
          <label>Verification Code</label>
          <div className="inputRow">
            <input
              value={code}
              onChange={(e) => setCode(normalize(e.target.value))}
              placeholder="FEST-XXXXXX"
              disabled={loading}
              className="verifyInput"
              autoComplete="off"
            />
            
             
            <button
              type="button"
              className="btnSmall2"
              onClick={() => copyText(normalize(code))}
              disabled={!normalize(code) || loading}
              title="Copy code"
            >
              Copy
            </button>
          </div>
          <div className="hintText">
            Tip: Admin shares code like <b>FEST-3FA91C</b>. Enter it here to confirm.
          </div>
        </div>

        {err && <div className="alert error">{err}</div>}

        <button className="btn verifyBtn" disabled={loading}>
          {loading ? "Checking..." : "Verify"}
        </button>
      </form>

      {res && (
        <div className={`resultCard ${resultFound ? "ok" : "bad"}`}>
          {resultFound ? (
            <>
              <div className="resultTop">
                <div className="resultBadge ok">✅ OFFICIAL</div>
                <div className="resultTime">
                  {res?.data?.created_at ? new Date(res.data.created_at).toLocaleString() : ""}
                </div>
              </div>

              <h3 className="resultTitle">{res.data.title}</h3>
              <p className="resultMsg">{res.data.message}</p>

              <div className="resultBottom">
                <span className="muted">
                  Code: <b>{res.data.verification_code}</b>
                </span>
                <button
                  className="btnSmall2"
                  type="button"
                  onClick={() => copyText(res.data.verification_code)}
                >
                  Copy Code
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="resultTop">
                <div className="resultBadge bad">❌ NOT FOUND</div>
              </div>
              <h3 className="resultTitle">This code is not official</h3>
              <p className="resultMsg">
                This verification code was not found in the official updates list.
                The message may be fake. Please check <b>✅ Verified Updates</b> inside the app.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}