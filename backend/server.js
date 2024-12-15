const express = require('express');
const app = express();
const PORT = 5000; 
const cors = require('cors'); // Use Cross Origin - Frontend - Backend
const { SerialPort } = require('serialport'); // Use Serial Port Library
const { SerialPortConfig } = require('./database');
const mqtt = require('mqtt');
const mongoose = require('mongoose');
const {startPolling} = require('./modbusPoller');
const {router: mqttHandler} = require('./mqtthandler');
const {router: modbusHandler} = require('./modbushandler');
const {router: inoutHandler, initializeADC} = require('./inouthandler');
const {router: awsHandler} = require('./awsiothandler');
const {router: networkhandler} = require('./networkhandler');



app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Cross Origin for Front-Back End Communication


/* Database Connection */
mongoose.connect('mongodb://localhost:27017/configdatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})  
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

/* MQTT Router */
app.use(mqttHandler);
/* Modbus Router */
app.use(modbusHandler);
/* IO Router */
app.use(inoutHandler);
/* Aws Router */
app.use(awsHandler);
/* Network Router */
app.use(networkhandler);

/* Known port */
let knownPorts = [];//"COM3"

/* Function to List all available serial ports - Is disable in API-/api/serialports/configdata - Need to enable when comes to production*/
function listSerialPorts() {
    SerialPort.list().then(
      ports => {
        let currentPorts = ports.map(port => `${port.path}`);
        // if (JSON.stringify(currentPorts) !== JSON.stringify(knownPorts)) {
             console.log('Current Serial Ports:', currentPorts);
        knownPorts = currentPorts;
        console.log('Updated serial ports');
        // }
      },
      err => {
        console.error('Error listing ports:', err);
        console.error('Error details:', err.stack);
      }
    );
}

/* GET - Testing Example for API endpoint */
app.get('/api/data', (req, res) => {
    console.log("Received request on /api/data");
    res.json({ message: "Hello from backend!" });
});

/* GET - API to get available ports*/
app.get('/api/serialports', async (req, res) => {
    listSerialPorts();
    res.json({ ports: knownPorts });
});

/* GET - Get the serial port config detail */
app.get('/api/serialports/configdata', async (req, res) => {
    listSerialPorts();
    // Array of known ports config data - Mock data for testing purposes
    let configs = [
        // {
        //     path: "COM3", // Default value if no portName is provided
        //     baudRate : "9600",
        //     dataBits : 8,
        //     parityBit : "none",
        //     stopBit : "1",
        //     flowControl : "none"
        // },
        // {
        //     path: "COM4", // Default value if no portName is provided
        //     baudRate : "19200",
        //     dataBits : 8,
        //     parityBit : "none",
        //     stopBit : "1",
        //     flowControl : "software"
        // },
        
        
    ];

    for (let port of knownPorts) {
        try {
            // Check if configuration already exists in the database
            let config = await SerialPortConfig.findOne({ path: port });

            if (config) {
                // If config exists, push to array
                configs.push(config);
            } else {
                // If config does not exist, create a new one with default values
                let newConfig = new SerialPortConfig({
                    path: port,
                    baudRate: 9600,
                    dataBits: 8,
                    parityBit: 'none',
                    stopBit: 1,
                    flowControl: 'none'
                });

                // Save the new config to the database
                await newConfig.save();
                configs.push(newConfig);
            }
        } catch (err) {
            console.error("Error retrieving or creating configuration:", err);
            return res.status(500).json({ error: 'Server error', details: err.message });
        }
    }

    // Send all configurations as response
    res.json(configs);
});

/* POST - Save updated serial port configuration */
app.post('/api/serialports/update', async (req,res) => {

    /* Update the mongodb config parameter */
    const {port, baudRate, dataBits, parityBit, stopBit, flowControl} = req.body;

    try{

        const updatedConfig = await SerialPortConfig.findOneAndUpdate(
            {path: port}, // Find document with port specified
            {
                baudRate: baudRate, 
                dataBits: dataBits, 
                parityBit: parityBit, 
                stopBit: stopBit, 
                flowControl: flowControl 
            },
            { new: true, upsert: true }
        );

        res.json({ message: "Serial port configuration updated successfully", data: updatedConfig });

    }catch(error){
        console.error("Failed to update or create serial port configuration:", error);
        res.status(500).json({ message: "Failed to update or create serial port configuration", error: error.message });
    }
});

app.get('/api/test-mqtt', (req, res) => {
    const client = mqtt.connect('mqtt://test.mosquitto.org');
    let messageReceived = false;

    client.on('connect', () => {
        console.log('Connected to MQTT Broker');
        client.subscribe('yourTopic', (err) => {
            if (!err) {
                client.publish('yourTopic', 'Hello MQTT');
            } else {
                res.status(500).send({ error: "Failed to subscribe and publish", details: err.message });
                client.end();
            }
        });
    });

    client.on('message', (topic, message) => {
        console.log(`Received message: ${message.toString()} on topic: ${topic}`);
        client.end(); // Disconnect after receiving the message
        if (!messageReceived) {
            messageReceived = true;
            res.send({ message: `Received: ${message.toString()}` });
        }
    });

    client.on('error', (err) => {
        console.error('MQTT Client Error:', err);
        if (!messageReceived) {
            res.status(500).send({ error: "MQTT Client Error", details: err.message });
            client.end();
        }
    });

    setTimeout(() => {
        if (!messageReceived) {
            console.log('No message received within timeout period.');
            client.end();
            res.status(408).send({ error: "MQTT message reception timed out" });
        }
    }, 10000); // Wait 10 seconds for a message
});

/* POST - Serial Port Open Testing API */
app.post('/api/serialport-configtest', async (req, res) =>{

    const { port, baudRate, dataBits, parityBit, stopBit, flowControl} = req.body;

    if (!port) {
        console.log("No port specified");
        return res.status(400).json({ error: "No port specified" });
    }
    try{
        // Create Serial Port
        const serialPort = new SerialPort({
            path: port, //"COM3", // For testing purposes
            baudRate: parseInt(baudRate, 10),
            dataBits: parseInt(dataBits, 10),
            stopBits: parseInt(stopBit, 10), 
            parity: parityBit, // Correct property name here
            autoOpen: false
        });
        
        // Set flow control options
        const options = {};
        if (flowControl === 'hardware') {
            options.rtscts = true;
        } else if (flowControl === 'software') {
            options.xon = true;
            options.xoff = true;
        }

       // Attempt to open the serial port
       await new Promise((resolve, reject) => {
            serialPort.open((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Apply the flow control settings
        if (!port.startsWith('/dev/ttyACM')) { 
	    await new Promise((resolve, reject) => {
		serialPort.set(options, (err) => {
		    if (err) reject(err);
		    else resolve();
		});
	    });
	} else {
	    console.log("Skipping flow control settings for ACM ports.");
	}

        // If everything is fine, send back the success response
        res.json({ message: "Port configured and opened successfully." });

        // close the port after testing
        setTimeout(() => {
            serialPort.close((err) => {
                if (err) console.error("Failed to close port:", err);
                else console.log("Port closed successfully.");
            });
        }, 5000); // Close after 5 seconds

    }catch(err){
        console.error("Error during serial port operation:", err);
        res.status(500).json({ message: err, error: err.message });
    }

});

/* Backend listen Port */
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeADC()  // Initialize asynchronously without blocking the server
        .then(() => console.log('ADC initialized successfully'))
        .catch(err => console.error('Failed to initialize ADC:', err));
});

module.exports = { app };
