const express = require('express');
const router = express.Router();
const { MQTTConfig, SerialPortConfig,  MQTTPublishTopic, MQTTSubscribeTopic, DataSet, DOWrite } = require('./database');
const mqtt = require('mqtt');
const serialPortManager = require('./serialPortManager');
const multer = require('multer');
const { readingsStore, writeToModbusDevice } = require('./modbusPoller');
const { inputStates, channelData, WriteDigitalOutput} = require('./inouthandler');

let client = null;
let mqttpublish = false;
let mqttsubscribe = false;
let registerWriteListener = false;
let DOWriteListener = false;

const upload = multer({ storage: multer.memoryStorage() });
let intervalStore = {};
const tlsVersions = {
    "TLS1.2": "TLSv1_2_method",
    "TLS1.3": "TLSv1_3_method"
};

let reportIntervalId = null;
let reportInterval_ioreport = null;

// const deleteMQTTConfigOnStartup = async () => {
//     try {
//         const result = await MQTTConfig.deleteMany({});
//         const result1 = await MQTTSubscribeTopic.deleteMany({});
//         const result2 = await MQTTPublishTopic.deleteMany({});

//     } catch (error) {
//         console.error('Error deleting MQTT configuration:', error);
//     }
// };
// deleteMQTTConfigOnStartup();

// GET - Retrieve the values of mqttpublish and mqttsubscribe
router.get('/api/mqtt/status', (req, res) => {
    res.status(200).json({
        mqttpublish: mqttpublish,
        mqttsubscribe: mqttsubscribe,
        client: client !== null
    });
});

router.post('/api/dowrite/subscribe', (req, res) => {
    const { datachannel, subtopic, subQOS, restopic, resQOS } = req.body;
    console.log(req.body);
    if (client === null) {
        return res.status(400).json({
            message: 'MQTT client connection is not established. Please ensure the client is connected before subscribing to topic.'
        });
    }
    let parsedQOS1 = parseInt(subQOS, 10);
    let parsedQOS2 = parseInt(resQOS, 10);
    // Subscribe to the topic with the provided QoS
    client.subscribe(subtopic, { qos: parsedQOS1 }, (err) => {
        

        console.log(`Subscribed to topic: ${subtopic} with QoS: ${parsedQOS1}`);

        // Handle incoming messages on the subscribed topic
        if(!DOWriteListener){
            client.on('message', async (topic, message) => {
                if (topic === subtopic) {
                    console.log(`Received message on topic ${topic}:`, message.toString());
                    // For now, just log the message. You can add logic to write to Modbus or handle it otherwise.
                    
                    const msg = JSON.parse(message.toString()); // Parse the message (assuming it's JSON)
                    console.log(message.toString());
                    const { output, value } = msg;
                    
                    // Call DO write function to write to the device - Call function from inouthandler.js 
                    await WriteDigitalOutput(output, value);
                    
                    // Optionally, publish a response to the response topic
                    const responseMessage = {
                        message: `Received data from ${topic}`,
                        originalMessage: message.toString(),
                    };
                    client.publish(restopic, JSON.stringify(responseMessage), { qos: parsedQOS2 });
                    console.log(`Published response to ${restopic}`);
                }
            });
            DOWriteListener = true;

        }
        res.status(200).json({ message: `Successfully subscribed to ${subtopic}` });
    });
});

router.post('/api/dowrite/stoplistening', async (req, res) => {
    try {
        // Retrieve the dataset configuration from the database
        const dataSetConfig = await DOWrite.findOne();

        const { subtopic } = dataSetConfig;

        // Unsubscribe from the topic
        client.unsubscribe(subtopic, (err) => {
            if (err) {
                console.error('Error unsubscribing from topic:', err);
                return res.status(500).json({ message: 'Failed to unsubscribe from topic - Topic not listening' });
            }

            console.log(`Unsubscribed from topic: ${subtopic}`);

            DOWriteListener = false;  // Reset the flag
            
            res.status(200).json({ message: `Successfully stopped listening to ${subtopic}` });
        });
    } catch (error) {
        console.error('Error stopping listening to topic:', error);
        res.status(500).json({ message: 'Failed to stop listening to topic', error: error.message });
    }
});

