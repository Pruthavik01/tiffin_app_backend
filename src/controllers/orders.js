const Order = require('../Models/order.model');

// Get orders summary for a specific date
exports.getOrdersSummary = async (req, res) => {
  try {
    const { date } = req.query;

    let query = {};

    // If date is provided, filter orders by that date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.orderDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      query.orderDate = {
        $gte: today,
        $lt: tomorrow
      };
    }

    // Get all orders for the date
    // Populate menuId only if the menu is active (soft-delete support)
    const orders = await Order.find(query)
      .populate('userId')
      .populate({ path: 'menuId', match: { isActive: true } });

    // Exclude orders whose menu was deleted (menuId will be null after populate)
    const validOrders = orders.filter(o => o.menuId && o.menuId._id);

    // Calculate summary statistics based on valid orders only
    const totalOrders = validOrders.length;
    let fullTiffinCount = 0;
    let halfTiffinCount = 0;
    let riceOnlyCount = 0;
    let totalRevenue = 0;

    validOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.mealType === 'full') {
          fullTiffinCount += item.quantity;
        } else if (item.mealType === 'half') {
          halfTiffinCount += item.quantity;
        } else if (item.mealType === 'riceOnly') {
          riceOnlyCount += item.quantity;
        }
      });
      // Only count revenue for approved orders
      if (order.status === 'approved') {
        totalRevenue += order.grandTotal;
      }
    });

    const summary = {
      date: date || new Date().toISOString().split('T')[0],
      totalOrders,
      fullTiffin: fullTiffinCount,
      halfTiffin: halfTiffinCount,
      riceOnly: riceOnlyCount,
      totalRevenue,
      orders: validOrders.map(order => ({
        orderId: order._id,
        userId: order.userId?._id,
        userName: order.userId?._doc?.name || order.userId?.name,
        items: order.items,
        grandTotal: order.grandTotal,
        status: order.status,
        orderDate: order.orderDate
      }))
    };

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get orders summary for a specific provider
exports.getProviderOrdersSummary = async (req, res) => {
  try {
    const { providerId, date } = req.query;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: 'providerId is required'
      });
    }

    let query = { 
      providerId,
      status: 'approved'
    };

    // If date is provided, filter orders by that date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.orderDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      query.orderDate = {
        $gte: today,
        $lt: tomorrow,
      };
    }

    // Get all orders for the provider
    const orders = await Order.find(query)
      .populate('userId')
      .populate({
        path: 'menuId',
        match: { isActive: true }
      });


    // Exclude orders whose menu was deleted/inactive (menuId will be null after populate match)
    const validOrders = orders.filter(o => o.menuId && o.menuId._id);

    // Calculate summary statistics based on valid orders only
    const totalOrders = validOrders.length;
    let fullTiffinCount = 0;
    let halfTiffinCount = 0;
    let riceOnlyCount = 0;
    let totalRevenue = 0;

    validOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.mealType === 'full') {
          fullTiffinCount += item.quantity;
        } else if (item.mealType === 'half') {
          halfTiffinCount += item.quantity;
        } else if (item.mealType === 'riceOnly') {
          riceOnlyCount += item.quantity;
        }
      });
      // Only count revenue for approved orders
      if (order.status === 'approved' ) {
        totalRevenue += order.grandTotal;
      }
    });

    const summary = {
      providerId,
      date: date || new Date().toISOString().split('T')[0],
      totalOrders,
      fullTiffin: fullTiffinCount,
      halfTiffin: halfTiffinCount,
      riceOnly: riceOnlyCount,
      totalRevenue,
      orders: validOrders.map(order => ({
        orderId: order._id,
        userId: order.userId?._id,
        userName: order.userId?._doc?.name || order.userId?.name,
        items: order.items,
        grandTotal: order.grandTotal,
        status: order.status,
        orderDate: order.orderDate
      }))
    };

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};