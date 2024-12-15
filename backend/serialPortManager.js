const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');

class SerialPortManager extends EventEmitter {
    constructor() {
        super();
        this.openedPorts = {}; // Store opened ports
        this.latestData = {};  // Store latest data for each port
    }

    async getPort(bindingport, serialConfig) {
        if (!this.openedPorts[bindingport]) {
            const port = new SerialPort({
                path: serialConfig.path,
                baudRate: serialConfig.baudRate,
                dataBits: serialConfig.dataBits,
                parity: serialConfig.parityBit,
                stopBits: serialConfig.stopBit,
                flowControl: serialConfig.flowControl === 'software' ? 'software' : undefined,
                autoOpen: false,
            });

            const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
            this.openedPorts[bindingport] = { port, parser, hasDataListener: false };

            port.on('error', (err) => {
                console.error(`Error on port ${bindingport}:`, err.message);
                if (err.message.includes('Access denied')) {
                    this.reopenPort(bindingport, serialConfig);
                }
            });

            port.on('close', () => {
                console.log(`Port ${bindingport} closed unexpectedly. Attempting to reopen...`);
                this.reopenPort(bindingport, serialConfig);
            });

            this.openPort(bindingport, serialConfig);
        }

        return this.openedPorts[bindingport];
    }

    openPort(bindingport, serialConfig) {
        const { port } = this.openedPorts[bindingport];
        port.open((err) => {
            if (err) {
                console.error(`Failed to open port ${bindingport}:`, err.message);
                if (err.message.includes('Access denied')) {
                    setTimeout(() => this.openPort(bindingport, serialConfig), 3000);
                }
                return;
            }
            console.log(`Serial port ${bindingport} opened`);
            this.emit('portOpened', bindingport);
        });
    }

    reopenPort(bindingport, serialConfig) {
        const { port } = this.openedPorts[bindingport];
        if (port && port.isOpen) {
            port.close((err) => {
                if (err) console.error(`Failed to close port ${bindingport}:`, err.message);
                else console.log(`Port ${bindingport} closed successfully. Reopening...`);
                this.openPort(bindingport, serialConfig);
            });
        } else {
            this.openPort(bindingport, serialConfig);
        }
    }

    async listenToData(bindingport, serialConfig) {
        const portData = await this.getPort(bindingport, serialConfig);
        const port = portData.port;
    
        console.log('Listen to port');

        // For testing purposes only
        // Remove any existing listener to avoid conflicts
        if (port.hasDataListener) {
            console.log(`Removing existing listener from port: ${bindingport}`);
            portData.parser.removeAllListeners('data');
            port.hasDataListener = false; // Reset the listener flag
        }

        //if (!port.hasDataListener) {
            let buffer = '';
            // Add a data listener only if it doesn't already exist
            const dataListener = (data) => {
                buffer += data.toString('utf8').trim(); // Append new data to the buffer
            
                // Check if the buffer contains JSON-like data
                if (buffer.startsWith('{') && buffer.endsWith('}')) {
                    try {
                        // Handle cases where multiple `{` exist at the start
                        while (buffer.startsWith('{{')) {
                            buffer = buffer.slice(1); // Remove extra leading `{`
                        }

                        const messageObj = JSON.parse(buffer); // Attempt to parse as JSON
                        console.log('Parsed Data:', messageObj);

                        // Update the latest data for this port with JSON
                        this.latestData[bindingport] = messageObj;

                        // Emit an event with the parsed JSON data
                        this.emit('data', { bindingport, messageObj });

                        // Clear the buffer after successfully processing the JSON
                        buffer = '';
                    } catch (error) {
                        console.log('Buffer:', buffer);
                        console.error('Error parsing incoming message as JSON:', error.message);

                        // Clear the buffer on parsing error to avoid reprocessing the same bad data
                        buffer = '';
                    }
                } else {
                    // Handle non-JSON raw data
                    console.log('Raw Data:', buffer);

                    // Update the latest data for this port with raw data
                    this.latestData[bindingport] = buffer;

                    // Emit an event for raw data
                    this.emit('rawData', { bindingport, rawData: buffer });

                    // Clear the buffer after processing raw data
                    buffer = '';
                }
            
                // Safety check: Clear the buffer if it grows too large
                if (buffer.length > 1024) {
                    console.warn('Buffer too large, clearing to avoid memory issues.');
                    buffer = ''; // Clear the buffer
                }
            };
    
            // Add the listener to the parser
            portData.parser.on('data', dataListener);
    
            // Mark this port as having an active data listener
            port.hasDataListener = true;
    
            // Optional: Keep track of listeners and remove if not needed
            //portData.parser.removeListener('data', dataListener);
        //}
    }

    // Write data to the serial port asynchronously
    async writeToPort(bindingport, messageObj, serialConfig) {
        const portData = await this.getPort(bindingport, serialConfig);
        if (!portData) {
            console.error(`Failed to open port ${bindingport}`);
            return;
        }

        const port = portData.port;
        const messageString = JSON.stringify(messageObj); // JSON.stringify(

        port.write(messageString + '\n', (error) => {
            if (error) {
                console.error(`Error writing to port ${bindingport}:`, error.message);
            } else {
                console.log(`Message sent to port ${bindingport}:`, messageString);
            }
        });
    }

    // Optional: Add a method to get the latest data for a specific port
    getLatestData(bindingport) {
        return this.latestData[bindingport] || null;
    }
}

module.exports = new SerialPortManager();
