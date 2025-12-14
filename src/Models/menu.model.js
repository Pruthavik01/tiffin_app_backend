const mongoose = require('mongoose');
const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    date: {
      type: Date,
      required: true
    },

    // list of sabjis available today
    sabjis: [
      {
        type: String,
        required: true
      }
    ],

    // prices for each tiffin type
    prices: {
      full: {
        type: Number,   // e.g. 120
        required: true
      },
      half: {
        type: Number,   // e.g. 80
        required: true
      },
      riceOnly: {
        type: Number,   // e.g. 50
        required: true
      }
    }
  },
  {
    timestamps: true
  }
);

// one menu per provider per day
menuSchema.index({ providerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Menu', menuSchema);
