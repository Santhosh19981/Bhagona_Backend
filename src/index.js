const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const servicesRouter = require('./routes/services');
const bookingsRouter = require('./routes/bookings');
const menuRouter = require('./routes/menuItems');
const chefsRouter = require('./routes/chefs');
const vendorsRouter = require('./routes/vendors');
const reviewsRouter = require('./routes/reviews');
const ordersRouter = require('./routes/orders');
const paymentsRouter = require('./routes/payments');
const cors = require('cors');
;

dotenv.config();
const app = express();
app.use(cors())
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

app.use('/users', usersRouter);
app.use('/events', eventsRouter);
app.use('/services', servicesRouter);
app.use('/bookings', bookingsRouter);
app.use('/menu-items', menuRouter);
app.use('/chefs', chefsRouter);
app.use('/vendors', vendorsRouter);
app.use('/reviews', reviewsRouter);
app.use('/orders', ordersRouter);
app.use('/payments', paymentsRouter);

app.get('/', (req, res) => res.json({ service: 'bhagona-backend-v3', status: 'ok' }));

app.listen(PORT, () => console.log(`Bhagona backend v3 running on port ${PORT}`));
