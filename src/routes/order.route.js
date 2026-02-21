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

    // 3. get menu (must be active)
    const menu = await Menu.findOne({ _id: menuId, isActive: true });
    if (!menu) {
      return res.status(404).json({
        message: 'Menu not found or not active'
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

    // 5. create order with pending status
    const order = await Order.create({
      userId,
      providerId: menu.providerId,
      menuId,
      items: orderItems,
      grandTotal,
      status: 'pending'
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

    // Add canCancel field to each order
    const ordersWithCancelInfo = orders.map(order => {
      const orderObj = order.toObject();
      const orderCreatedAt = new Date(order.createdAt);
      const now = new Date();
      const timeDifference = (now - orderCreatedAt) / 1000 / 60; // difference in minutes
      
      orderObj.canCancel = order.status === 'pending' && timeDifference <= 10;
      orderObj.timeRemaining = order.status === 'pending' && timeDifference <= 10 
        ? Math.max(0, Math.round(10 - timeDifference)) 
        : 0;
      
      return orderObj;
    });

    res.status(200).json({
      count: ordersWithCancelInfo.length,
      orders: ordersWithCancelInfo
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT: Approve order (Provider)
router.put('/:orderId/approve', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { providerId } = req.body;

    if (!providerId) {
      return res.status(400).json({
        message: 'providerId is required'
      });
    }

    // Validate provider
    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res.status(403).json({
        message: 'Only providers can approve orders'
      });
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Check if provider owns this order
    if (String(order.providerId) !== String(providerId)) {
      return res.status(403).json({
        message: 'You can only approve your own orders'
      });
    }

    // Check if order can be approved
    if (order.status !== 'pending') {
      return res.status(400).json({
        message: `Order cannot be approved. Current status: ${order.status}`
      });
    }

    // Approve order
    order.status = 'approved';
    await order.save();

    // Populate before returning
    await order.populate('userId', 'name mobile');
    await order.populate('menuId', 'date');

    res.status(200).json({
      message: 'Order approved successfully',
      order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// PUT: Reject order (Provider)
router.put('/:orderId/reject', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { providerId } = req.body;

    if (!providerId) {
      return res.status(400).json({
        message: 'providerId is required'
      });
    }

    // Validate provider
    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'provider') {
      return res.status(403).json({
        message: 'Only providers can reject orders'
      });
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Check if provider owns this order
    if (String(order.providerId) !== String(providerId)) {
      return res.status(403).json({
        message: 'You can only reject your own orders'
      });
    }

    // Check if order can be rejected
    if (order.status !== 'pending') {
      return res.status(400).json({
        message: `Order cannot be rejected. Current status: ${order.status}`
      });
    }

    // Reject order
    order.status = 'rejected';
    await order.save();

    // Populate before returning
    await order.populate('userId', 'name mobile');
    await order.populate('menuId', 'date');

    res.status(200).json({
      message: 'Order rejected successfully',
      order
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// PUT: Cancel order (User) - Only within 10 minutes of order placement
router.put('/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: 'userId is required'
      });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user || user.role !== 'user') {
      return res.status(403).json({
        message: 'Only users can cancel orders'
      });
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (String(order.userId) !== String(userId)) {
      return res.status(403).json({
        message: 'You can only cancel your own orders'
      });
    }

    // Check if order can be cancelled
    if (order.status === 'rejected') {
      return res.status(400).json({
        message: 'Order is already rejected by provider'
      });
    }

    if (order.status === 'approved') {
      return res.status(400).json({
        message: 'Approved orders cannot be cancelled'
      });
    }

    // Check if order was placed within last 10 minutes
    const orderCreatedAt = new Date(order.createdAt);
    const now = new Date();
    const timeDifference = (now - orderCreatedAt) / 1000 / 60; // difference in minutes

    if (timeDifference > 10) {
      return res.status(400).json({
        message: 'Order can only be cancelled within 10 minutes of placement',
        timeElapsed: `${Math.round(timeDifference)} minutes`
      });
    }

    // Store order info before deletion for response
    const orderInfo = {
      _id: order._id,
      userId: order.userId,
      providerId: order.providerId,
      menuId: order.menuId,
      items: order.items,
      grandTotal: order.grandTotal,
      status: 'cancelled',
      orderDate: order.orderDate
    };

    // Delete the order
    await Order.findByIdAndDelete(orderId);

    res.status(200).json({
      message: 'Order cancelled and deleted successfully',
      order: orderInfo
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// GET: Orders summary (all orders)
// Usage: GET /api/orders/summary?date=2025-12-14
router.get('/summary/all', getOrdersSummary);

// GET: Orders summary for a specific provider
// Usage: GET /api/orders/summary/provider?providerId=xxx&date=2025-12-14
router.get('/summary/provider', getProviderOrdersSummary);



module.exports = router;