router.post('/api/ioreport/publish', (req, res) => {
    const { enableReport, dataChannel, reportTopic, reportQOS, reportInterval, reportTemplate } = req.body;

    console.log(reportInterval);
    let converted = 5000;

    if(reportInterval){
        converted = parseInt(reportInterval,10)*1000;
    }else{
        converted = 5000;
    }

    if (client === null) {  // or `if (client === null)` if you prefer explicit equality
        return res.status(400).json({
            message: 'MQTT client connection is not established. Please ensure the client is connected before data reporting.'
        });
    }
    
    if (!enableReport) {
        return res.status(400).json({ error: "Reporting is not enabled or data channel is not MQTT" });
    }

    // Clear any existing interval
    if (reportInterval_ioreport) {
        clearInterval(reportInterval_ioreport);
    }

    // Schedule reporting based on the interval
    
    reportInterval_ioreport = setInterval(() => {
        // Parse the reportTemplate and replace nodes with values from readingsStore
        try {
            const template = JSON.parse(reportTemplate);
            const message = {};

            for (const [key, node] of Object.entries(template)) {
                if (inputStates[node] !== undefined) {
                    message[key] = inputStates[node];
                } else if (channelData[node] !== undefined){
                    message[key] = channelData[node]; 
                } else {
                    message[key] = "No value reading";
                }
            }
            
            // Publish the message to the MQTT topic
            client.publish(reportTopic, JSON.stringify(message), { qos: reportQOS }, (error) => {
                if (error) {
                    console.error("Error publishing to MQTT:", error.message);
                } else {
                    console.log("Published data:", message);
                }
            });
        } catch (error) {
            console.error("Error with template parsing or publishing:", error.message);
        }
    }, converted);

    res.json({ message: "IO status published to MQTT" });
});

router.post('/api/ioreport/stoppublish', (req, res) => {
    // Clear any existing interval
    if (reportInterval_ioreport) {
        clearInterval(reportInterval_ioreport);
    }

    reportInterval_ioreport = null;
    res.json({ message: "Stop publishing IO status to MQTT" });

});

router.post('/api/dataset/subscribe', (req, res) => {
    const { subtopic, subQOS, restopic, resQOS } = req.body;
    console.log(req.body);
    if (client === null) {
        return res.status(400).json({
            message: 'MQTT client connection is not established. Please ensure the client is connected before subscribing to topic.'
        });
    }
    let parsedQOS1 = parseInt(subQOS, 10);
    let parsedQOS2 = parseInt(resQOS, 10);
    // Subscribe to the topic with the provided QoS
    client.subscribe(subtopic, { qos: parsedQOS1 }, (err) => {

        console.log(`Subscribed to topic: ${subtopic} with QoS: ${parsedQOS1}`);
        // Handle incoming messages on the subscribed topic
        if (!registerWriteListener) {
            client.on('message', async (topic, message) => {
                if (topic === subtopic) {
                    console.log(`Received message on topic ${topic}:`, message.toString());
                    // For now, just log the message. You can add logic to write to Modbus or handle it otherwise.
                    
                    const msg = JSON.parse(message.toString()); // Parse the message (assuming it's JSON)
                    console.log(message.toString());
                    const { deviceID, functionCode, registerAddress, value } = msg;
                    
                    // Call Modbus write function to write to the device
                    await writeToModbusDevice(deviceID, functionCode, registerAddress, value);
                    
                    // Optionally, publish a response to the response topic
                    const responseMessage = {
                        message: `Received data from ${topic}`,
                        originalMessage: message.toString(),
                    };
                    client.publish(restopic, JSON.stringify(responseMessage), { qos: parsedQOS2 });
                    console.log(`Published response to ${restopic}`);
                }
            });
            registerWriteListener = true;
        
        }
        res.status(200).json({ message: `Successfully subscribed to ${subtopic}` });
    });

    
});

