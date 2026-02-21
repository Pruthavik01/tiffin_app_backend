const express = require('express');
const router = express.Router();
const Menu = require('../Models/menu.model');
const User = require('../Models/user.model');
const Order = require('../Models/order.model');

// post/add data menu (provider only)
router.post('/create-menu', async (req, res) => {
  try {
    const { providerId, date, sabjis, prices } = req.body;

    // basic validation
    if (!providerId || !date || !sabjis || !sabjis.length || !prices) {
      return res.status(400).json({
        message: 'providerId, date, sabjis and prices are required'
      });
    }

    // validate prices
    if (
      prices.full == null ||
      prices.half == null ||
      prices.riceOnly == null
    ) {
      return res.status(400).json({
        message: 'Prices for full, half and riceOnly are required'
      });
    }

    // check user exists and role is provider
    const provider = await User.findById(providerId);

    if (!provider) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (provider.role !== 'provider') {
      return res.status(403).json({
        message: 'Access denied. Only providers can create menu.'
      });
    }

    // create menu
    const menu = await Menu.create({
      providerId,
      date,
      sabjis,
      prices
    });

    res.status(201).json({
      message: 'Menu created successfully',
      menu
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// get data menu
router.get('/', async (req, res) => {
  try {
    const menus = await Menu.find({ isActive: true })
      .populate('providerId', 'name mobile')
      .sort({ date: -1 }); // latest first

    res.status(200).json({
      count: menus.length,
      menus
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});


// GET: Orders for orders-provider (provider dashboard)
// Accepts providerId in query or body. Filters orders by orderDate between startDate and endDate (inclusive).
router.post('/provider', async (req, res) => {
  try {
    // allow providerId in query or body for flexibility
    const providerId = req.query.providerId || req.body.providerId;
    const { startDate, endDate } = req.body;

    if (!providerId) {
      return res.status(400).json({
        message: 'providerId is required'
      });
    }

    // validate provider
    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (provider.role !== 'provider') {
      return res.status(403).json({
        message: 'Access denied. Only providers can view orders.'
      });
    }

    // build date range (use orderDate field which represents the actual order day)
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Query orders for this provider using orderDate (not createdAt)
    // Populate menuId only if menu is active; then filter out orders with inactive menus
    const orders = await Order.find({
      providerId,
      orderDate: {
        $gte: start,
        $lte: end
      }
    })
      .populate('userId', 'name mobile')   // student details
      .populate({ path: 'menuId', match: { isActive: true }, select: 'date' })
      .sort({ orderDate: -1 });

    const validOrders = orders.filter(o => o.menuId && o.menuId._id);

    // Add status information for FE
    const ordersWithStatus = validOrders.map(order => {
      const orderObj = order.toObject();
      // Include status and other relevant info
      return orderObj;
    });

    res.status(200).json({
      count: ordersWithStatus.length,
      orders: ordersWithStatus
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});


// Update menu (provider only)
router.put('/:menuId', async (req, res) => {
  try {
    const { menuId } = req.params;
    const { providerId, date, sabjis, prices } = req.body;

    if (!providerId) {
      return res.status(400).json({ message: 'providerId is required' });
    }

    // check provider exists and role
    const provider = await User.findById(providerId);
    if (!provider) return res.status(404).json({ message: 'User not found' });
    if (provider.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied. Only providers can update menu.' });
    }

    // fetch menu
    const menu = await Menu.findById(menuId);
    if (!menu) return res.status(404).json({ message: 'Menu not found' });

    // ownership check: only the menu owner (provider) can update
    if (String(menu.providerId) !== String(providerId)) {
      return res.status(403).json({ message: 'Access denied. You do not own this menu.' });
    }

    // If date is being updated, ensure no other menu exists for same provider+date
    if (date) {
      const newDate = new Date(date);
      const existing = await Menu.findOne({
        providerId,
        date: newDate,
        _id: { $ne: menuId }
      });
      if (existing) {
        return res.status(400).json({ message: 'Another menu already exists for this date' });
      }
      menu.date = newDate;
    }

    // If sabjis provided, validate it's a non-empty array of strings
    if (sabjis) {
      if (!Array.isArray(sabjis) || sabjis.length === 0) {
        return res.status(400).json({ message: 'sabjis must be a non-empty array' });
      }
      menu.sabjis = sabjis;
    }

    // If prices provided, validate and update fields individually
    if (prices) {
      const { full, half, riceOnly } = prices;
      if (full != null) {
        if (typeof full !== 'number') return res.status(400).json({ message: 'prices.full must be a number' });
        menu.prices.full = full;
      }
      if (half != null) {
        if (typeof half !== 'number') return res.status(400).json({ message: 'prices.half must be a number' });
        menu.prices.half = half;
      }
      if (riceOnly != null) {
        if (typeof riceOnly !== 'number') return res.status(400).json({ message: 'prices.riceOnly must be a number' });
        menu.prices.riceOnly = riceOnly;
      }
    }

    // save
    const updated = await menu.save();

    // optional: populate provider fields before returning
    await updated.populate('providerId', 'name mobile');

    res.status(200).json({ message: 'Menu updated successfully', menu: updated });
  } catch (error) {
    console.error(error);
    // handle duplicate key (just in case index triggers)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Menu for this provider and date already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete menu (provider only)
router.delete('/:menuId', async (req, res) => {
  try {
    const { menuId } = req.params;
    const { providerId } = req.body;

    if (!providerId) {
      return res.status(400).json({ message: 'providerId is required' });
    }

    // check provider exists and role
    const provider = await User.findById(providerId);
    if (!provider) return res.status(404).json({ message: 'User not found' });
    if (provider.role !== 'provider') {
      return res.status(403).json({ message: 'Access denied. Only providers can delete menu.' });
    }

    const menu = await Menu.findById(menuId);
    if (!menu) return res.status(404).json({ message: 'Menu not found' });

    // ownership check
    if (String(menu.providerId) !== String(providerId)) {
      return res.status(403).json({ message: 'Access denied. You do not own this menu.' });
    }

    menu.isActive = false;
    menu.deletedAt = new Date();
    await menu.save();


    res.status(200).json({ message: 'Menu deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;