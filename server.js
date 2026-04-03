const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Tell Express to serve your HTML file from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Supabase Backend Client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Master Insert Handler
async function handleInsert(req, res, tableName) {
  try {
    const { data, error } = await supabase.from(tableName).insert([req.body]).select().single();
    if (error) throw error;
    res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error(`[Error] Insert into ${tableName}:`, error.message);
    res.status(400).json({ ok: false, error: error.message });
  }
}

// API Routes
app.post('/api/leads', (req, res) => handleInsert(req, res, 'leads'));
app.post('/api/subscriptions', (req, res) => handleInsert(req, res, 'subscriptions'));
app.post('/api/farmbox-interests', (req, res) => handleInsert(req, res, 'farmbox_interests'));
app.post('/api/bookings', (req, res) => handleInsert(req, res, 'bookings'));
app.post('/api/corporate-enquiries', (req, res) => handleInsert(req, res, 'corporate_enquiries'));
app.post('/api/school-bookings', (req, res) => handleInsert(req, res, 'school_bookings'));
app.post('/api/wholesale-enquiries', (req, res) => handleInsert(req, res, 'wholesale_enquiries'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});