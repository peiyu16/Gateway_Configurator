// routes/awsiot.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { AWSIoTConfig, AWSIoTPublishTopic, AWSIoTSubscribeTopic, SerialPortConfig, DOWrite, DataSet } = require('./database');
const mqtt = require('mqtt');
const serialPortManager = require('./serialPortManager');
const { inputStates, channelData, WriteDigitalOutput} = require('./inouthandler');
const { readingsStore, writeToModbusDevice } = require('./modbusPoller');

const upload = multer({ storage: multer.memoryStorage() });

let awsClient = null;
let awsiotpublish = false;
let awsiotsubscribe = false;
let reportIntervalId = null;
let reportInterval_ioreport = null;
let registerWriteListener = false;
let DOWriteListener = false;

// const deleteMQTTConfigOnStartup = async () => {
//     try {
//         const result = await AWSIoTConfig.deleteMany({});
//         const result1 = await AWSIoTConfig.deleteMany({});
//         const result2 = await AWSIoTConfig.deleteMany({});

//     } catch (error) {
//         console.error('Error deleting MQTT configuration:', error);
//     }
// };
// deleteMQTTConfigOnStartup();

// GET - Retrieve the values of mqttpublish and mqttsubscribe
router.get('/api/awsiot/status', (req, res) => {
    res.status(200).json({
        awsiotpublish: awsiotpublish,
        awsiotsubscribe: awsiotsubscribe,
        awsClient: awsClient !== null
    });
});

const tlsVersions = {
    "TLS1.2": "TLSv1_2_method",
    "TLS1.3": "TLSv1_3_method"
};
const intervalStore = {};

