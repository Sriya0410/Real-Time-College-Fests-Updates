const pool = require("../config/db");

// GET /api/admin/orders
exports.listOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.user_id, o.stall_id, o.total_amount, o.status, o.notes, o.created_at,
              o.payment_method, o.is_paid,
              s.name AS stall_name,
              u.full_name AS user_name
       FROM food_orders o
       JOIN food_stalls s ON s.id = o.stall_id
       LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC
       LIMIT 200`
    );

    if (!orders.length) return res.json({ ok: true, data: [] });

    const orderIds = orders.map((o) => o.id);

    const [items] = await pool.query(
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
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Failed to load orders" });
  }
};

// PATCH /api/admin/orders/:id/paid
exports.markPaid = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "Invalid order id" });

    await pool.query("UPDATE food_orders SET is_paid=1 WHERE id=?", [id]);

    return res.json({ ok: true, message: "Marked paid ✅" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Failed to mark paid" });
  }
};

// PATCH /api/admin/orders/:id/status  { status }
exports.updateStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const allowed = ["PLACED", "ACCEPTED", "READY", "COMPLETED", "CANCELLED"];
    const st = String(status || "").toUpperCase();

    if (!id) return res.status(400).json({ ok: false, message: "Invalid order id" });
    if (!allowed.includes(st)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    await pool.query("UPDATE food_orders SET status=? WHERE id=?", [st, id]);

    return res.json({ ok: true, message: "Status updated ✅" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, message: "Failed to update status" });
  }
};