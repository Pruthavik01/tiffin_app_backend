const express = require('express');
const router = express.Router();

// Monthly revenue till today
router.get('/monthly-revenue', (req, res) => { });

// Total revenue & total orders till date
router.get('/overall-summary', (req, res) => { });

// Month-on-month growth rate
router.get('/growth-rate', (req, res) => { });

// Best selling tiffin type & sabji
router.get('/best-sellers', (req, res) => { });

// Daily revenue for line graph (current month)
router.get('/daily-revenue-trend', (req, res) => {
    
    //response example
    // {
    //     "data": [
    //         { "date": "2025-12-01", "revenue": 1800 },
    //         { "date": "2025-12-02", "revenue": 2200 },
    //         { "date": "2025-12-03", "revenue": 1950 }
    //     ]
    // }
});

// Average Order Value
router.get('/avg-order-value', (req, res) => { });

module.exports = router;
