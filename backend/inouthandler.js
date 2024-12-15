const express = require('express');
const router = express.Router();
const { DigitalOutput, Event, IOReport, DOWrite, IOEvent } = require('./database');
const { readingsStore } = require('./modbusPoller');
const { Gpio } = require('onoff');
const ads1x15 = require('ads1x15');

const FULL_SCALE_VALUE = 32767;
const GAIN_1_VOLTAGE = 4.096; // Full scale voltage for gain = 1
const GAIN_2_VOLTAGE = 2.048; // Full scale voltage for gain = 2
const DIVIDER_SCALE = 2.5; // Voltage divider scale factor
const IC_ADS1115 = 1; // ADS1115 identifier

// Initialize ADS1115
const adc = new ads1x15(IC_ADS1115, 0x48, '/dev/i2c-1');

// Analog input list
let channelData = {};
let inputStates = {
    DI0: 0, // LOW
    DI1: 0, // LOW
    DI2: 0, // LOW
    DI3: 0, // LOW
};
let digitalOutputs, digitalInputs;
let serverRestart = true;
let enablereport = false;
let enabledowrite = false;

// Store active intervals for mosbus events
const activeIntervals = {};
// Store active intervals for IO events
const activeIOIntervals = {};

router.get('/api/iostat', async (req, res) => {
    res.status(200).json({
        enablereport: enablereport,
        enabledowrite: enabledowrite
    });
  });

  
async function initializeADC() {
  try {
    await adc.openBus(1);
    console.log('I2C bus initialized successfully');
  } catch (error) {
    console.error('Failed to initialize I2C bus:', error);
  }
}

// Read all channels (A0 to A3)
async function readAllChannels() {
  
  try {
    for (let channel = 0; channel <= 3; channel++) {
      const rawValue = await adc.readSingleEnded({ channel });
      channelData[`AI${channel}`] = rawValue;
      // console.log(`Channel A${channel}: ${rawValue.toFixed(8)}`);
    }
    return channelData;
  } catch (error) {
    console.error('Error reading channels:', error);
    throw error;
  }
}

// Set up polling to read all channels
setInterval(() => {
    readAllChannels(); 
  }, 1000); 

