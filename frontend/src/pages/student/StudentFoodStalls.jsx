import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "../../styles/foodStallsPage.css";

function isWithinFoodHours() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  const currentMinutes = hour * 60 + minute;
  const openMinutes = 8 * 60;      // 08:00 AM
  const closeMinutes = 22 * 60;    // 10:00 PM

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

  const [cart, setCart] = useState([]);
  const [msg, setMsg] = useState("");
  const [payMode, setPayMode] = useState("CASH");

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
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
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

      if (nextQty <= 0) copy.splice(idx, 1);
      else copy[idx] = { ...copy[idx], qty: nextQty };

      return copy;
    });
  };

  const incCart = (itemId) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => Number(x.item.id) === Number(itemId));
      if (idx < 0) return prev;

      const copy = [...prev];
      copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
      return copy;
    });
  };

  const total = useMemo(() => {
    return cart.reduce((sum, x) => sum + Number(x.item.price || 0) * x.qty, 0);
  }, [cart]);

  const placeOrder = async () => {
    if (!openNowByTime) {
      return setMsg("Food stalls accept orders only between 8:00 AM and 10:00 PM.");
    }

    if (!selected) return setMsg("Select a stall first.");
    if (!cart.length) return setMsg("Cart is empty.");

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

      const orderRes = await api.post("/food/orders/razorpay/order", {
        stall_id: selected.id,
        items: cart.map((x) => ({
          food_item_id: x.item.id,
          qty: x.qty,
        })),
      });

      const d = orderRes.data?.data || {};
      const {
        foodOrderId,
        razorpayOrderId,
        amount,
        currency,
        razorpayKeyId,
      } = d;

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay SDK not loaded. Add checkout.js script in index.html."
        );
      }

      const options = {
        key: razorpayKeyId,
        amount,
        currency,
        name: "College Fest Food",
        description: `Food Order: ${selected?.name || "Stall"}`,
        order_id: razorpayOrderId,

        handler: async function (response) {
          try {
            await api.post("/food/orders/razorpay/verify", {
              foodOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setMsg("Payment success ✅ Order placed!");
            setCart([]);
          } catch (e) {
            setErr(e?.response?.data?.message || "Payment verify failed");
          }
        },

        modal: {
          ondismiss: async () => {
            try {
              await api.post("/food/orders/razorpay/cancel", { foodOrderId });
            } catch {}
            setErr("Payment cancelled. Order not placed.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Order failed");
    }
  };

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Food Stalls</h1>
        <div className="muted2">Timings: {getFoodHoursLabel()}</div>
      </div>

      {err && <div className="foodMsg error">{err}</div>}
      {msg && <div className="foodMsg">{msg}</div>}

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
                className={`stallTile ${selected?.id === s.id ? "active" : ""} ${
                  !hasMenu ? "disabledTile" : ""
                }`}
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
                {selected.category_name} • ETA {selected.eta_mins} min • Timings: {getFoodHoursLabel()}
              </div>
            </div>

            <button className="btnSmall2" onClick={() => setSelected(null)}>
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
                    <span
                      className={`vegDot ${it.is_veg ? "veg" : "nonveg"}`}
                    />
                  </div>

                  <div className="menuTilePrice">
                    ₹{Number(it.price).toFixed(0)}
                  </div>

                  <button
                    className="addBtn"
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
                  <div className="muted2">
                    ₹{Number(x.item.price).toFixed(0)}
                  </div>
                </div>

                <div className="qtyRow">
                  <button
                    className="qtyBtn"
                    onClick={() => decCart(x.item.id)}
                    disabled={!openNowByTime}
                  >
                    −
                  </button>
                  <div className="qty">{x.qty}</div>
                  <button
                    className="qtyBtn"
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
      className={`payModeCard ${payMode === "ONLINE" ? "active" : ""}`}
      onClick={() => setPayMode("ONLINE")}
    >
      <div className="payModeHead">
        <span className="payModeIcon">💳</span>
        <span className="payModeName">Razorpay</span>
      </div>
      <div className="payModeDesc">Pay online securely and place instantly</div>
    </button>
  </div>

  <button
    className="primaryOrderBtn paymentOrderBtn"
    onClick={placeOrder}
    disabled={!cart.length || !openNowByTime}
  >
    {!openNowByTime
      ? "Orders Closed"
      : payMode === "CASH"
      ? "Place Order (Cash)"
      : "Pay & Place Order (Online)"}
  </button>
</div>

        {!openNowByTime && (
          <div className="foodMsg error" style={{ marginTop: 12 }}>
            Food stall orders are available only from 8:00 AM to 10:00 PM.
          </div>
        )}

        {msg && (
          <div className="foodMsg">
            {msg}
            <div style={{ marginTop: 8 }}>
              <a className="btnSmall2" href="/student/food/orders">
                View My Orders
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}