async function generatePortsConfig() {
    try {
        // Fetch all serial port configurations
        const serialPorts = await SerialPortConfig.find();

        // Fetch all MQTT topics
        const mqttTopics = await AWSIoTPublishTopic.find();

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
    const mqttTopics = await AWSIoTSubscribeTopic.find();

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

// API to configure and connect to AWS IoT
router.post('/api/awsiot/configure', upload.fields([
    { name: 'serverCA' },
    { name: 'clientCA' },
    { name: 'clientKey' }
]), async (req, res) => {
    const {
        enableService, clientID, serverAddress, serverPort = 8883, keepAlive = 60,
        reconnectTimeout, reconnectInterval = 5, cleanSession = true, sslProtocol = 'TLS1.2'
    } = req.body;

    // Convert fields to their expected types
    const configData = {
        enableService: enableService === 'true',
        clientID,
        serverAddress,
        serverPort: parseInt(serverPort, 10),
        keepAlive: parseInt(keepAlive, 10),
        reconnectTimeout: parseInt(reconnectTimeout, 10),
        reconnectInterval: parseInt(reconnectInterval, 10),
        cleanSession: cleanSession === 'true',
        sslProtocol
    };

    // Save to database
    const updatedConfig = await AWSIoTConfig.findOneAndUpdate(
        { internalId: 'defaultConfig' },
        configData,
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!configData.enableService) {
        if (awsClient) {
            awsClient.end(true);
            awsClient.removeAllListeners();
            awsClient = null;
        }
        return res.status(200).json({ message: 'AWS IoT service is disabled, but configuration updated.' });
    }

    // Set MQTT options
    const mqttOptions = {
        clientId: clientID,
        keepalive: configData.keepAlive,
        reconnectPeriod: configData.reconnectInterval * 1000,
        connectTimeout: configData.reconnectTimeout? configData.reconnectTimeout * 1000 : 5000,
        clean: configData.cleanSession,
        protocolVersion: 4 // Use MQTT v3.1.1 as AWS IoT primarily supports this
    };

    // Configure SSL options if enabled
    const protocol = 'mqtts';
    if (req.files.serverCA && req.files.serverCA[0]) {
        mqttOptions.ca = req.files.serverCA[0].buffer;
    }
    if (req.files.clientCA && req.files.clientCA[0]) {
        mqttOptions.cert = req.files.clientCA[0].buffer;
    }
    if (req.files.clientKey && req.files.clientKey[0]) {
        mqttOptions.key = req.files.clientKey[0].buffer;
    }

    if (!mqttOptions.ca || !mqttOptions.cert || !mqttOptions.key) {
        return res.status(400).json({ message: 'SSL files (CA, Cert, Key) must be provided for a secure connection.' });
    }
    mqttOptions.secureProtocol = tlsVersions[sslProtocol] || 'TLSv1_2_method';

    // Close existing client connection if necessary
    if (awsClient) {
        awsClient.end(true);
        awsClient.removeAllListeners();
    }

    // Initialize a new MQTT connection
    try {
        awsClient = mqtt.connect(`${protocol}://${serverAddress}:${serverPort}`, mqttOptions);

        awsClient.on('connect', () => {
            console.log('Connected to AWS IoT');
            if (!res.headersSent) {
                res.status(200).json({ message: 'Connected to AWS IoT successfully!' });
            }
        });

        awsClient.on('error', (error) => {
            console.error('Connection error:', error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Connection to AWS IoT failed', error: error.message });
            }
        });

        awsClient.on('close', () => console.log('AWS IoT connection closed'));
        awsClient.on('reconnect', () => console.log('Reconnecting to AWS IoT...'));
        awsClient.on('offline', () => console.log('AWS IoT client offline'));

    } catch (error) {
        console.error('AWS IoT Connection Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'AWS IoT client initialization failed', error: error.message });
        }
    }
});

/* GET - Get AWS IoT Latest Config */
router.get('/api/awsiot/latest-config', async (req, res) => {
    try {
        const latestConfig = await AWSIoTConfig.findOne().sort({ createdAt: -1 }); 
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

/* POST - Creating New Publish Topic*/
router.post('/api/awsiot/topics-publish-form', async (req, res) => {
    const { topic, enableExtract, topicExtract, qos, interval=5, bindingport, retainFlag } = req.body;

    try {
        const timeinMS = interval * 1000;

        const newTopic = new AWSIoTPublishTopic({
            topic, enableExtract, topicExtract, qos, interval: timeinMS, bindingport, retainFlag
        });
        const savedTopic = await newTopic.save();
        res.status(201).json({ message: 'Topic saved successfully', data: savedTopic });
    } catch (error) {
        console.error('Error saving topic:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* GET - Get All Publish Topics from DB */
router.get('/api/awsiot/topics-publish', async (req, res) => {
    try {
        const topics = await AWSIoTPublishTopic.find();
        res.status(200).json(topics);
    } catch (error) {
        console.error('Error fetching topics:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* DELETE - Delete the Publish Topic */
router.delete('/api/awsiot/topics-publish/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deletedTopic = await AWSIoTPublishTopic.findByIdAndDelete(id);
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
router.put('/api/awsiot/topics-publish/:id', async (req, res) => {
    const { id } = req.params;
    const { topic, enableExtract, topicExtract, bindingport, qos, interval, retainflag } = req.body;
    
    // Basic validation
    if (!topic || !bindingport || qos === undefined || !interval) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const updatedTopic = await AWSIoTPublishTopic.findByIdAndUpdate(
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

/* POST - Start Publishing the Topics */
/* POST - Publish Topics to AWS IoT */
router.post('/api/awsiot/topics-publish', async (req, res) => {

    if (awsClient === null) {  // or `if (client === null)` if you prefer explicit equality
        return res.status(400).json({
            message: 'AWS IoT client connection is not established. Please ensure the client is connected before publishing.'
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
            awsiotpublish = true;
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

    // Publish the message
    awsClient.publish(
        topic,
        JSON.stringify(publishMessage),
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
            const latestData = serialPortManager.latestData[bindingport];
            if (latestData) {
                publishToTopic(latestData, bindingport, topicConfig);
            }
        }, interval);

        console.log(`Started interval-based publishing to ${topicConfig.topic} every ${interval}ms on port ${bindingport}`);
    });
}

// POST - Stop publishing for all topics
router.post('/api/awsiot/stop-all-publishing', async (req, res) => {
    try {
        // Fetch all publish topics
        const publishTopics = await AWSIoTPublishTopic.find();
        
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
        awsiotpublish = false;
        res.status(200).json({ message: 'Stopped publishing for all topics' });
    } catch (error) {
        console.error('Error stopping all publishing:', error);
        res.status(500).json({ message: 'Server error while stopping publishing.' });
    }
});

/* POST - Creating New Subscribing Topic */
router.post('/api/awsiot/topics-subscribe-form/', async (req, res) => {
    const { topic, enableExtract, topicExtract, qos, bindingport } = req.body;

    try {
        const newTopic = new AWSIoTSubscribeTopic({
            topic, enableExtract, topicExtract, qos, bindingport
        });
        const savedTopic = await newTopic.save();
        res.status(201).json({ message: 'Topic saved successfully', data: savedTopic });
    } catch (error) {
        console.error('Error saving topic:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* GET - Retrive Subscribing Topics */
router.get('/api/awsiot/topics-subscribe', async (req, res) => {
    try {
        const topics = await AWSIoTSubscribeTopic.find();
        res.status(200).json(topics);
    } catch (error) {
        console.error('Error fetching topics:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* DELETE - Delete Subscribing Topics */
router.delete('/api/awsiot/topics-subscribe/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deletedTopic = await AWSIoTSubscribeTopic.findByIdAndDelete(id);
        if (!deletedTopic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        res.status(200).json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* PUT - Edit a subscribe topic */
router.put('/api/awsiot/topics-subscribe/:id', async (req, res) => {
    const { id } = req.params;
    const { topic, enableExtract, topicExtract, bindingport, qos } = req.body;
    
    // Basic validation
    if (!topic || !bindingport || qos === undefined ) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const updatedTopic = await AWSIoTSubscribeTopic.findByIdAndUpdate(
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

/* POST - Start Subscribing Topic*/
router.post('/api/awsiot/topics-subscribe', async (req, res) => {

    if (awsClient === null) {  // or `if (client === null)` if you prefer explicit equality
        return res.status(400).json({
            message: 'AWS IoT client connection is not established. Please ensure the client is connected before subscribing.'
        });
    }
    
    try {
        const portsConfig = await generateSubscriptionConfig();
        console.log(portsConfig);

        if (portsConfig && portsConfig.length > 0) { // Ensure portsConfig is an array and not empty
            console.log('Can proceed with subscription');
            portsConfig.forEach(({ bindingport, serialConfig, topics }) => {
                if(topics.length > 0) {
                    // Start subscribing to topics
                    startSubscribingToTopics(bindingport, topics, serialConfig);
                } 
            });
            awsiotsubscribe = true;
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

    // Subscribe to topics
    topics.forEach((topicConfig) => {
        const { topic, qos = 0, enableExtract = false } = topicConfig;

        awsClient.subscribe(topic, { qos }, (error) => {
            if (error) {
                console.error(`Failed to subscribe to topic ${topic} on port ${bindingport}:`, error);
            } else {
                console.log(`Subscribed to ${topic} on port ${bindingport}`);
            }
        });
    });

    // Ensure the message listener is added only once
    if (!awsClient.messageListenerAdded) {
        awsClient.on('message', (receivedTopic, message) => {

            // Find the configuration for the received topic
            const topicConfig = topics.find((t) => t.topic === receivedTopic);
            if (topicConfig) {
                let messageString;
                
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

        // Mark the listener as added
        awsClient.messageListenerAdded = true;
    }
}

// POST - Stop subscribing for all topics
router.post('/api/awsiot/stop-all-subscribing', async (req, res) => {
    try {
        // Fetch all subscribe topics
        const subscribeTopics = await AWSIoTSubscribeTopic.find();

        // Iterate over all topics and unsubscribe from each one
        subscribeTopics.forEach((topicConfig) => {
            awsClient.unsubscribe(topicConfig.topic, (error) => {
                if (error) {
                    console.error(`Error unsubscribing from topic ${topicConfig.topic}:`, error);
                } else {
                    console.log(`Unsubscribed from topic ${topicConfig.topic}`);
                }
            });
        });
        awsiotsubscribe = false;
        res.status(200).json({ message: 'Unsubscribed from all topics' });
    } catch (error) {
        console.error('Error stopping all subscriptions:', error);
        res.status(500).json({ message: 'Server error while stopping subscriptions.' });
    }
});

router.post('/api/awsiot/dataacquisition/publish', (req, res) => {
    const { enableReport, dataChannel, reportTopic, reportQOS, reportInterval, reportTemplate } = req.body;
    
    if (awsClient === null) {  // or `if (client === null)` if you prefer explicit equality
        return res.status(400).json({
            message: 'AWS IoT client connection is not established. Please ensure the client is connected before data reporting.'
        });
    }
    
    if (!enableReport) {
        return res.status(400).json({ error: "Reporting is not enabled or data channel is not MQTT" });
    }

    let converted = 5000;
    if(reportInterval){
        converted = parseInt(reportInterval,10)*1000;
    }else{
        converted = 5000;
    }

    // Clear any existing interval
    if (reportIntervalId) {
        clearInterval(reportIntervalId);
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

            // Publish the message to the MQTT topic
            awsClient.publish(reportTopic, JSON.stringify(message), { qos: reportQOS }, (error) => {
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

    res.json({ message: "Scheduled data publishing to AWS IoT" });
});

router.post('/api/awsiot/dataacquisition/stoppublish', (req, res) => {
    // Clear any existing interval
    if (reportIntervalId) {
        clearInterval(reportIntervalId);
    }
    reportIntervalId = null;

    res.json({ message: "Stop data publishing to AWS IoT" });

});

router.post('/api/awsiot/dataset/subscribe', (req, res) => {
    const { subtopic, subQOS, restopic, resQOS } = req.body;

    // if (!subtopic || !subQOS || !restopic || !resQOS) {
    //     return res.status(400).json({ message: 'Missing required fields' });
    // }

    if (awsClient == null) {
        return res.status(400).json({
            message: 'AWS IoT client connection is not established. Please ensure the client is connected before subscribing to topic.'
        });
    }

    let parsedQOS1 = parseInt(subQOS, 10);
    let parsedQOS2 = parseInt(resQOS, 10);

    // Subscribe to the topic with the provided QoS
    awsClient.subscribe(subtopic, { qos: parsedQOS1 }, (err) => {
        console.log(`Subscribed to topic: ${subtopic} with QoS: ${subQOS}`);
        // Handle incoming messages on the subscribed topic
    });

    if(registerWriteListener === false){
        awsClient.on('message', async (topic, message) => {
            console.log('Testing try to listen');
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
                awsClient.publish(restopic, JSON.stringify(responseMessage), { qos: parsedQOS2 });
                console.log(`Published response to ${restopic}`);
            }
        });
        registerWriteListener = true;
    
    }
    

    res.status(200).json({ message: `Successfully subscribed to ${subtopic}` });
});

router.post('/api/awsiot/dataset/stoplistening', async (req, res) => {
    try {
        // Retrieve the dataset configuration from the database
        const dataSetConfig = await DataSet.findOne();

        const { subtopic } = dataSetConfig;

        // Unsubscribe from the topic
        awsClient.unsubscribe(subtopic, (err) => {
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

router.post('/api/awsiot/ioreport/publish', (req, res) => {
    const { enableReport, dataChannel, reportTopic, reportQOS, reportInterval, reportTemplate } = req.body;

    let converted = reportInterval == null? 5000 : reportInterval*1000;

    if (awsClient === null) {  // or `if (client === null)` if you prefer explicit equality
        return res.status(400).json({
            message: 'AWS IoT client connection is not established. Please ensure the client is connected before data reporting.'
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
            awsClient.publish(reportTopic, JSON.stringify(message), { qos: reportQOS }, (error) => {
                if (error) {
                    console.error("Error publishing to AWS IoT:", error.message);
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

router.post('/api/awsiot/ioreport/stoppublish', (req, res) => {
    // Clear any existing interval
    if (reportInterval_ioreport) {
        clearInterval(reportInterval_ioreport);
    }
    reportInterval_ioreport = null;
    res.json({ message: "Stop publishing IO status to AWS IoT" });

});

router.post('/api/awsiot/dowrite/subscribe', (req, res) => {
    const { datachannel, subtopic, subQOS, restopic, resQOS } = req.body;

    if (awsClient === null) {
        return res.status(400).json({
            message: 'AWS IoT client connection is not established. Please ensure the client is connected before subscribing to topic.'
        });
    }

    let parsedQOS1 = parseInt(subQOS, 10);
    let parsedQOS2 = parseInt(resQOS, 10);
    // Subscribe to the topic with the provided QoS
    awsClient.subscribe(subtopic, { qos: parsedQOS1 }, (err) => {
        

        console.log(`Subscribed to topic: ${subtopic} with QoS: ${subQOS}`);

        // Handle incoming messages on the subscribed topic
        if(!DOWriteListener){
            awsClient.on('message', async (topic, message) => {
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
                    awsClient.publish(restopic, JSON.stringify(responseMessage), { qos: parsedQOS2 });
                    console.log(`Published response to ${restopic}`);
                }
            });
            DOWriteListener = true;

        }
        res.status(200).json({ message: `Successfully subscribed to ${subtopic}` });
    });
});

router.post('/api/awsiot/dowrite/stoplistening', async (req, res) => {
    try {
        // Retrieve the dataset configuration from the database
        const dataSetConfig = await DOWrite.findOne();

        const { subtopic } = dataSetConfig;

        // Unsubscribe from the topic
        awsClient.unsubscribe(subtopic, (err) => {
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

module.exports = { router };
