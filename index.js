const express = require('express')
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000


app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qmzopxy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


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

        //get specific user booking
        app.get('/booking', async (req, res) => {
            const patient = req.query.patient;
            const query = { patient: patient };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);

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
            const options = {upsert: true};
            const UpdateDoc ={
                $set:user
            };
            const result = await userCollection.updateOne(filter, UpdateDoc, options);
            res.send(result);
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