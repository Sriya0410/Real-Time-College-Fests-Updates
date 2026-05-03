import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "../../styles/foodStallsPage.css";

function isWithinFoodHours() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const currentMinutes = hour * 60 + minute;
  const openMinutes = 8 * 60;
  const closeMinutes = 22 * 60;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function getFoodHoursLabel() {
  return "8:00 AM - 10:00 PM";
}

export default function StudentFoodStalls() {
  const [stalls, setStalls] = useState([]);
  const [itemsByStall, setItemsByStall] = useState({});
  const [selected, setSelected] = useState(null);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("ALL");

  const [loadingStalls, setLoadingStalls] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [cart, setCart] = useState([]);

  // ✅ Only CASH and UPI
  const [payMode, setPayMode] = useState("CASH");

  // ✅ UPI demo modal states
  const [upiOpen, setUpiOpen] = useState(false);
  const [upiId, setUpiId] = useState("success@razorpay");
  const [upiProcessing, setUpiProcessing] = useState(false);

  const openNowByTime = isWithinFoodHours();

  useEffect(() => {
    loadStalls();
  }, []);

  const loadStalls = async () => {
    setLoadingStalls(true);
    setErr("");
    setMsg("");

    try {
      const res = await api.get("/food/stalls");
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setStalls(rows);

      if (selected) {
        const fresh = rows.find((x) => Number(x.id) === Number(selected.id));
        if (!fresh) {
          setSelected(null);
          setCart([]);
        } else {
          setSelected(fresh);
        }
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load stalls");
    } finally {
      setLoadingStalls(false);
    }
  };

  const loadItems = async (stallId) => {
    const key = String(stallId);

    if (Object.prototype.hasOwnProperty.call(itemsByStall, key)) return;

    setLoadingItems(true);
    setErr("");
    setMsg("");

    try {
      const res = await api.get(`/food/stalls/${stallId}/items`);
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];

      setItemsByStall((prev) => ({
        ...prev,
        [key]: rows,
      }));
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set(stalls.map((s) => s.category_name || "Other"));
    return ["ALL", ...Array.from(set)];
  }, [stalls]);

  const filteredStalls = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return stalls.filter((s) => {
      const name = String(s.name || "").toLowerCase();
      const matchQ = !qq || name.includes(qq);
      const matchCat = cat === "ALL" || (s.category_name || "Other") === cat;
      return matchQ && matchCat;
    });
  }, [stalls, q, cat]);

  const items = selected ? itemsByStall[String(selected.id)] || [] : [];

  const addToCart = (item) => {
    setMsg("");
    setErr("");

    setCart((prev) => {
      const idx = prev.findIndex((x) => Number(x.item.id) === Number(item.id));

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          qty: copy[idx].qty + 1,
        };
        return copy;
      }

      return [...prev, { item, qty: 1 }];
    });
  };

  const decCart = (itemId) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => Number(x.item.id) === Number(itemId));
      if (idx < 0) return prev;

      const copy = [...prev];
      const nextQty = copy[idx].qty - 1;

      if (nextQty <= 0) {
        copy.splice(idx, 1);
      } else {
        copy[idx] = {
          ...copy[idx],
          qty: nextQty,
        };
      }

      return copy;
    });
  };

  const incCart = (itemId) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => Number(x.item.id) === Number(itemId));
      if (idx < 0) return prev;

      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        qty: copy[idx].qty + 1,
      };

      return copy;
    });
  };

  const total = useMemo(() => {
    return cart.reduce(
      (sum, x) => sum + Number(x.item.price || 0) * Number(x.qty || 0),
      0
    );
  }, [cart]);

  const validateOrder = () => {
    if (!openNowByTime) {
      setMsg("Food stalls accept orders only between 8:00 AM and 10:00 PM.");
      return false;
    }

    if (!selected) {
      setMsg("Select a stall first.");
      return false;
    }

    if (!cart.length) {
      setMsg("Cart is empty.");
      return false;
    }

    return true;
  };

  const placeOrder = async () => {
    if (!validateOrder()) return;

    setMsg("");
    setErr("");

    try {
      if (payMode === "CASH") {
        await api.post("/food/orders", {
          stall_id: selected.id,
          items: cart.map((x) => ({
            food_item_id: x.item.id,
            qty: x.qty,
          })),
        });

        setMsg("Order placed ✅ Payment: CASH (Pay at stall counter).");
        setCart([]);
        return;
      }

      // ✅ UPI selected: open custom UPI modal
      setUpiId("success@razorpay");
      setUpiProcessing(false);
      setUpiOpen(true);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Order failed");
    }
  };

  const confirmUpiPayment = async () => {
    if (!selected) return setErr("Select a stall first.");
    if (!cart.length) return setErr("Cart is empty.");

    if (!upiId.trim()) {
      return setErr("Enter UPI ID.");
    }

    if (upiId.trim().toLowerCase() !== "success@razorpay") {
      return setErr("Use demo UPI ID: success@razorpay");
    }

    setErr("");
    setMsg("");
    setUpiProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const res = await api.post("/food/orders/upi/fake-confirm", {
        stall_id: selected.id,
        items: cart.map((x) => ({
          food_item_id: x.item.id,
          qty: x.qty,
        })),
        upiId: upiId.trim(),
      });

      if (!res.data?.ok) {
        throw new Error(res.data?.message || "Payment failed");
      }

      setUpiProcessing(false);
      setUpiOpen(false);
      setCart([]);
      setMsg("Payment success ✅ Food order placed!");
    } catch (e) {
      setUpiProcessing(false);
      setErr(e?.response?.data?.message || e?.message || "Payment failed");
    }
  };

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Food Stalls</h1>
        <div className="muted2">Timings: {getFoodHoursLabel()}</div>
      </div>

      {err && <div className="foodMsg error">{err}</div>}

      {msg && (
        <div className="foodMsg">
          {msg}
          {msg.toLowerCase().includes("order") && (
            <div style={{ marginTop: 8 }}>
              <a className="btnSmall2" href="/student/food/orders">
                View My Orders
              </a>
            </div>
          )}
        </div>
      )}

      <div className="card foodFilters">
        <input
          className="foodSearch"
          placeholder="Search stalls..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="foodSelect"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button className="btnSmall2" type="button" onClick={loadStalls}>
          Refresh
        </button>
      </div>

      <div className="stallSection">
        {loadingStalls && <div className="card">Loading stalls...</div>}

        {!loadingStalls && !filteredStalls.length && (
          <div className="card">No stalls found.</div>
        )}

        <div className="stallGrid5">
          {filteredStalls.map((s) => {
            const hasMenu = Number(s.items_count || 0) > 0;
            const isOpenNow = Boolean(Number(s.is_open) === 1 && openNowByTime);

            return (
              <button
                key={s.id}
                type="button"
                className={`stallTile ${
                  selected?.id === s.id ? "active" : ""
                } ${!hasMenu ? "disabledTile" : ""}`}
                onClick={() => {
                  if (!hasMenu) {
                    setSelected(null);
                    setCart([]);
                    setMsg("");
                    setErr(`${s.name} has no menu items in database.`);
                    return;
                  }

                  setErr("");
                  setMsg("");
                  setSelected(s);
                  setCart([]);
                  loadItems(s.id);
                }}
              >
                <div className="stallTileTop">
                  <div className="stallTileName">{s.name}</div>

                  <span className={`stallBadge ${isOpenNow ? "open" : "closed"}`}>
                    {isOpenNow ? "OPEN" : "CLOSED"}
                  </span>
                </div>

                <div className="stallTileDesc">{s.description || "—"}</div>

                <div className="stallTileMeta">
                  <span>{s.category_name || "Other"}</span>
                  <span className="dot" />
                  <span>ETA {s.eta_mins ?? "-"}m</span>
                  <span className="dot" />
                  <span>⭐ {s.rating ?? "-"}</span>
                </div>

                <div className="stallTileMeta" style={{ marginTop: 10 }}>
                  <span>{hasMenu ? `Menu items: ${s.items_count}` : "No menu items"}</span>
                  <span className="dot" />
                  <span>{getFoodHoursLabel()}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="itemsSection">
          <div className="itemsHeader">
            <div>
              <h2 className="itemsTitle">{selected.name} - Menu</h2>

              <div className="muted2">
                {selected.category_name} • ETA {selected.eta_mins} min • Timings:{" "}
                {getFoodHoursLabel()}
              </div>
            </div>

            <button
              className="btnSmall2"
              type="button"
              onClick={() => {
                setSelected(null);
                setCart([]);
              }}
            >
              Close
            </button>
          </div>

          {loadingItems && <div className="card">Loading items...</div>}

          {!loadingItems && (
            <div className="menuGrid5">
              {items.map((it) => (
                <div
                  key={it.id}
                  className={`menuTile ${!it.is_available ? "sold" : ""}`}
                >
                  <div className="menuTileTop">
                    <div className="menuTileName">{it.name}</div>
                    <span className={`vegDot ${it.is_veg ? "veg" : "nonveg"}`} />
                  </div>

                  <div className="menuTilePrice">
                    ₹{Number(it.price).toFixed(0)}
                  </div>

                  <button
                    className="addBtn"
                    type="button"
                    onClick={() => addToCart(it)}
                    disabled={!it.is_available || !openNowByTime}
                  >
                    {!openNowByTime
                      ? "Closed"
                      : it.is_available
                      ? "Add"
                      : "Sold out"}
                  </button>
                </div>
              ))}

              {!items.length && (
                <div className="card">No items found for this stall.</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card cartCard2">
        <div className="cartHeader">
          <h3 style={{ margin: 0 }}>Cart</h3>
          <span className="muted2">{cart.length} items</span>
        </div>

        {!cart.length ? (
          <div className="muted2">Add items to cart.</div>
        ) : (
          <div className="cartList">
            {cart.map((x) => (
              <div key={x.item.id} className="cartRow">
                <div className="cartLeft">
                  <div className="cartName">{x.item.name}</div>
                  <div className="muted2">₹{Number(x.item.price).toFixed(0)}</div>
                </div>

                <div className="qtyRow">
                  <button
                    className="qtyBtn"
                    type="button"
                    onClick={() => decCart(x.item.id)}
                    disabled={!openNowByTime}
                  >
                    −
                  </button>

                  <div className="qty">{x.qty}</div>

                  <button
                    className="qtyBtn"
                    type="button"
                    onClick={() => incCart(x.item.id)}
                    disabled={!openNowByTime}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="cartTotalRow">
          <span className="muted2">Total</span>
          <span className="cartTotal">₹{total.toFixed(0)}</span>
        </div>

        <div className="paymentBox">
          <div className="paymentBoxTop">
            <div>
              <div className="paymentTitle">Choose Payment Method</div>
              <div className="paymentSub">
                Select how you want to complete this food order
              </div>
            </div>
          </div>

          <div className="paymentModeGrid">
            <button
              type="button"
              className={`payModeCard ${payMode === "CASH" ? "active" : ""}`}
              onClick={() => setPayMode("CASH")}
            >
              <div className="payModeHead">
                <span className="payModeIcon">💵</span>
                <span className="payModeName">Cash</span>
              </div>

              <div className="payModeDesc">Pay directly at the stall counter</div>
            </button>

            <button
              type="button"
              className={`payModeCard ${payMode === "UPI" ? "active" : ""}`}
              onClick={() => setPayMode("UPI")}
            >
              <div className="payModeHead">
                <span className="payModeIcon">📱</span>
                <span className="payModeName">UPI</span>
              </div>

              <div className="payModeDesc">Pay using demo UPI ID</div>
            </button>
          </div>

          <button
            className="primaryOrderBtn paymentOrderBtn"
            type="button"
            onClick={placeOrder}
            disabled={!cart.length || !openNowByTime}
          >
            {!openNowByTime
              ? "Orders Closed"
              : payMode === "CASH"
              ? "Place Order (Cash)"
              : "Pay Using UPI"}
          </button>
        </div>

        {!openNowByTime && (
          <div className="foodMsg error" style={{ marginTop: 12 }}>
            Food stall orders are available only from 8:00 AM to 10:00 PM.
          </div>
        )}
      </div>

      {upiOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 18,
          }}
          onClick={() => {
            if (!upiProcessing) setUpiOpen(false);
          }}
        >
          <div
            style={{
              width: "min(460px, 96vw)",
              borderRadius: 24,
              background: "linear-gradient(180deg, #ffffff, #f8fafc)",
              boxShadow: "0 24px 70px rgba(15,23,42,0.28)",
              padding: 22,
              color: "#0f172a",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>Pay Using UPI</div>
                <div style={{ color: "#64748b", fontWeight: 700, marginTop: 4 }}>
                  Razorpay-style demo payment
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUpiOpen(false)}
                disabled={upiProcessing}
                style={{
                  border: 0,
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  fontWeight: 900,
                  cursor: upiProcessing ? "not-allowed" : "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                padding: "14px 16px",
                borderRadius: 18,
                background: "rgba(109, 93, 252, 0.08)",
                marginBottom: 16,
              }}
            >
              <div style={{ color: "#64748b", fontWeight: 800 }}>Food Stall</div>
              <div style={{ fontWeight: 900, marginTop: 4 }}>
                {selected?.name || "Selected Stall"}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 900,
                }}
              >
                <span>Total Amount</span>
                <span>₹{total.toFixed(0)}</span>
              </div>
            </div>

            {!upiProcessing ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label
                    style={{
                      display: "block",
                      fontWeight: 900,
                      marginBottom: 8,
                    }}
                  >
                    UPI ID
                  </label>

                  <input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="success@razorpay"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      border: "1px solid rgba(100,116,139,0.25)",
                      borderRadius: 16,
                      padding: "14px 16px",
                      fontSize: 16,
                      fontWeight: 900,
                      outline: "none",
                    }}
                  />
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 16,
                    background: "rgba(255, 0, 128, 0.08)",
                    fontWeight: 800,
                    lineHeight: 1.5,
                    marginBottom: 18,
                  }}
                >
                  Demo UPI ID: <b>success@razorpay</b>
                </div>
              </>
            ) : (
              <div
                style={{
                  marginTop: 18,
                  marginBottom: 18,
                  padding: "28px 18px",
                  borderRadius: 18,
                  textAlign: "center",
                  background: "rgba(109, 93, 252, 0.08)",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    border: "5px solid rgba(109, 93, 252, 0.2)",
                    borderTop: "5px solid #6d5dfc",
                    borderRadius: "50%",
                    margin: "0 auto 14px",
                    animation: "spinFoodPay 0.9s linear infinite",
                  }}
                />

                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  Processing Payment...
                </div>

                <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
                  Please wait while we place your food order.
                </div>

                <style>
                  {`
                    @keyframes spinFoodPay {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                  `}
                </style>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setUpiOpen(false)}
                disabled={upiProcessing}
                style={{
                  border: 0,
                  borderRadius: 14,
                  padding: "12px 16px",
                  fontWeight: 900,
                  cursor: upiProcessing ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmUpiPayment}
                disabled={upiProcessing}
                style={{
                  border: 0,
                  borderRadius: 14,
                  padding: "12px 18px",
                  fontWeight: 900,
                  color: "white",
                  background: "linear-gradient(135deg, #6d5dfc, #ec4899)",
                  cursor: upiProcessing ? "not-allowed" : "pointer",
                }}
              >
                {upiProcessing ? "Processing..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}