const express = require('express')
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qmzopxy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const verifyToken = (req, res, next) => {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {

    try {
        await client.connect();
        // all collections
        const serviceCollection = client.db('doctors_portal_practice').collection('services');
        const bookingCollection = client.db('doctors_portal_practice').collection('bookings');
        const userCollection = client.db('doctors_portal_practice').collection('users');

        //get all  appointments / services api
        app.get('/service', async (req, res) => {

            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);

        })

        //get specific user bookings
        app.get('/booking', verifyToken, async (req, res) => {
            const authorization = req.headers.authorization;
            const decodedEmail = req.decoded.email;

            const patient = req.query.patient;
            if (patient === decodedEmail) {
                const query = { patient: patient };
                const bookings = await bookingCollection.find(query).toArray();
                res.send(bookings);
            }
            else {
                return res.status(403).send({message: 'forbidden access'});
            }

        })

        //add booking api
        app.post('/booking', async (req, res) => {

            const booking = req.body;
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });

        })

        //add user api
        app.put('/user/:email', async (req, res) => {

            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const UpdateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, UpdateDoc, options);
            let token = jwt.sign({ email: email }, `${process.env.ACCESS_TOKEN_SECRET}`, { expiresIn: '1h' })
            res.send({ result, token });
        })

        // Warning:
        // This is not the proper way to query
        // After learning more about mongodb, user aggregate lookup, pipeline, match, group
        app.get('/available', async (req, res) => {

            const date = req.query.date || 'Nov 14, 2022';

            //Step1: get all services
            const services = await serviceCollection.find().toArray();

            //Step2: get the booking of that day
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            //Step3: for each service, find bookings for the service
            services.forEach(service => {

                const serviceBookings = bookings.filter(b => b.treatment === service.name);
                // const booked = serviceBookings.map(s => s.slot);
                service.booked = serviceBookings.map(s => s.slot);
                service.slots = service.slots.filter(x => !service.booked.includes(x))
            })


            res.send(services)

        })

        /**
         * API Naming Convention
         * app.get('/booking') // get all bookings in this collection or get more than one or by filter
         * app.get('/booking/:id') // get a specific booking
         * app.post('/booking') // add a new booking
         * app.patch('/booking/:id') // update a specific booking
         * app.put('/booking/:id') // upsert update (if exist) or insert (if doesn't exist)
         * app.delete('/booking/:id') // delete a specific booking
         */
    }
    finally {

    }

}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from doctors portal server')
})

app.listen(port, () => {
    console.log(`Doctors portal app listening on port ${port}`)
})