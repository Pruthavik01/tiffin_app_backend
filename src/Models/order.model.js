const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true
    },

    items: [
      {
        mealType: {
          type: String,
          enum: ['full', 'half', 'riceOnly'],
          required: true
        },

        sabji: {
          type: String,
          required: function () {
            return this.mealType !== 'riceOnly';
          }
        },

        quantity: {
          type: Number,
          required: true,
          min: 1
        },

        pricePerUnit: {
          type: Number,
          required: true
        },

        totalPrice: {
          type: Number,
          required: true
        }
      }
    ],

    grandTotal: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ['placed', 'accepted', 'cancelled'],
      default: 'placed'
    },

    orderDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
