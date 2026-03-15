import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "./EventCard.css";

function formatDatePretty(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTimePretty(value) {
  if (!value) return "-";
  return String(value).slice(0, 5);
}

const BRANCHES = [
  "CSE",
  "IT",
  "ECE",
  "EEE",
  "MECH",
  "CIVIL",
  "AI & DS",
  "AI & ML",
  "CS (Cyber Security)",
  "CS (Data Science)",
  "CS (IoT)",
  "CS (Cloud Computing)",
];

export default function EventCard({ event }) {
  const { user } = useAuth();
  const userId = user?.id ?? user?.user_id;

  const isPaid = !!event?.is_paid;
  const amount = Number(event?.price || 0);

  const capacity = event?.capacity ?? null;
  const seatsLeftRaw = event?.seats_left;
  const seatsLeft =
    seatsLeftRaw === undefined || seatsLeftRaw === null ? null : Number(seatsLeftRaw);

  const isFull = capacity !== null && seatsLeft !== null && seatsLeft <= 0;

  const categoryText = useMemo(() => {
    return String(
      event?.category_name || event?.category || event?.categoryTitle || "Uncategorized"
    ).toUpperCase();
  }, [event]);

  const dateText = useMemo(() => formatDatePretty(event?.event_date), [event?.event_date]);

  const timeText = useMemo(() => {
    const s = formatTimePretty(event?.start_time);
    const e = event?.end_time ? formatTimePretty(event?.end_time) : "";
    return e ? `${s} - ${e}` : s;
  }, [event?.start_time, event?.end_time]);

  const statusBadge = useMemo(() => {
    if (isFull && event?.status !== "COMPLETED") return { text: "FULL", cls: "full" };

    const st = String(event?.status || "UPCOMING").toUpperCase();
    if (st === "LIVE") return { text: "LIVE", cls: "live" };
    if (st === "COMPLETED") return { text: "COMPLETED", cls: "completed" };
    if (st === "CANCELLED") return { text: "CANCELLED", cls: "cancelled" };
    return { text: "UPCOMING", cls: "upcoming" };
  }, [event?.status, isFull]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: "",
    regno: "",
    email: "",
    phone: "",
    branch: "",
    year: "",
  });

  function openModal() {
    if (isFull) {
      alert("This event is FULL capacity ❌");
      return;
    }

    setOpen(true);
    setStep(1);
    setSubmitting(false);
    setErr("");
    setForm({
      name: "",
      regno: "",
      email: "",
      phone: "",
      branch: "",
      year: "",
    });
  }

  function closeModal() {
    setOpen(false);
    setStep(1);
    setSubmitting(false);
    setErr("");
  }

  function validateForm() {
    const nameOk = form.name.trim().length >= 3;
    const regOk = form.regno.trim().length >= 4;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const phoneOk = /^[0-9]{10}$/.test(form.phone.trim());
    const branchOk = !!form.branch;
    const yearOk = ["1", "2", "3", "4"].includes(String(form.year));

    if (!nameOk) return "Enter a valid name (min 3 letters).";
    if (!regOk) return "Enter a valid Register Number.";
    if (!emailOk) return "Enter a valid email.";
    if (!phoneOk) return "Enter a valid 10-digit phone number.";
    if (!branchOk) return "Select your branch.";
    if (!yearOk) return "Select your year (1-4).";
    return "";
  }

  async function registerFree() {
    if (isFull) return setErr("This event is FULL capacity ❌");
    if (!userId) return setErr("Please login again. User session missing.");

    const msg = validateForm();
    if (msg) return setErr(msg);

    setErr("");
    setSubmitting(true);

    try {
      const payload = {
        userId,
        eventId: event?.id,
        paid: false,
        amount: 0,
        full_name: form.name,
        reg_no: form.regno,
        email: form.email,
        phone: form.phone,
        branch: form.branch,
        year: form.year,
      };

      const res = await api.post("/registrations", payload);
      if (!res.data?.ok) throw new Error(res.data?.message || "Registration failed");
      setStep(3);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Registration failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function paidNext() {
    if (isFull) return setErr("This event is FULL capacity ❌");
    if (!userId) return setErr("Please login again. User session missing.");

    const msg = validateForm();
    if (msg) return setErr(msg);

    setErr("");
    setStep(2);
  }

  async function paidConfirm() {
    if (isFull) return setErr("This event is FULL capacity ❌");
    if (!userId) return setErr("Please login again. User session missing.");

    const msg = validateForm();
    if (msg) return setErr(msg);

    setErr("");
    setSubmitting(true);

    let registrationId = null;

    try {
      const orderRes = await api.post("/payments/razorpay/order", {
        userId,
        eventId: event?.id,
        full_name: form.name,
        reg_no: form.regno,
        email: form.email,
        phone: form.phone,
        branch: form.branch,
        year: form.year,
      });

      if (!orderRes.data?.ok) {
        throw new Error(orderRes.data?.message || "Failed to create Razorpay order");
      }

      const d = orderRes.data.data;
      registrationId = d.registrationId;

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded. Add script in index.html.");
      }

      const options = {
        key: d.razorpayKeyId,
        amount: d.amount,
        currency: d.currency,
        name: "BTech University Fest",
        description: `Event Registration: ${event?.title || "Event"}`,
        order_id: d.orderId,
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        handler: async function (response) {
          try {
            const verifyRes = await api.post("/payments/razorpay/verify", {
              registrationId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (!verifyRes.data?.ok) {
              throw new Error(verifyRes.data?.message || "Payment verification failed");
            }

            setStep(3);
          } catch (e) {
            setErr(e?.response?.data?.message || e?.message || "Payment verification failed");
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              if (registrationId) {
                await api.post("/payments/razorpay/cancel", { registrationId });
              }
            } catch (e) {
              // ignore
            }
            setErr("Payment cancelled.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Payment failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <article className="card2">
        <div className="cardTop2">
          <span className="pillCat2" title={categoryText}>
            {categoryText}
          </span>

          <div className="cardBadges2">
            <span className={`pillStatus2 ${statusBadge.cls}`}>{statusBadge.text}</span>

            {isFull ? (
              <span className="pillPrice2 paid">FULL</span>
            ) : (
              <span className={`pillPrice2 ${isPaid ? "paid" : "free"}`}>
                {isPaid ? "Paid Event" : "Free Event"}
              </span>
            )}
          </div>
        </div>

        <h3 className="cardTitle2">{event?.title}</h3>

        <div className="meta2">
          <div className="metaRow2">
            <span className="ico2">📅</span>
            <span>{dateText}</span>
            <span className="ico2 time">🕒</span>
            <span>{timeText}</span>
          </div>

          <div className="metaRow2">
            <span className="ico2">🏷️</span>
            <span className="metaLoc2">{categoryText}</span>
          </div>

          <div className="metaRow2">
            <span className="ico2">📍</span>
            <span className="metaLoc2">{event?.venue}</span>

            {capacity !== null ? (
              <span className="metaLoc2 seatText2">
                • Seats: {seatsLeft !== null ? seatsLeft : "-"} / {capacity}
              </span>
            ) : (
              <span className="metaLoc2 seatText2">• Seats: Unlimited</span>
            )}

            <span className={`priceTag2 ${isPaid ? "paid" : "free"}`}>
              {isPaid ? `₹${amount.toFixed(0)}` : "Free"}
            </span>
          </div>

          {event?.description ? <p className="desc2">{event.description}</p> : null}
        </div>

        <button
          className={`btn2 ${isPaid ? "paid" : "free"}`}
          type="button"
          onClick={openModal}
          disabled={isFull}
          style={isFull ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
        >
          {isFull
            ? "Event Full"
            : isPaid
            ? `Register Now - ₹${amount.toFixed(0)}`
            : "Register Now - Free"}
          <span className="arr2">→</span>
        </button>
      </article>

      {open && (
        <div className="evModalBack" onClick={closeModal}>
          <div className="evModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="evModalHead">
              <div className="evModalTitle">Event Registration</div>
              <button className="evModalClose" type="button" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="evInfo">
              <div className="evInfoRow">
                <div className="evInfoBox">
                  <div className="evInfoLabel">Date</div>
                  <div className="evInfoValue">{dateText}</div>
                </div>
                <div className="evInfoBox">
                  <div className="evInfoLabel">Time</div>
                  <div className="evInfoValue">{timeText}</div>
                </div>
              </div>

              <div className="evInfoRow">
                <div className="evInfoBox">
                  <div className="evInfoLabel">Venue</div>
                  <div className="evInfoValue">{event?.venue || "-"}</div>
                </div>
                <div className="evInfoBox">
                  <div className="evInfoLabel">Category</div>
                  <div className="evInfoValue">{categoryText}</div>
                </div>
              </div>

              <div className="evInfoRow">
                <div className="evInfoBox">
                  <div className="evInfoLabel">Type</div>
                  <div className={`evTypeBadge ${isPaid ? "paid" : "free"}`}>
                    {isPaid ? `Paid • ₹${amount.toFixed(0)}` : "Free"}
                  </div>
                </div>
                <div className="evInfoBox">
                  <div className="evInfoLabel">Status</div>
                  <div className={`evTypeBadge ${statusBadge.cls}`}>{statusBadge.text}</div>
                </div>
              </div>
            </div>

            {err ? <div className="evErr">{err}</div> : null}

            {step === 1 && (
              <div className="evBody">
                <div className="evFormGrid">
                  <div className="evField">
                    <label>Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div className="evField">
                    <label>Reg No</label>
                    <input
                      value={form.regno}
                      onChange={(e) => setForm((f) => ({ ...f, regno: e.target.value }))}
                    />
                  </div>

                  <div className="evField">
                    <label>Email</label>
                    <input
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div className="evField">
                    <label>Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div className="evField">
                    <label>Branch</label>
                    <select
                      value={form.branch}
                      onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                    >
                      <option value="">Select branch</option>
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="evField">
                    <label>Year</label>
                    <select
                      value={form.year}
                      onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                    >
                      <option value="">Select year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                </div>

                <div className="evActions">
                  <button className="evGhost" type="button" onClick={closeModal}>
                    Cancel
                  </button>

                  {!isPaid ? (
                    <button className="evAction free" type="button" onClick={registerFree} disabled={submitting}>
                      {submitting ? "Registering..." : "Register"}
                    </button>
                  ) : (
                    <button className="evAction paid" type="button" onClick={paidNext} disabled={submitting}>
                      Next
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="evBody">
                <div className="evPayBox">
                  <div className="evPayTitle">Pay with Razorpay</div>

                  <div className="evPayRow">
                    <span>Amount</span>
                    <b>₹{amount.toFixed(0)}</b>
                  </div>

                  <div className="evPayNote">
                    Click <b>Pay Now</b> to complete payment. After successful payment,
                    registration will be completed instantly ✅
                  </div>
                </div>

                <div className="evActions">
                  <button className="evGhost" type="button" onClick={() => setStep(1)} disabled={submitting}>
                    Back
                  </button>

                  <button className="evAction paid" type="button" onClick={paidConfirm} disabled={submitting}>
                    {submitting ? "Opening..." : "Pay Now"}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
  <div className="evBody">
    <div className={`evSuccess ${isPaid ? "paid" : "free"}`}>
      ✅ Registration Successful!
      <div className="evSuccessSmall">See you at the event 🎉</div>
    </div>

    <div className="evActions">
      <button
        className={`evAction ${isPaid ? "paid" : "free"}`}
        type="button"
        onClick={closeModal}
      >
        Close
      </button>
    </div>
  </div>
)}
          </div>
        </div>
      )}
    </>
  );
}