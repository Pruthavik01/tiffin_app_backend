const express = require('express');
const router = express.Router();
const UserFavProvider = require('../Models/userFavProvider.model');
const User = require('../Models/user.model');

router.post('/:userId/favorites/:providerId', async (req, res) => {
  try {
    const { userId, providerId } = req.params;

    if (!userId || !providerId) {
      return res.status(400).json({ message: 'userId and providerId are required' });
    }

    const user = await User.findById(userId);
    const provider = await User.findOne({ _id: providerId, role: 'provider' });

    if (!user || !provider) {
      return res.status(404).json({ message: 'User or Provider not found' });
    }

    await UserFavProvider.updateOne(
      { userID: userId },
      { $addToSet: { favoriteProviders: providerId } },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      message: 'Provider added to favorites'
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:userId/favorites', async (req, res) => {
  try {
    const { userId } = req.params;

    const favProviders = await UserFavProvider
      .findOne({ userID: userId })
      .populate({
        path: 'favoriteProviders',
        match: { role: 'provider' },
        select: 'name email role'
      });

    if (!favProviders || favProviders.favoriteProviders.length === 0) {
      return res.status(404).json({ message: 'No favorite providers found' });
    }

    res.status(200).json({
      favoriteProviders: favProviders.favoriteProviders
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// remove from fav
router.delete('/:userId/favorites/:providerId', async (req, res) => {
  try {
    const { userId, providerId } = req.params;

    const result = await UserFavProvider.updateOne(
      { userID: userId },
      { $pull: { favoriteProviders: providerId } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User favorites not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Provider removed from favorites'
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// get all the providers
router.get('/providers', async (req, res) => {
  try {
    const providers = await User.find(
      { role: 'provider' },
      'name email role'
    );

    res.status(200).json({
      success: true,
      count: providers.length,
      providers
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;