const express = require('express');
const router = express.Router();
const Menu = require('../Models/menu.model');
const User = require('../Models/user.model');


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

    // check if menu already exists for same date
    const existingMenu = await Menu.findOne({
      providerId,
      date: new Date(date)
    });

    if (existingMenu) {
      return res.status(400).json({
        message: 'Menu already exists for this date'
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


router.get('/', async (req, res) => {
  try {
    const menus = await Menu.find()
      .populate('providerId', 'name mobile') // optional but useful
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

module.exports = router;