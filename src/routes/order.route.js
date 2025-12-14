const express = require('express');
const router = express.Router();

const Order = require('../Models/order.model');
const User = require('../Models/user.model');
const Menu = require('../Models/menu.model');
const { getOrdersSummary, getProviderOrdersSummary } = require('../controllers/orders');

// POST: Place order (Student)
router.post('/', async (req, res) => {
  try {
    const { userId, menuId, items } = req.body;

    // 1. basic validation
    if (!userId || !menuId || !items || !items.length) {
      return res.status(400).json({
        message: 'userId, menuId and items are required'
      });
    }

    // 2. validate user
    const user = await User.findById(userId);
    if (!user || user.role !== 'user') {
      return res.status(403).json({
        message: 'Only students can place orders'
      });
    }

    // 3. get menu
    const menu = await Menu.findById(menuId);
    if (!menu) {
      return res.status(404).json({
        message: 'Menu not found'
      });
    }

    const orderItems = [];
    let grandTotal = 0;

    // 4. validate items & calculate prices
    for (const item of items) {
      const { mealType, sabji, quantity } = item;

      if (!['full', 'half', 'riceOnly'].includes(mealType)) {
        return res.status(400).json({ message: 'Invalid meal type' });
      }

      if (mealType !== 'riceOnly') {
        if (!sabji || !menu.sabjis.includes(sabji)) {
          return res.status(400).json({
            message: `Invalid sabji: ${sabji}`
          });
        }
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          message: 'Quantity must be at least 1'
        });
      }

      const pricePerUnit = menu.prices[mealType];
      const totalPrice = pricePerUnit * quantity;

      grandTotal += totalPrice;

      orderItems.push({
        mealType,
        sabji: mealType === 'riceOnly' ? undefined : sabji,
        quantity,
        pricePerUnit,
        totalPrice
      });
    }

    // 5. create order
    const order = await Order.create({
      userId,
      providerId: menu.providerId,
      menuId,
      items: orderItems,
      grandTotal
    });

    res.status(201).json({
      message: 'Order placed successfully',
      order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: 'userId is required'
      });
    }

    // Build query
    let query = { userId };

    // If date range is provided, filter by orderDate
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.orderDate = {
        $gte: start,
        $lte: end
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(startDate);
      end.setHours(23, 59, 59, 999);

      query.orderDate = {
        $gte: start,
        $lte: end
      };
    }

    // fetch orders for this student
    const orders = await Order.find(query)
      .populate('providerId', 'name mobile')
      .populate('menuId', 'date')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: orders.length,
      orders
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET: Orders summary (all orders)
// Usage: GET /api/orders/summary?date=2025-12-14
router.get('/summary/all', getOrdersSummary);

// GET: Orders summary for a specific provider
// Usage: GET /api/orders/summary/provider?providerId=xxx&date=2025-12-14
router.get('/summary/provider', getProviderOrdersSummary);

router.get("/count", async (req, res) => {})

module.exports = router;