router.post('/api/dataset/stoplistening', async (req, res) => {
    try {
        // Retrieve the dataset configuration from the database
        const dataSetConfig = await DataSet.findOne();

        const { subtopic } = dataSetConfig;

        // Unsubscribe from the topic
        client.unsubscribe(subtopic, (err) => {
            if (err) {
                console.error('Error unsubscribing from topic:', err);
                return res.status(500).json({ message: 'Failed to unsubscribe from topic' });
            }

            console.log(`Unsubscribed from topic: ${subtopic}`);

            registerWriteListener = false;  // Reset the flag
            
            res.status(200).json({ message: `Successfully stopped listening to ${subtopic}` });
        });
    } catch (error) {
        console.error('Error stopping listening to topic:', error);
        res.status(500).json({ message: 'Failed to stop listening to topic', error: error.message });
    }
});

router.post('/api/dataacquisition/publish', (req, res) => {
    const { enableReport, dataChannel, reportTopic, reportQOS = 0, reportInterval, reportTemplate } = req.body;
    
    console.log(reportInterval);
    
    let converted = 5000;
    if(reportInterval){
        converted = parseInt(reportInterval,10)*1000;
    }else{
        converted = 5000;
    }

    if (client === null) {  // or `if (client === null)` if you prefer explicit equality
        return res.status(400).json({
            message: 'MQTT client connection is not established. Please ensure the client is connected before data reporting.'
        });
    }
    
    if (!enableReport) {
        return res.status(400).json({ error: "Reporting is not enabled or data channel is not MQTT" });
    }

    // Clear any existing interval
    if (reportIntervalId) {
        clearInterval(reportIntervalId);
        // reportIntervalId = null;
    }

    // Schedule reporting based on the interval
    reportIntervalId = setInterval(() => {
        // Parse the reportTemplate and replace nodes with values from readingsStore
        try {
            const template = JSON.parse(reportTemplate);
            const message = {};

            for (const [key, node] of Object.entries(template)) {
                if (readingsStore[node] !== undefined) {
                    message[key] = readingsStore[node];
                } else {
                    message[key] = "No value reading"; // handle missing nodes
                }
            }
            // let msg = "Hello";
            // Publish the message to the MQTT topic
            client.publish(reportTopic, JSON.stringify(message), { qos: reportQOS }, (error) => {
                if (error) {
                    console.error("Error publishing to MQTT:", error.message);
                } else {
                    console.log("Published data:", message);
                }
            });
        } catch (error) {
            console.error("Error with template parsing or publishing:", error.message);
        }
    }, converted);
   

    res.json({ message: "Scheduled data publishing to MQTT" });
});

router.post('/api/dataacquisition/stoppublish', (req, res) => {
    // Clear any existing interval
    if (reportIntervalId !== null) {
        clearInterval(reportIntervalId);
    }
    reportIntervalId = null;
    res.json({ message: "Stop data publishing to MQTT" });

});
async function generatePortsConfig() {
    try {
        // Fetch all serial port configurations
        const serialPorts = await SerialPortConfig.find();

        // Fetch all MQTT topics
        const mqttTopics = await MQTTPublishTopic.find();

        // Map the topics to their respective ports
        const portConfig = serialPorts.map((port) => {
            const portTopics = mqttTopics
                .filter(topic => topic.bindingport === port.path) // Filter topics bound to this port
                .map(topic => {
                    // Apply transformations if needed
                    let transform = null;
                    if (topic.enableExtract && topic.topicExtract) {
                        transform = (data) => ({ [topic.topicExtract]: data[topic.topicExtract] });
                    }
        
                    return {
                        topic: topic.topic,
                        qos: topic.qos,
                        interval: topic.interval,
                        retainFlag: topic.retainFlag,
                        transform
                    };
                });
        
            // Only return configuration if there are topics for this port
            return portTopics.length > 0 ? {
                bindingport: port.path,
                serialConfig: {
                    path: port.path,
                    baudRate: port.baudRate,
                    dataBits: port.dataBits,
                    parityBit: port.parityBit,
                    stopBit: port.stopBit,
                    flowControl: port.flowControl
                },
                topics: portTopics
            } : null;
        })
        .filter(portConfig => portConfig !== null); // Filter out ports with no topics

        console.log(portConfig);
        return portConfig;
    } catch (error) {
        console.error("Error generating ports configuration:", error);
        throw error;
    }
}

