const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../Models/order.model');

/* =========================
   Helper: Date Range Builder
========================= */
function buildDateRange({ startDate, endDate, month, year }) {
  if (month != null) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = parseInt(month) - 1;
    const start = new Date(y, m, 1, 0, 0, 0, 0);
    const end = new Date(y, m + 1, 1, 0, 0, 0, 0);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
  }

  if (startDate || endDate) {
    return {
      start: startDate ? new Date(`${startDate}T00:00:00`) : null,
      end: endDate ? new Date(`${endDate}T23:59:59.999`) : null
    };
  }

  return null;
}

/* =========================
   BASE MATCH (NO STATUS, NO MENU)
========================= */
function baseMatch(providerId, range) {
  const match = {
    providerId: new mongoose.Types.ObjectId(providerId)
  };

  if (range?.start || range?.end) {
    match.orderDate = {};
    if (range.start) match.orderDate.$gte = range.start;
    if (range.end) match.orderDate.$lte = range.end;
  }

  return match;
}

/* =========================
   1️⃣ Monthly Revenue
========================= */
router.get('/monthly-revenue', async (req, res) => {
  try {
    const { providerId, year } = req.query;
    if (!providerId) return res.status(400).json({ message: 'providerId required' });

    const y = year ? Number(year) : new Date().getFullYear();
    const range = {
      start: new Date(y, 0, 1),
      end: new Date(y + 1, 0, 1)
    };

    const data = await Order.aggregate([
      { $match: baseMatch(providerId, range) },
      {
        $group: {
          _id: { $month: '$orderDate' },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 }
        }
      },
      { $project: { _id: 0, month: '$_id', revenue: 1, orders: 1 } },
      { $sort: { month: 1 } }
    ]);

    res.json({ success: true, year: y, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   2️⃣ Overall Summary
========================= */
router.get('/overall-summary', async (req, res) => {
  try {
    const { providerId } = req.query;
    if (!providerId) return res.status(400).json({ message: 'providerId required' });

    const [stats] = await Order.aggregate([
      { $match: baseMatch(providerId) },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grandTotal' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue: stats?.totalRevenue || 0,
        totalOrders: stats?.totalOrders || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   3️⃣ Month-on-Month Growth
========================= */
router.get('/growth-rate', async (req, res) => {
  try {
    const { providerId } = req.query;
    if (!providerId) {
      return res.status(400).json({ message: 'providerId required' });
    }

    const now = new Date();

    // Current month start
    const currStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Previous month start
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const sumRevenue = async (start, end) => {
      const [result] = await Order.aggregate([
        { $match: baseMatch(providerId, { start, end }) },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$grandTotal' }
          }
        }
      ]);

      return result?.revenue || 0;
    };

    const currentRevenue = await sumRevenue(currStart, now);
    const previousRevenue = await sumRevenue(prevStart, currStart);

    let growthPercent;

    // 🔥 Correct growth logic
    if (previousRevenue <= 1) {
      // No meaningful base → treat growth as absolute value
      growthPercent = currentRevenue;
    } else {
      growthPercent =
        ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    }

    res.json({
      success: true,
      data: {
        previousRevenue,
        currentRevenue,
        growthPercent: Number(growthPercent.toFixed(2))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


/* =========================
   4️⃣ Best Sellers
========================= */
router.get('/best-sellers', async (req, res) => {
  try {
    const { providerId, limit = 5 } = req.query;
    if (!providerId) return res.status(400).json({ message: 'providerId required' });

    const data = await Order.aggregate([
      { $match: baseMatch(providerId) },
      { $unwind: '$items' },
      {
        $group: {
          _id: { mealType: '$items.mealType', sabji: '$items.sabji' },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: Number(limit) }
    ]);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   5️⃣ Daily Revenue Trend
========================= */
router.get('/daily-revenue-trend', async (req, res) => {
  try {
    const { providerId, month, year } = req.query;
    if (!providerId) return res.status(400).json({ message: 'providerId required' });

    const range = buildDateRange({ month, year });
    const data = await Order.aggregate([
      { $match: baseMatch(providerId, range) },
      {
        $group: {
          _id: { $dayOfMonth: '$orderDate' },
          revenue: { $sum: '$grandTotal' }
        }
      },
      { $project: { _id: 0, day: '$_id', revenue: 1 } },
      { $sort: { day: 1 } }
    ]);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* =========================
   6️⃣ Average Order Value
========================= */
router.get('/avg-order-value', async (req, res) => {
  try {
    const { providerId, startDate, endDate } = req.query;
    if (!providerId) return res.status(400).json({ message: 'providerId required' });

    const range = buildDateRange({ startDate, endDate });

    const [r] = await Order.aggregate([
      { $match: baseMatch(providerId, range) },
      {
        $group: {
          _id: null,
          avgOrderValue: { $avg: '$grandTotal' },
          totalRevenue: { $sum: '$grandTotal' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        avgOrderValue: r?.avgOrderValue || 0,
        totalRevenue: r?.totalRevenue || 0,
        totalOrders: r?.totalOrders || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
