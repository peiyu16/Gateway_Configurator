// modbusPoller.js
const ModbusRTU = require('modbus-serial');
const { Device, DeviceNode } = require('./database');

let pollingIntervals = []; // Array to hold polling intervals
let readingsStore = {}; // Store node readings
let modbusClients = {}; // Store Modbus clients for each device path

// Function to connect to Modbus devices on specified ports
async function connectToModbus() {
    try {
        const devices = await Device.find(); // Get all devices

        for (const device of devices) {
            if (!device.selection) {
                console.error(`No port specified for device ${device.name}.`);
                continue;
            }
            
            // Check if a Modbus client already exists for the port
            if (modbusClients[device.selection]) {
                console.log(`Modbus client for port ${device.selection} already exists. Skipping creation.`);
                continue;
            }

            // Initialize a new Modbus client for each device if not already created
            const client = new ModbusRTU();
            await client.connectRTUBuffered(device.selection, { 
                baudRate: device.baudRate || 9600, // Use device-specific baudRate or default to 9600
                // Configure dataBits, parity, stopBits if necessary
            });

            // Store the client in the modbusClients object
            modbusClients[device.selection] = client;
            console.log(`Connected to Modbus device ${device.name} on port: ${device.selection}`);
        }
    } catch (error) {
        console.error('Error connecting to Modbus devices:', error.message);
    }
}

// Polling function for each node
async function pollNode(device, node) {
    const client = modbusClients[device.selection]; // Use the client associated with the device's port

    if (!client) {
        console.error(`No Modbus client found for device ${device.name} on port ${device.port}.`);
        return;
    }

    client.setID(parseInt(device.address, 10));

    try {
        const registerLength = (node.dataType === 1 || node.dataType === 4 || node.dataType === 5) ? 1 : 2;
        let value;

        switch (node.functionCode) {
            case "01":
                value = await client.readCoils(node.registerAddress, 1);
                console.log(`Device ${device.name}, Node ${node.Name} (Coil):`, value.data);
                readingsStore[node.Name] = value.data;
                break;
            case "02":
                value = await client.readDiscreteInputs(node.registerAddress, 1);
                console.log(`Device ${device.name}, Node ${node.Name} (Input Status):`, value.data);
                readingsStore[node.Name] = value.data;
                break;
            case "03":
                value = await client.readHoldingRegisters(node.registerAddress, registerLength);
                console.log(`Device ${device.name}, Node ${node.Name} (Holding Register):`, (value.data/10));
                readingsStore[node.Name] = (value.data/10);
                break;
            case "04":
                value = await client.readInputRegisters(node.registerAddress, registerLength);
                console.log(`Device ${device.name}, Node ${node.Name} (Input Register):`, value.data);
                readingsStore[node.Name] = value.data;
                break;
            default:
                console.error(`Unsupported function code: ${node.functionCode} for node ${node.Name}`);
        }
    } catch (error) {
        console.error(`Error polling device ${device.name}, node ${node.Name}:`, error.message);
    }
}

// Clear existing polling intervals
function clearPolling() {
    pollingIntervals.forEach(clearInterval);
    pollingIntervals = [];
}

// Set up polling for each device and node
async function startPolling() {
    await connectToModbus(); // Connect to all devices based on their ports
    clearPolling(); // Stop any existing polling

    const devices = await Device.find();
    const nodes = await DeviceNode.find();
    
    devices.forEach(device => {
        const deviceNodes = nodes.filter(node => node.deviceName.toString() === device.address.toString());
        deviceNodes.forEach(node => {
            const pollingInterval = device.interval || 5000; // Default to 5 seconds
            const intervalId = setInterval(() => {
                pollNode(device, node);
            }, pollingInterval);
            pollingIntervals.push(intervalId);
        });
    });
}

async function writeToModbusDevice(deviceID, functionCode, registerAddress, value) {
    try {
        
        if (Object.keys(modbusClients).length === 0) {
            await connectToModbus();
        }
        
        const device = await Device.findOne({ address: deviceID });

        if (!device) {
            throw new Error(`Device with address ${deviceID} not found`);
        }

        const { selection } = device; // Get the selection value from the device // Get Modbus client for the device
        const modbusClient = modbusClients[selection];
        
        if (!modbusClient) {
            throw new Error(`No Modbus client found for device with selection ${selection}`);
        }
        // Normalize functionCode to string (in case it's an integer)
        functionCode = String(functionCode);
        
        modbusClient.setID(parseInt(deviceID, 10))
        console.log(`Modbus ID set to ${deviceID}`);
        
        // Handle different function codes
        switch (functionCode) {
            case "05": // Write Single Coil (Function Code 5)
                //await modbusClient.writeCoil(registerAddress, value); // Write coil (bit)
                console.log(`Wrote to Coil ${registerAddress} with value: ${value}`);
                break;

            case "06": // Write Single Register (Function Code 6)
                //await client.writeRegister(registerAddress, value); // Write holding register (16-bit)
                console.log(`Wrote to Holding Register ${registerAddress} with value: ${value}`);
                break;

            case "15": // Write Multiple Coils (Function Code 15)
                //await modbusClient.writeCoils(registerAddress, value); // Write multiple coils
                console.log(`Wrote to multiple coils starting at address ${registerAddress}`);
                break;

            case "16": // Write Multiple Registers (Function Code 16)
                //await modbusClient.writeRegisters(registerAddress, value); // Write multiple registers
                console.log(`Wrote to multiple Holding Registers starting at ${registerAddress}`);
                break;

            default:
                console.error(`Unsupported function code: ${functionCode}`);
                throw new Error(`Unsupported function code: ${functionCode}`);
        }
    } catch (error) {
        console.error('Error writing to Modbus device:', error.message);
        throw error;
    }
}

module.exports = { startPolling, clearPolling, readingsStore, writeToModbusDevice };