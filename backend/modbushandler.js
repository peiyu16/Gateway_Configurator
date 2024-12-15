const express = require('express');
const router = express.Router();
const { Device, DeviceNode, DataAcquisition, DataSet, Event } = require('./database');
const {startPolling, clearPolling} = require('./modbusPoller');

let serverRestart = true;
let enabledAcq = false;
let enableReg = false;

// const DataAct = async () => {
//     try {
//         const result = await DataAcquisition.deleteMany({});
//         const result1 = await Event.deleteMany({});
//         const result2 = await DataSet.deleteMany({});

//     } catch (error) {
//         console.error('Error deleting MQTT configuration:', error);
//     }
// };
// DataAct();

router.get('/api/modbusstat', async (req, res) => {
  res.status(200).json({
    enabledAcq: enabledAcq,
    enableReg: enableReg
  });
});

/* POST - Set the data acquisition */
router.post('/api/dataacquisition', async (req, res) => {
    try {
        // Check if a configuration already exists
        const existingConfig = await DataAcquisition.findOne();
        
        let updatedConfig;
        
        if (existingConfig) {
            // If a configuration exists, update it
            Object.assign(existingConfig, req.body); // Merge new data with existing config
            updatedConfig = await existingConfig.save();
            res.status(200).json({ message: 'Configuration updated successfully', data: updatedConfig });
        } else {
            // If no configuration exists, create a new one
            const newAcquisition = new DataAcquisition(req.body);
            updatedConfig = await newAcquisition.save();
            res.status(201).json({ message: 'Configuration saved successfully', data: updatedConfig }); // Return the correct updatedConfig
        }
        
        // Manage polling based on the updated configuration
        if (updatedConfig.enableDataAct) {
            startPolling(); // Start polling if enabled
            enabledAcq = true;
        } else {
            clearPolling(); // Stop polling if disabled
            enabledAcq = false;
        }

    } catch (error) {
        console.error('Error saving configuration:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET - Get the latest configuration
router.get('/api/dataacquisition', async (req, res) => {
    try {
        const config = await DataAcquisition.find().sort({ createdAt: -1 }).limit(1);
        if (config.length === 0) {
            return res.status(404).json({ message: 'No configuration found' });
        }
        res.status(200).json(config[0]);
    } catch (error) {
        console.error('Error fetching configuration:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET - Retrive Data Set
router.get('/api/dataset', async (req, res) => {
    try {
        // Find the latest or specific configuration (adjust as needed for your use case)
        const dataSet = await DataSet.findOne(); // Retrieve the latest or first record

        if (!dataSet) {
            return res.status(404).json({ message: 'Data set configuration not found' });
        }

        res.status(200).json(dataSet);
    } catch (error) {
        console.error('Error fetching data set configuration:', error);
        res.status(500).json({ message: 'Failed to fetch data set configuration', error: error.message });
    }
});

/* POST - Data Set */
router.post('/api/dataset', async (req, res) => {
    try {
        const { enableset, datachannel, subtopic, subQOS, restopic, resQOS } = req.body;

        // Define the fields to update
        const updateFields = {
            enableset,
            datachannel,
            subtopic,
            subQOS,
            restopic,
            resQOS
        };

        // Use findOneAndUpdate to always update the only document, or create a new one if it doesn't exist
        const options = { new: true, upsert: true }; // `upsert: true` creates if not found
        const dataSet = await DataSet.findOneAndUpdate(
            {}, // Empty filter to match any document, or create a new one if none exists
            updateFields,
            options
        );

        enableReg = enableset? true : false;

        // Respond with success message and the updated or created document
        res.status(200).json({ message: 'Configuration saved successfully', data: dataSet });
    } catch (error) {
        console.error('Error saving or updating data set:', error);
        res.status(500).json({ message: 'Failed to save or update data set', error: error.message });
    }
});

/* POST - Create new node */
router.post('/api/nodes', async (req,res) => {

    try{
        const newNode = new DeviceNode(req.body);
        await newNode.save();
        console.log('New device node added: ', newNode);
        res.status(201).json({ message: 'Device Node added', data: newNode });
    }catch(e){
        console.error('Error adding nodes',e.message);
        res.status(500).json({ message: 'Server error', error: e.message });
    }
    
})

/* GET - get Device Node */
router.get('/api/nodes', async (req, res) => {
    try {
      const nodes = await DeviceNode.find({});
      res.json(nodes.map(node => ({
        id: node._id,  // Map `_id` to `id`
        Name: node.Name,
        functionCode: node.functionCode,
        deviceName: node.deviceName,
        registerAddress: node.registerAddress,
        dataType: node.dataType
      })));
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* PUT - Update Device Node */
router.put('/api/nodes/:id', async (req, res) => {
    const { id } = req.params;
    const { Name, functionCode, deviceName, registerAddress, dataType } = req.body;
  
    try {
      console.log(`Updating node with ID: ${id}`);
      const updatedNode = await DeviceNode.findByIdAndUpdate(
        id,
        { Name, functionCode, deviceName, registerAddress, dataType },
        { new: true}
      );
  
      if (!updatedNode) {
        console.log('Device Node not found');
        return res.status(404).json({ message: 'Device Node not found' });
      }
  
      console.log('Device Node updated:', updatedNode);
      return res.status(200).json({ message: 'Device Node updated', data: updatedNode });
    } catch (error) {
      console.error('Error updating device node:', error.message);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* DELETE - Delete Device node */
router.delete('/api/nodes/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      
      const deletedDeviceNode = await DeviceNode.findByIdAndDelete(id);
  
      if (!deletedDeviceNode) {
        return res.status(404).json({ message: 'Device Node not found' });
      }
  
      res.status(200).json({ message: 'Device Node deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* GET - Get Devices */
router.get('/api/devices', async (req, res) => {
    try {
      const devices = await Device.find({});
      res.json(devices.map(device => ({
        id: device._id,  // Map `_id` to `id`
        name: device.name,
        selection: device.selection,
        address: device.address,
        interval: device.interval,
        timeout: device.timeout
      })));
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* POST - Create New device */
router.post('/api/devices', async (req, res) => {
    const { name, selection, address, interval, timeout } = req.body;
  
    try {
      console.log('Creating new device');
      const newDevice = new Device({
        name,
        selection,
        address,
        interval,
        timeout
      });
  
      await newDevice.save();
      console.log('New device added:', newDevice);
      res.status(201).json({ message: 'Device added', data: newDevice });
    } catch (error) {
      console.error('Error adding device:', error.message);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* PUT - Update Device */
router.put('/api/devices/:id', async (req, res) => {
    const { id } = req.params;
    const { name, selection, address, interval, timeout } = req.body;
  
    try {
      console.log(`Updating device with ID: ${id}`);
      const updatedDevice = await Device.findByIdAndUpdate(
        id,
        { name, selection, address, interval, timeout },
        { new: true}
      );
  
      if (!updatedDevice) {
        console.log('Device not found');
        return res.status(404).json({ message: 'Device not found' });
      }
  
      console.log('Device updated:', updatedDevice);
      return res.status(200).json({ message: 'Device updated', data: updatedDevice });
    } catch (error) {
      console.error('Error updating device:', error.message);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* DELETE - Delete Device */
router.delete('/api/devices/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      
      const deletedDevice = await Device.findByIdAndDelete(id);
  
      if (!deletedDevice) {
        return res.status(404).json({ message: 'Device not found' });
      }
  
      res.status(200).json({ message: 'Device deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all events
router.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find();
        res.json(events);

        serverRestart = false;
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Add a new event
router.post('/api/events', async (req, res) => {
    try {
        const event = new Event(req.body);
        const savedEvent = await event.save();
        res.status(201).json(savedEvent);
    } catch (error) {
        console.error('Error saving event:', error);
        res.status(500).json({ error: 'Failed to save event' });
    }
});

// Update an event
router.put('/api/events/:id', async (req, res) => {
    try {
        const updatedEvent = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedEvent);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});

// Delete an event
router.delete('/api/events/:id', async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

module.exports = { router };