// Define API endpoint to read all channels
router.get('/api/read-all-channels', async (req, res) => {
  try {
    res.json({ success: true, data: channelData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to read from channels', error: error.message });
  }
});

/* Digital Pin - Output - Uncomment when transfer project*/
try {
    digitalOutputs = {
        DO0: new Gpio(535, 'out'), // GPIO pin 23 for DO1 532-led1-testing
        DO1: new Gpio(536, 'out'), // GPIO pin 24 for DO2
        DO2: new Gpio(537, 'out'), // GPIO pin 25 for DO3
        DO3: new Gpio(538, 'out')  // GPIO pin 26 for DO4
    };

    console.log("GPIO pins initialized successfully."); 
} catch (error) {
    console.error("Error initializing GPIO pins:", error.message);
}

digitalInputs = {
     DI0: new Gpio(525, 'in', 'rising'), // GPIO pin 13 for DI1
     DI1: new Gpio(529, 'in', 'rising'), // GPIO pin 17 for DI2
     DI2: new Gpio(534, 'in', 'rising'), // GPIO pin 22 for DI3
     DI3: new Gpio(539, 'in','rising')  // GPIO pin 27 for DI4 
}

// Initialize digital outputs in the database if they don�t exist
async function initializeDigitalOutputs() {

    const requiredOutputs = ['DO0', 'DO1', 'DO2', 'DO3'];
    try {
        for (const output of requiredOutputs) {
            const existingOutput = await DigitalOutput.findOne({ pin: output });
            if (!existingOutput) {
                await DigitalOutput.create({ pin: output, state: false });
                console.log(`Initialized ${output} in the database.`);
            }
        }
        console.log("Digital outputs initialized in the database.");
    } catch (error) {
        console.error("Error initializing digital outputs:", error.message);
    }
}

// Initalize digital outputs
initializeDigitalOutputs();

/* GET - Get the current state of all digital outputs */
router.get('/api/digital-output', async (req, res) => {
    try {
      // Fetch the current state of all digital outputs from the database
      const states = await DigitalOutput.find({});
      res.status(200).json(states);
    } catch (error) {
      console.error('Error fetching digital output states:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Set up GPIO event listeners for real-time updates
const initializeInputListeners = () => {
    for (let pin in digitalInputs) {
        digitalInputs[pin].watch((err, value) => {
            if (err) {
                console.error(`Error watching GPIO ${pin}:`, err);
            } else {
                inputStates[pin] = value;  // Update the state when a change is detected
                console.log(`GPIO ${pin} state changed to: ${value}`);
            }
        });
    }
};

// Initialize the listeners
initializeInputListeners();

/* GET - Read Digital Input */
router.get('/api/digital-input-states', async (req, res) => {
     try {
        res.status(200).json(inputStates);
     } catch (error) {
        console.error('Error fetching digital input states:', error);
        res.status(500).json({ message: 'Error fetching states', error: error.message });
     }
});

/* POST - Control Digital Output Pin*/
router.post('/api/digital-output', async (req, res) => {
    try {
      const { output, value } = req.body; // Extract the output name and its value (0 or 1)
  
    //   if (!digitalOutputs[output]) {
    //     return res.status(400).json({ error: `Invalid digital output: ${output}` });
    //   }
  
      // Ensure value is either 0 (OFF) or 1 (ON)
      if (value !== 0 && value !== 1) {
        return res.status(400).json({ error: 'Invalid value, must be 0 (OFF) or 1 (ON)' });
      }
  
      // Set the GPIO pin state (1 for ON, 0 for OFF) - Uncomment when transfer project
      digitalOutputs[output].writeSync(value);
      
      //Update the db
      const state = await DigitalOutput.findOneAndUpdate(
        { pin: output },
        { state: value === 1 },
        { new: true, upsert: true }
      );


      res.status(200).json({
        success: true,
        message: `${output} is now ${value === 1 ? 'ON' : 'OFF'}`,
      });
    } catch (error) {
      console.error('Error handling digital output toggle:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/* PATCH - Enable and Disable Event */
router.patch('/api/events/:id/enable', async (req, res) => {
    const eventId = req.params.id;
    const { isEnabled } = req.body;
    try {
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Toggle the `isEnabled` state
        event.isEnabled = isEnabled;
        await event.save();

        if (event.isEnabled) {
            // Start polling with scanning cycle
            startPollingEvent(event);
        } else {
            // Stop polling for this event
            stopPollingEvent(event);
        }

        res.status(200).json({ message: `Event ${event.eventName} ${event.isEnabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
        console.error('Error enabling/disabling event:', error);
        res.status(500).json({ message: 'Error enabling/disabling event', details: error.message });
    }
});

// Function to start polling an event based on its scanning cycle
function startPollingEvent(event) {
    const { scanningCycle } = event;
    const intervalTime = scanningCycle; // Convert seconds to milliseconds

    // Clear any existing interval for this event
    stopPollingEvent(event);

    // Start a new interval for polling
    const intervalId = setInterval(() => {
        controlEvent(event);
    }, intervalTime);

    // Store the interval ID to allow stopping later
    activeIntervals[event._id] = intervalId;
    console.log(`Started polling for event ${event.eventName} every ${scanningCycle} seconds.`);
}

// Function to stop polling an event
function stopPollingEvent(event) {
    const intervalId = activeIntervals[event._id];
    if (intervalId) {
        clearInterval(intervalId);
        delete activeIntervals[event._id];
        console.log(`Stopped polling for event ${event.eventName}.`);
    }
}

// Function to control event based on its trigger conditions
function controlEvent(event) {
    const { triggerCondition, triggerPoint, triggerExecution, triggerAction, upperThreshold, lowerThreshold } = event;
    // console.log(event);
    // Fetch the current value of the trigger point from readingsStore
    let triggerValue;
    
    if(readingsStore[triggerPoint]!==undefined) {
        triggerValue = readingsStore[triggerPoint];
    }else if(channelData[triggerPoint]!==undefined){
        triggerValue = channelData[triggerPoint];
    }else if(inputStates[triggerPoint]!==undefined){
        triggerValue = inputStates[triggerPoint];
    }

    if (triggerValue === undefined) {
        console.warn(`No value found for trigger point: ${triggerPoint}`);
        return; // Exit if no reading available for this trigger point
    }

    // Handle different trigger conditions
    if (triggerCondition === 'larger' || triggerCondition === 'larger equal') {
        const threshold = parseInt(lowerThreshold, 10);
        if (triggerCondition === 'larger' ? triggerValue > threshold : triggerValue >= threshold) {
            console.log('Into Trigger Condition');
            performAction(triggerExecution, triggerAction);
            
        }
    } else if (triggerCondition === 'smaller' || triggerCondition === 'smaller equal') {
        const threshold = parseInt(upperThreshold, 10);
        if (triggerCondition === 'smaller' ? triggerValue < threshold : triggerValue <= threshold) {
            performAction(triggerExecution, triggerAction);
        }
    } else if (triggerCondition === 'within threshold') {
        const lower = parseInt(lowerThreshold, 10);
        const upper = parseInt(upperThreshold, 10);
        if (triggerValue >= lower && triggerValue <= upper) {
            performAction(triggerExecution, triggerAction);
        }
    } else if (triggerCondition === 'out of threshold') {
        const lower = parseInt(lowerThreshold, 10);
        const upper = parseInt(upperThreshold, 10);
        if (triggerValue < lower || triggerValue > upper) {
            performAction(triggerExecution, triggerAction);
        }
    }
}

// Helper function to perform action based on trigger action
async function performAction(output, action) {
    
    console.log('Go into perform action',action);
    
    if (action === 'close') {
        digitalOutputs[output].writeSync(1);
        await DigitalOutput.findOneAndUpdate(
            { pin: output }, 
            { state: true }, 
            { new: true, upsert: true }
        );
        console.log(`Set ${output} to ON (Close)`);
    } else if (action === 'open') {
        digitalOutputs[output].writeSync(0);
        await DigitalOutput.findOneAndUpdate(
            { pin: output }, 
            { state: false }, 
            { new: true, upsert: true }
        );

        console.log(`Set ${output} to OFF (Open)`);
    }
}

/* POST - Set the data acquisition */
router.post('/api/ioreport', async (req, res) => {
    try {
        // Check if a configuration already exists
        const existingConfig = await IOReport.findOne();
        
        let updatedConfig;
        enablereport = req.body?.enableReport? true : false;
        if (existingConfig) {
            // If a configuration exists, update it
            Object.assign(existingConfig, req.body); // Merge new data with existing config
            updatedConfig = await existingConfig.save();
            res.status(200).json({ message: 'Configuration updated successfully', data: updatedConfig });
        } else {
            // If no configuration exists, create a new one
            const newAcquisition = new IOReport(req.body);
            updatedConfig = await newAcquisition.save();
            res.status(201).json({ message: 'Configuration saved successfully', data: updatedConfig }); // Return the correct updatedConfig
        }

    } catch (error) {
        console.error('Error saving configuration:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET - Get the latest configuration
router.get('/api/ioreport', async (req, res) => {
    try {
        const config = await IOReport.find().sort({ createdAt: -1 }).limit(1);
        if (config.length === 0) {
            return res.status(404).json({ message: 'No configuration found' });
        }
        res.status(200).json(config[0]);
    } catch (error) {
        console.error('Error fetching configuration:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* POST - DO Write */
router.post('/api/dowrite', async (req, res) => {
    try {
        const { enablewrite, datachannel, subtopic, subQOS, restopic, resQOS } = req.body;

        // Define the fields to update
        const updateFields = {
            enablewrite,
            datachannel,
            subtopic,
            subQOS,
            restopic,
            resQOS
        };

        enabledowrite = enablewrite? true : false;

        // Use findOneAndUpdate to always update the only document, or create a new one if it doesn't exist
        const options = { new: true, upsert: true }; // `upsert: true` creates if not found
        const dataSet = await DOWrite.findOneAndUpdate(
            {}, // Empty filter to match any document, or create a new one if none exists
            updateFields,
            options
        );

        // Respond with success message and the updated or created document
        res.status(200).json({ message: 'Configuration saved successfully', data: dataSet });
    } catch (error) {
        console.error('Error saving or updating data set:', error);
        res.status(500).json({ message: 'Failed to save or update data set', error: error.message });
    }
});

// GET - Retrive DO Write
router.get('/api/dowrite', async (req, res) => {
    try {
        // Find the latest or specific configuration (adjust as needed for your use case)
        const dataSet = await DOWrite.findOne(); // Retrieve the latest or first record

        if (!dataSet) {
            return res.status(404).json({ message: 'DO Write configuration not found' });
        }

        res.status(200).json(dataSet);
    } catch (error) {
        console.error('Error fetching DO Write configuration:', error);
        res.status(500).json({ message: 'Failed to fetch DO Write configuration', error: error.message });
    }
});

async function WriteDigitalOutput(output,value) {
    digitalOutputs[output].writeSync(value);
      
    //Update the db
    const state = await DigitalOutput.findOneAndUpdate(
    { pin: output },
    { state: value === 1 },
    { new: true, upsert: true }
    );
}

/* ------------- GPIO Event -------------  */

/* POST - Add new event */
router.post('/api/ioevents', async (req, res) => {
    try {
        const event = new IOEvent(req.body);
        const savedEvent = await event.save();
        res.status(201).json(savedEvent);
    } catch (error) {
        console.error('Error saving event:', error);
        res.status(500).json({ error: 'Failed to save event' });
    }
});

/* GET - Retrive events */
router.get('/api/ioevents', async (req, res) => {
    try {
        const events = await IOEvent.find();
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

/* PUT - Update event */
router.put('/api/ioevents/:id', async (req, res) => {
    try {
        const updatedEvent = await IOEvent.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedEvent);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

/* DELETE - Delete event */
router.delete('/api/ioevents/:id', async (req, res) => {
    try {
        await IOEvent.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

router.patch('/api/ioevents/:id/enable', async (req, res) => {
    const eventId = req.params.id;
    const { isEnabled } = req.body;
    try {
        const event = await IOEvent.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Toggle the `isEnabled` state
        event.isEnabled = isEnabled;
        await event.save();

        if (event.isEnabled) {
            // Start polling with scanning cycle
            startPollingIOEvent(event);
        } else {
            // Stop polling for this event
            stopPollingIOEvent(event);
        }

        res.status(200).json({ message: `Event ${event.eventName} ${event.isEnabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
        console.error('Error enabling/disabling event:', error);
        res.status(500).json({ message: 'Error enabling/disabling event', details: error.message });
    }
});

// Function to start polling an event based on its scanning cycle
function startPollingIOEvent(event) {
    const { scanningCycle } = event;
    const intervalTime = scanningCycle; // Convert seconds to milliseconds

    // Clear any existing interval for this event
    stopPollingEvent(event);

    // Start a new interval for polling
    const intervalId = setInterval(() => {
        controlEvent(event);
    }, intervalTime);

    // Store the interval ID to allow stopping later
    activeIOIntervals[event._id] = intervalId;
    console.log(`Started polling for event ${event.eventName} every ${scanningCycle} seconds.`);
}

// Function to stop polling an event
function stopPollingIOEvent(event) {
    const intervalId = activeIOIntervals[event._id];
    if (intervalId) {
        clearInterval(intervalId);
        delete activeIOIntervals[event._id];
        console.log(`Stopped polling for event ${event.eventName}.`);
    }
}

module.exports = { router, initializeADC, inputStates, channelData, WriteDigitalOutput };