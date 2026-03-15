const db = require("../config/db");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Food stall time control (8 AM – 10 PM)
function isFoodTimeOpen() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 8 && hour < 22;
}

// ✅ Block order APIs outside food hours
function ensureFoodTime(res) {
  if (!isFoodTimeOpen()) {
    res.status(403).json({
      ok: false,
      message: "Food stalls accept orders only from 8:00 AM to 10:00 PM.",
    });
    return false;
  }
  return true;
}

// ✅ GET /api/food/stalls
exports.listStalls = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
          s.id,
          s.category_id,
          s.name,
          s.description,
          s.rating,
          s.eta_mins,
          s.is_open,
          c.name AS category_name,
          COUNT(fi.id) AS items_count
       FROM food_stalls s
       LEFT JOIN food_categories c ON c.id = s.category_id
       LEFT JOIN food_items fi ON fi.stall_id = s.id
       GROUP BY 
          s.id, s.category_id, s.name, s.description, s.rating,
          s.eta_mins, s.is_open, c.name
       ORDER BY s.name ASC`
    );

    const openNow = isFoodTimeOpen();

    const updated = rows.map((stall) => ({
      ...stall,
      is_open: openNow ? 1 : 0,
    }));

    return res.json({ ok: true, data: updated });
  } catch (err) {
    console.error("listStalls error:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Failed to load stalls" });
  }
};

// ✅ GET /api/food/stalls/:stallId/items
exports.listItemsByStall = async (req, res) => {
  try {
    const stallId = Number(req.params.stallId);

    if (!stallId) {
      return res.status(400).json({ ok: false, message: "Invalid stallId" });
    }

    const [rows] = await db.query(
      `SELECT id, stall_id, name, price, is_veg, is_available
       FROM food_items
       WHERE stall_id = ?
       ORDER BY is_available DESC, name ASC`,
      [stallId]
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("listItemsByStall error:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Failed to load items" });
  }
};

// ============================
// ✅ Shared helper
// ============================
async function computeOrderTotal(conn, items) {
  const ids = items.map((x) => Number(x.food_item_id));
  if (!ids.length) throw new Error("No items");

  const [dbItems] = await conn.query(
    `SELECT id, name, price, is_available
     FROM food_items
     WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids
  );

  const itemMap = new Map(dbItems.map((x) => [x.id, x]));

  let total = 0;
  for (const it of items) {
    const row = itemMap.get(Number(it.food_item_id));
    if (!row) throw new Error("Item not found");
    if (!row.is_available) throw new Error(`${row.name} is sold out`);
    total += Number(row.price) * Number(it.qty);
  }

  return { total, itemMap };
}

