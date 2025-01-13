CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  btc_try_rate DECIMAL(10,2),
  sats_amount DECIMAL(10,2),
  invoice TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);