async function generateSubscriptionConfig() {
    
    const serialPorts = await SerialPortConfig.find();
    const mqttTopics = await MQTTSubscribeTopic.find();

    return serialPorts.map((port) => {
        const portTopics = mqttTopics
            .filter(topic => topic.bindingport === port.path)
            .map(topic => {
                let transform = null;
                    if (topic.enableExtract && topic.topicExtract) {
                        transform = (data) => ({ [topic.topicExtract]: data[topic.topicExtract] });
                    }
        
                    return {
                        topic: topic.topic,
                        qos: topic.qos,
                        retainFlag: topic.retainFlag,
                        enableExtract: topic.enableExtract,
                        transform
                    };
            });

        return {
            bindingport: port.path,
            serialConfig: {
                path: port.path,
                baudRate: port.baudRate,
                dataBits: port.dataBits,
                parityBit: port.parityBit,
                stopBit: port.stopBit,
                flowControl: port.flowControl
            },
            topics: portTopics
        };
    });
}

/* POST - Configure MQTT and Connect To Client */
router.post('/api/mqtt/configure', upload.fields([{ name: 'caFile' }, { name: 'clientCert' }, { name: 'clientKey' }]), async (req, res) => {
    const {
        enablemqtt, hostname, clientID, version=4, clean, keepAlive, reconnectPeriod,
        connectTimeout, usercredential, username, password, lastwill, lastwilltopic, lastwillpayload,
        lastwillqos, retainflag, enablessl, tlsversion
    } = req.body;


    let responseSent = false;
    
    // Close the existing client if it exists
    if (client) {
        console.log('Closing existing MQTT client connection...');
        client.end(true); // Forcefully end the connection
        client.removeAllListeners(); // Clear all listeners to avoid memory leaks
    }

    /*Save configuration to db*/
    let mqttConfig = {
        enablemqtt: enablemqtt, // Correctly converting string to boolean
        hostname,
        clientID,
        version: req.body.version == 'undefined' ? 4 : req.body.version,
        clean: clean,
        keepAlive: parseInt(keepAlive, 10),
        reconnectPeriod: parseInt(reconnectPeriod, 10),
        connectTimeout: parseInt(connectTimeout, 10),
        usercredential: usercredential,
        username,
        password,
        lastwill: lastwill,
        lastWillobj: {
            lastwilltopic: lastwilltopic,
            lastwillpayload: lastwillpayload,
            lastwillqos: lastwillqos,
            retainflag: retainflag
        }
    };

    console.log(mqttConfig);

    const updatedConfig = await MQTTConfig.findOneAndUpdate(
        { internalId: 'defaultConfig' },
        mqttConfig,
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (enablemqtt === 'false') {
        console.log("Disable mqtt configuration");
        if(client){
            client.end(true); // Forcefully end the connection
            client.removeAllListeners(); // Clear all listeners to avoid memory leaks
            client = null;
            mqttpublish = false;
            mqttsubscribe = false;
            return res.status(200).send({ message: "MQTT is not enabled, but configuration updated" });
        }
    }

    let mqttOptions = {
        clientId: clientID || `mqtt_${Math.random().toString(16).slice(2)}`,
        clean: clean,
        keepalive: parseInt(keepAlive, 10),
        reconnectPeriod: parseInt(reconnectPeriod, 10) * 1000,
        connectTimeout: parseInt(connectTimeout, 10) * 1000,
        username: username || undefined,
        password: password || undefined,
        protocolVersion: parseInt(version, 10)
    };

    // Adjust the protocol based on SSL configuration
    const protocol = enablessl === 'true' ? 'mqtts' : 'mqtt';
    if (enablessl === 'true') {
        if (req.files.caFile && req.files.caFile[0]) {
            mqttOptions.ca = req.files.caFile[0].buffer;
        }
        if (req.files.clientCert && req.files.clientCert[0]) {
            mqttOptions.cert = req.files.clientCert[0].buffer;
        }
        if (req.files.clientKey && req.files.clientKey[0]) {
            mqttOptions.key = req.files.clientKey[0].buffer;
        }

        if (!mqttOptions.ca || !mqttOptions.cert || !mqttOptions.key) {
            return res.status(400).send({ message: "All SSL files must be provided for a secure connection." });
        }
        mqttOptions.secureProtocol = tlsVersions[tlsversion]||'TLSv1_2_method';

    }

    if (lastwill === 'true') {
        mqttOptions.will = {
            topic: lastwilltopic,
            payload: lastwillpayload,
            qos: lastwillqos,
            retain: retainflag === 'true'
        };
    }

    // Connect to MQTT Broker using the determined protocol
    try {
        
        client = mqtt.connect(`${protocol}://${hostname}`, mqttOptions);

        client.on('connect', () => {
            console.log('MQTT Client Connected');
            if (!responseSent) {
                res.send({ message: "Connected to MQTT broker successfully!" });
                responseSent = true;
            }
        });

        client.on('error', (error) => {
            console.error('Failed to connect to MQTT Broker:', error);
            if (!responseSent) {
                res.status(500).send({ message: 'Failed to connect to MQTT broker', error: error.toString() });
                responseSent = true;
            }
        });

        client.on('close', () => {
            console.log('MQTT Connection Closed');
        });
        
        client.on('offline', () => {
            console.log('MQTT Client is Offline');
        });

        client.on('reconnect', () => {
            console.log('Attempting to reconnect to the MQTT broker...');
        });
        
        client.on('disconnect', () => {
            console.log('Disconnected from the MQTT broker.');
        });

    } catch (error) {
        console.error('MQTT Connection Error:', error);
        res.status(500).send({ message: 'Failed to initialize MQTT client', error: error.toString() });
        responseSent = true;
    }
});

/* GET - Get MQTT Latest Config */
router.get('/api/mqtt/latest-config', async (req, res) => {
    try {
        const latestConfig = await MQTTConfig.findOne().sort({ createdAt: -1 }); 
        if (latestConfig) {
            res.json(latestConfig);
        } else {
            res.status(404).send({ error: 'No configuration found' });
        }
    } catch (err) {
        console.error('Failed to fetch configuration:', err);
        res.status(500).send({ error: 'Server error', details: err.message });
    }
});

/* POST - Publish Topics to MQTT */
router.post('/api/mqtt/topics-publish', async (req, res) => {
    
    if (client === null) {  // or `if (client === null)` if you prefer explicit equality
        return res.status(400).json({
            message: 'MQTT client connection is not established. Please ensure the client is connected before publishing.'
        });
    }
    
    try {
        const portsConfig = await generatePortsConfig();
        console.log(portsConfig);

        if (portsConfig && portsConfig.length > 0) { // Ensure portsConfig is an array and not empty
            console.log('Can proceed');
            portsConfig.forEach(({ bindingport, serialConfig, topics }) => {
                serialPortManager.listenToData(bindingport, serialConfig);
                startPublishingWithIntervals(bindingport, topics);
            });
            mqttpublish = true;
            // Send success response
            res.status(200).json({
                message: 'Configuration processed successfully',
                data: portsConfig
            });
        } else {
            console.log('Nothing in the config');
            res.status(404).json({ message: 'No configuration data available' });
        }
    } catch (error) {
        console.error('Error processing configuration:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
        
});

function publishToTopic(messageObj, bindingport, topicConfig) {
    const { topic, qos = 0, retainFlag = false, transform } = topicConfig;
    let publishMessage;

    // Check if we need to extract a specific key-value pair
    if (transform!==null) {
            publishMessage = transform(messageObj);;
    } else {
        publishMessage = messageObj;
    }

    const msg = typeof publishMessage === 'object' ? JSON.stringify(publishMessage) : publishMessage;

    // Publish the message
    client.publish(
        topic,
        msg,
        { qos, retain: retainFlag },
        (error) => {
            const timestamp = new Date().toISOString();
            if (error) {
                console.error(`[${timestamp}] Error publishing to ${topic} from port ${bindingport}:`, error);
            } else {
                console.log(`[${timestamp}] Published to ${topic} from port ${bindingport}:`, publishMessage);
            }
        }
    );
}

// Set up interval-based publishing for each topic
function startPublishingWithIntervals(bindingport, topics) {
    console.log('Go into start Publishing');
    topics.forEach((topicConfig) => {
        const { interval } = topicConfig;
        const intervalKey = `${bindingport}_${topicConfig.topic}`;

        // Clear any existing interval for this topic
        if (intervalStore[intervalKey]) {
            clearInterval(intervalStore[intervalKey]);
        }

        // Set up a new interval for this topic
        intervalStore[intervalKey] = setInterval(() => {
            const latestData = serialPortManager.getLatestData(bindingport);
            // console.log(`${latestData}`);
            if (latestData) {
                publishToTopic(latestData, bindingport, topicConfig);
            }
            
        }, interval);

        console.log(`Started interval-based publishing to ${topicConfig.topic} every ${interval}ms on port ${bindingport}`);
    });
}

// POST - Stop publishing for all topics
router.post('/api/mqtt/stop-all-publishing', async (req, res) => {
    try {
        // Fetch all publish topics
        const publishTopics = await MQTTPublishTopic.find();
        
        // Iterate over all topics and clear their intervals
        publishTopics.forEach((topicConfig) => {
            const intervalKey = `${topicConfig.bindingport}_${topicConfig.topic}`;

            // Check if interval exists and clear it
            if (intervalStore[intervalKey]) {
                clearInterval(intervalStore[intervalKey]);
                delete intervalStore[intervalKey]; // Remove the entry from the interval store
                console.log(`Stopped publishing for topic ${topicConfig.topic}`);
            }
        });
        
        mqttpublish = false;
        res.status(200).json({ message: 'Stopped publishing for all topics' });
    } catch (error) {
        console.error('Error stopping all publishing:', error);
        res.status(500).json({ message: 'Server error while stopping publishing.' });
    }
});

/* POST - Subscribe Topics from MQTT */
router.post('/api/mqtt/topics-subscribe', async (req, res) => {
    
    if (client === null) {  // or `if (client === null)` if you prefer explicit equality
        return res.status(400).json({
            message: 'MQTT client connection is not established. Please ensure the client is connected before subscribing.'
        });
    }
    try {
        const portsConfig = await generateSubscriptionConfig();
        // console.log(portsConfig);

        if (portsConfig && portsConfig.length > 0) { // Ensure portsConfig is an array and not empty
            console.log('Can proceed with subscription');
            mqttsubscribe = true;
            portsConfig.forEach(({ bindingport, serialConfig, topics }) => {
                if(topics.length > 0) {
                    // Start subscribing to topics
                    startSubscribingToTopics(bindingport, topics, serialConfig);
                } 
            });
            
            // Send success response
            res.status(200).json({
                message: 'Subscription configuration processed successfully',
                data: portsConfig
            });
        } else {
            console.log('Nothing in the config');
            res.status(404).json({ message: 'No configuration data available' });
        }
    } catch (error) {
        console.error('Error processing subscription configuration:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Start to subscribe to topics
function startSubscribingToTopics(bindingport, topics, serialConfig) {
    console.log('Starting subscription to topics');

    topics.forEach((topicConfig) => {
        const { topic, qos = 0, enableExtract = false } = topicConfig;

        // Ensure that the client is only subscribed once per topic
        client.subscribe(topic, { qos }, (error) => {
            if (error) {
                console.error(`Failed to subscribe to topic ${topic} on port ${bindingport}:`, error);
            } else {
                console.log(`Subscribed to ${topic} on port ${bindingport}`);
            }
        });
    });

    // Listen for messages on subscribed topics only once
    if (!client.messageListenerAdded) {
        
        client.on('message', (receivedTopic, message) => {
            // Find the configuration for the received topic
            const topicConfig = topics.find((t) => t.topic === receivedTopic);
            
            if (topicConfig) {
            
                let messageObj;
                
                if (topicConfig.enableExtract) {
                    try {
                        messageObj = JSON.parse(message.toString());
                        console.log(`Received parsed message on ${receivedTopic}:`, messageObj);
                    } catch (error) {
                        console.error(`Failed to parse message on ${receivedTopic}:`, error);
                        return; // Skip processing if JSON parsing fails
                    }
                } else {
                    // Use raw message if enableExtract is false
                    messageObj = message.toString();
                    console.log(`Received raw message on ${receivedTopic}:`, messageObj);
                }
                
                // Apply the transform function if it is not null
                if (topicConfig.transform) {
                    messageObj = topicConfig.transform(messageObj);
                }

                // Write the message to the serial port
                serialPortManager.writeToPort(bindingport, messageObj, serialConfig);
            }
        });

        // Mark that the listener has been added
        client.messageListenerAdded = true;
    }
}

// POST - Stop subscribing for all topics
router.post('/api/mqtt/stop-all-subscribing', async (req, res) => {
    try {
        // Fetch all subscribe topics
        const subscribeTopics = await MQTTSubscribeTopic.find();

        // Iterate over all topics and unsubscribe from each one
        subscribeTopics.forEach((topicConfig) => {
            client.unsubscribe(topicConfig.topic, (error) => {
                if (error) {
                    console.error(`Error unsubscribing from topic ${topicConfig.topic}:`, error);
                } else {
                    console.log(`Unsubscribed from topic ${topicConfig.topic}`);
                }
            });
        });
        mqttsubscribe = false;
        res.status(200).json({ message: 'Unsubscribed from all topics' });
    } catch (error) {
        console.error('Error stopping all subscriptions:', error);
        res.status(500).json({ message: 'Server error while stopping subscriptions.' });
    }
});

/* POST - MQTT Subscribe Topic - For Creating New Topic*/
router.post('/api/mqtt/topics-subscribe-form/', async (req, res) => {
    const { topic, enableExtract, topicExtract, qos, bindingport } = req.body;

    try {
        const newTopic = new MQTTSubscribeTopic({
            topic, enableExtract, topicExtract, qos, bindingport
        });
        const savedTopic = await newTopic.save();
        res.status(201).json({ message: 'Topic saved successfully', data: savedTopic });
    } catch (error) {
        console.error('Error saving topic:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* GET - Get all subscribe topic */
router.get('/api/mqtt/topics-subscribe', async (req, res) => {
    try {
        const topics = await MQTTSubscribeTopic.find();
        res.status(200).json(topics);
    } catch (error) {
        console.error('Error fetching topics:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* POST - MQTT Publish Topic - For Creating New Topic */
router.post('/api/mqtt/topics-publish-form', async (req, res) => {
    const { topic, enableExtract, topicExtract, qos, interval=5000, bindingport, retainFlag } = req.body;

    try {
        
        const final_interval = interval || 5000;

        const newTopic = new MQTTPublishTopic({
            topic, enableExtract, topicExtract, qos, interval:final_interval, bindingport, retainFlag
        });
        const savedTopic = await newTopic.save();
        res.status(201).json({ message: 'Topic saved successfully', data: savedTopic });
    } catch (error) {
        console.error('Error saving topic:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET - Retrieve all MQTT publish topics
router.get('/api/mqtt/topics-publish', async (req, res) => {
    try {
        const topics = await MQTTPublishTopic.find();
        res.status(200).json(topics);
    } catch (error) {
        console.error('Error fetching topics:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET - Retrieve all MQTT subscribe topics
router.get('/api/mqtt/topics-subscribe', async (req, res) => {
    try {
        const topics = await MQTTSubscribeTopic.find();
        res.status(200).json(topics);
    } catch (error) {
        console.error('Error fetching topics:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Default topic and payload for the test
const DEFAULT_TOPIC = '/test1';
const DEFAULT_PAYLOAD = { message: 'Hello from API' };

// API endpoint to publish a message to MQTT
router.post('/api/mqtt/testpublish', (req, res) => {
    // Publish to the default topic with the default payload
    client.publish(
        DEFAULT_TOPIC,
        JSON.stringify(DEFAULT_PAYLOAD),
        { qos: 1, retain: false },
        (error) => {
            if (error) {
                console.error('Error publishing message:', error);
                return res.status(500).json({ success: false, message: 'Failed to publish message' });
            }
            console.log(`Published message to ${DEFAULT_TOPIC}:`, DEFAULT_PAYLOAD);
            res.json({ success: true, message: 'Message published successfully' });
        }
    );
});

function getClient() {
    if (client && client.connected) {
        return client;
    } else {
        console.warn('MQTT client is not connected.');
        return null; // Or handle it as per your requirements
    }
}

/* DELETE - Delete a publish topic by ID */
router.delete('/api/mqtt/topics-publish/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deletedTopic = await MQTTPublishTopic.findByIdAndDelete(id);
        if (!deletedTopic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        res.status(200).json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* DELETE - Delete a subscribe topic by ID */
router.delete('/api/mqtt/topics-subscribe/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deletedTopic = await MQTTSubscribeTopic.findByIdAndDelete(id);
        if (!deletedTopic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        res.status(200).json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* PUT - Edit a publish topic */
router.put('/api/mqtt/topics-publish/:id', async (req, res) => {
    const { id } = req.params;
    const { topic, enableExtract, topicExtract, bindingport, qos, interval, retainflag } = req.body;
    
    // Basic validation
    if (!topic || !bindingport || qos === undefined || !interval) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const updatedTopic = await MQTTPublishTopic.findByIdAndUpdate(
            id,
            { topic, enableExtract, topicExtract, bindingport, qos, interval, retainflag },
            { new: true, runValidators: true }
        );

        if (!updatedTopic) {
            return res.status(404).json({ message: 'Topic not found.' });
        }
        console.log('Updated Topic:', updatedTopic);
        res.status(200).json(updatedTopic);
    } catch (error) {
        console.error('Error updating MQTT topic:', error);
        res.status(500).json({ message: 'Server error while updating topic.' });
    }
});

/* PUT - Edit a subscribe topic */
router.put('/api/mqtt/topics-subscribe/:id', async (req, res) => {
    const { id } = req.params;
    const { topic, enableExtract, topicExtract, bindingport, qos } = req.body;
    
    // Basic validation
    if (!topic || !bindingport || qos === undefined ) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const updatedTopic = await MQTTSubscribeTopic.findByIdAndUpdate(
            id,
            { topic, enableExtract, topicExtract, bindingport, qos },
            { new: true, runValidators: true }
        );

        if (!updatedTopic) {
            return res.status(404).json({ message: 'Topic not found.' });
        }
        console.log('Updated Topic:', updatedTopic);
        res.status(200).json(updatedTopic);
    } catch (error) {
        console.error('Error updating MQTT topic:', error);
        res.status(500).json({ message: 'Server error while updating topic.' });
    }
});

module.exports =  {router, getClient};

/*
    Try to use in anywhere need client
    const { getClient } = require('./path/to/your/router/file');
    const client = getClient();

*/