// =====================================================
// ✅ CASH ORDER
// POST /api/food/orders
// =====================================================
exports.createOrder = async (req, res) => {
  if (!ensureFoodTime(res)) return;

  const conn = await db.getConnection();
  try {
    const userId = req.user.id;
    const { stall_id, items, notes } = req.body;

    const stallId = Number(stall_id);
    if (!stallId) {
      return res.status(400).json({ ok: false, message: "stall_id required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "items required" });
    }

    for (const it of items) {
      if (!it.food_item_id || Number(it.qty) <= 0) {
        return res
          .status(400)
          .json({ ok: false, message: "Invalid items payload" });
      }
    }

    await conn.beginTransaction();

    const { total, itemMap } = await computeOrderTotal(conn, items);

    const [orderResult] = await conn.query(
      `INSERT INTO food_orders (user_id, stall_id, total_amount, status, notes, payment_method, is_paid)
       VALUES (?, ?, ?, 'PLACED', ?, 'CASH', 0)`,
      [userId, stallId, total, notes || null]
    );

    const orderId = orderResult.insertId;

    for (const it of items) {
      const row = itemMap.get(Number(it.food_item_id));
      await conn.query(
        `INSERT INTO food_order_items (order_id, food_item_id, qty, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, Number(it.food_item_id), Number(it.qty), Number(row.price)]
      );
    }

    await conn.commit();

    return res.status(201).json({
      ok: true,
      data: {
        id: orderId,
        total_amount: total,
        status: "PLACED",
        payment_method: "CASH",
        is_paid: 0,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("createOrder error:", err);
    return res.status(500).json({
      ok: false,
      message: err?.message || "Failed to place order",
    });
  } finally {
    conn.release();
  }
};

// =====================================================
// ✅ RAZORPAY: Create Order
// =====================================================
exports.createFoodRazorpayOrder = async (req, res) => {
  if (!ensureFoodTime(res)) return;

  const conn = await db.getConnection();
  try {
    const userId = req.user.id;
    const { stall_id, items, notes } = req.body;

    const stallId = Number(stall_id);
    if (!stallId) {
      return res.status(400).json({ ok: false, message: "stall_id required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "items required" });
    }

    for (const it of items) {
      if (!it.food_item_id || Number(it.qty) <= 0) {
        return res
          .status(400)
          .json({ ok: false, message: "Invalid items payload" });
      }
    }

    await conn.beginTransaction();

    const { total, itemMap } = await computeOrderTotal(conn, items);

    const [orderResult] = await conn.query(
      `INSERT INTO food_orders (user_id, stall_id, total_amount, status, notes, payment_method, is_paid)
       VALUES (?, ?, ?, 'PENDING_PAYMENT', ?, 'RAZORPAY', 0)`,
      [userId, stallId, total, notes || null]
    );

    const orderId = orderResult.insertId;

    for (const it of items) {
      const row = itemMap.get(Number(it.food_item_id));
      await conn.query(
        `INSERT INTO food_order_items (order_id, food_item_id, qty, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, Number(it.food_item_id), Number(it.qty), Number(row.price)]
      );
    }

    const rpOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt: `food_${orderId}`,
      notes: {
        foodOrderId: String(orderId),
        userId: String(userId),
        stallId: String(stallId),
      },
    });

    await conn.query(
      `UPDATE food_orders SET razorpay_order_id=? WHERE id=?`,
      [rpOrder.id, orderId]
    );

    await conn.commit();

    return res.json({
      ok: true,
      data: {
        foodOrderId: orderId,
        razorpayOrderId: rpOrder.id,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("createFoodRazorpayOrder error:", err);
    return res.status(500).json({
      ok: false,
      message: err?.message || "Failed to create Razorpay order",
    });
  } finally {
    conn.release();
  }
};

// =====================================================
// ✅ RAZORPAY: Verify Payment
// =====================================================
exports.verifyFoodRazorpayPayment = async (req, res) => {
  const {
    foodOrderId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (
    !foodOrderId ||
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    return res.status(400).json({ ok: false, message: "Missing fields" });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return res
      .status(400)
      .json({ ok: false, message: "Payment verification failed" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, status, is_paid, razorpay_order_id
       FROM food_orders
       WHERE id=? FOR UPDATE`,
      [foodOrderId]
    );

    if (!rows.length) {
      await conn.rollback();
      return res
        .status(404)
        .json({ ok: false, message: "Food order not found" });
    }

    const o = rows[0];

    if (String(o.status) === "CANCELLED") {
      await conn.rollback();
      return res
        .status(409)
        .json({ ok: false, message: "Order already cancelled" });
    }

    if (Number(o.is_paid) === 1) {
      await conn.commit();
      return res.json({ ok: true, message: "Already paid ✅", foodOrderId });
    }

    if (
      o.razorpay_order_id &&
      String(o.razorpay_order_id) !== String(razorpay_order_id)
    ) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "Order mismatch" });
    }

    await conn.query(
      `UPDATE food_orders
       SET is_paid=1,
           status='PLACED',
           razorpay_order_id=?,
           razorpay_payment_id=?,
           razorpay_signature=?
       WHERE id=?`,
      [
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        foodOrderId,
      ]
    );

    await conn.commit();
    return res.json({
      ok: true,
      message: "Payment verified ✅ Order placed",
      foodOrderId,
    });
  } catch (err) {
    await conn.rollback();
    console.error("verifyFoodRazorpayPayment error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  } finally {
    conn.release();
  }
};

// =====================================================
// ✅ RAZORPAY: Cancel Payment
// =====================================================
exports.cancelFoodRazorpayPayment = async (req, res) => {
  const { foodOrderId } = req.body;

  if (!foodOrderId) {
    return res
      .status(400)
      .json({ ok: false, message: "foodOrderId required" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, is_paid, status
       FROM food_orders
       WHERE id=? FOR UPDATE`,
      [foodOrderId]
    );

    if (!rows.length) {
      await conn.rollback();
      return res
        .status(404)
        .json({ ok: false, message: "Food order not found" });
    }

    const o = rows[0];

    if (Number(o.is_paid) === 1) {
      await conn.commit();
      return res.json({
        ok: true,
        message: "Already paid; cannot cancel from modal",
      });
    }

    if (String(o.status) === "CANCELLED") {
      await conn.commit();
      return res.json({ ok: true, message: "Already cancelled" });
    }

    await conn.query(`UPDATE food_orders SET status='CANCELLED' WHERE id=?`, [
      foodOrderId,
    ]);

    await conn.commit();
    return res.json({
      ok: true,
      message: "Payment cancelled; order cancelled",
    });
  } catch (err) {
    await conn.rollback();
    console.error("cancelFoodRazorpayPayment error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  } finally {
    conn.release();
  }
};

// ✅ GET /api/food/orders/my
exports.myOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await db.query(
      `SELECT o.id, o.user_id, o.stall_id, o.total_amount, o.status, o.notes, o.created_at,
              o.payment_method, o.is_paid,
              o.razorpay_order_id, o.razorpay_payment_id,
              s.name AS stall_name
       FROM food_orders o
       JOIN food_stalls s ON s.id = o.stall_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [userId]
    );

    if (!orders.length) return res.json({ ok: true, data: [] });

    const orderIds = orders.map((o) => o.id);

    const [items] = await db.query(
      `SELECT oi.order_id, oi.food_item_id, oi.qty, oi.price,
              fi.name, fi.is_veg
       FROM food_order_items oi
       JOIN food_items fi ON fi.id = oi.food_item_id
       WHERE oi.order_id IN (${orderIds.map(() => "?").join(",")})
       ORDER BY oi.order_id DESC, oi.id ASC`,
      orderIds
    );

    const map = new Map();
    for (const o of orders) map.set(o.id, { ...o, items: [] });

    for (const it of items) {
      map.get(it.order_id)?.items.push({
        food_item_id: it.food_item_id,
        name: it.name,
        qty: it.qty,
        price: it.price,
        is_veg: it.is_veg,
      });
    }

    return res.json({ ok: true, data: Array.from(map.values()) });
  } catch (err) {
    console.error("myOrders error:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Failed to load orders" });
  }
};

// ✅ GET /api/food/orders/:id/receipt
exports.getFoodOrderReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = Number(req.params.id);

    if (!orderId) {
      return res.status(400).json({ ok: false, message: "Invalid order id" });
    }

    const [orders] = await db.query(
      `SELECT o.*,
              s.name AS stall_name
       FROM food_orders o
       JOIN food_stalls s ON s.id = o.stall_id
       WHERE o.id=? AND o.user_id=?
       LIMIT 1`,
      [orderId, userId]
    );

    if (!orders.length) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    const o = orders[0];

    const [items] = await db.query(
      `SELECT oi.qty, oi.price, fi.name
       FROM food_order_items oi
       JOIN food_items fi ON fi.id = oi.food_item_id
       WHERE oi.order_id=?
       ORDER BY oi.id ASC`,
      [orderId]
    );

    const subtotal = items.reduce(
      (sum, it) => sum + Number(it.price) * Number(it.qty),
      0
    );
    const tax = Number(o.tax_amount || 0);
    const tip = Number(o.tip_amount || 0);
    const total = Number(o.total_amount || subtotal + tax + tip);

    return res.json({
      ok: true,
      data: {
        order: {
          id: o.id,
          created_at: o.created_at,
          stall_name: o.stall_name,
          payment_method: o.payment_method,
          status: o.status,
          is_paid: o.is_paid,
          razorpay_order_id: o.razorpay_order_id,
          razorpay_payment_id: o.razorpay_payment_id,
        },
        items: items.map((x) => ({
          name: x.name,
          qty: x.qty,
          price: x.price,
          line_total: Number(x.price) * Number(x.qty),
        })),
        totals: { subtotal, tax, tip, total },
      },
    });
  } catch (e) {
    console.error("getFoodOrderReceipt error:", e);
    return res
      .status(500)
      .json({ ok: false, message: "Failed to load receipt" });
  }
};

// ✅ POST /api/food/orders/:id/cancel
exports.cancelMyFoodOrder = async (req, res) => {
  const orderId = Number(req.params.id);

  if (!orderId) {
    return res.status(400).json({ ok: false, message: "Invalid order id" });
  }

  const userId = req.user.id;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, status, is_paid, payment_method
       FROM food_orders
       WHERE id=? AND user_id=? FOR UPDATE`,
      [orderId, userId]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    const o = rows[0];
    const st = String(o.status || "").toUpperCase();

    if (["ACCEPTED", "READY", "COMPLETED"].includes(st)) {
      await conn.rollback();
      return res.status(409).json({
        ok: false,
        message: `Cannot cancel. Order is ${st}.`,
      });
    }

    if (st === "CANCELLED") {
      await conn.commit();
      return res.json({ ok: true, message: "Already cancelled" });
    }

    await conn.query(`UPDATE food_orders SET status='CANCELLED' WHERE id=?`, [
      orderId,
    ]);

    await conn.commit();

    return res.json({
      ok: true,
      message:
        Number(o.is_paid) === 1 &&
        String(o.payment_method || "").toUpperCase() === "RAZORPAY"
          ? "Order cancelled. Online payment done — refund can be handled separately."
          : "Order cancelled ✅",
    });
  } catch (e) {
    await conn.rollback();
    console.error("cancelMyFoodOrder error:", e);
    return res
      .status(500)
      .json({ ok: false, message: "Failed to cancel order" });
  } finally {
    conn.release();
  }
};