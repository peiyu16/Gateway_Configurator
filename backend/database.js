// database.js
const mongoose = require('mongoose');

const mqttConfigSchema = new mongoose.Schema({
    internalId: {
        type: String,
        default: 'defaultConfig',
        unique: true,
        required: true,
        index: true // Ensure quick look-up for the default configuration
    },
    enablemqtt: { 
        type: Boolean, 
        default: false 
    },
    hostname: {
        type: String,
        required: function() { return this.enablemqtt; }, // Only require hostname if MQTT is enabled
        trim: true // Remove whitespace from the beginning and end
    },
    clientID: {
        type: String,
        required: function() { return this.enablemqtt; },
        trim: true
    },
    version: {
        type: Number,
        default: 4
    },
    clean: {
        type: Boolean,
        default: true
    },
    keepAlive: {
        type: Number,
        default: 60,
        min: [0, 'Keep alive must be 0 or positive integer'] // Ensure the value cannot be negative
    },
    reconnectPeriod: {
        type: Number,
        default: 1,
        min: [0, 'Reconnect period must be 0 or positive integer']
    },
    connectTimeout: {
        type: Number,
        default: 30,
        min: [1, 'Connect timeout must be at least 1000 milliseconds']
    },
    usercredential: {
        type: Boolean,
        default: false
    },
    username: {
        type: String,
        required: function() { return this.usercredential && this.enablemqtt; },
        trim: true
    },
    password: {
        type: String,
        required: function() { return this.usercredential && this.enablemqtt; }
    },
    lastwill: {
        type: Boolean,
        default: false
    },
    lastWillobj: {
        lastwilltopic: {
            type: String,
            trim: true
        },
        lastwillpayload: {
            type: String,
        },
        lastwillqos: {
            type: Number,
            default: 0,
            enum: [0, 1, 2],
        },
        retainflag: {
            type: Boolean,
            default: false,
        }
    },
    tlsobj: {
        enablessl: Boolean,
        tlsversion: String,
        caFile: String,  // Path to the CA certificate file
        clientCert: String,  // Path to the client certificate file
        clientKey: String  // Path to the client key file
    }
}, { timestamps: true });

const serialPortSchema = new mongoose.Schema({
    path: String,
    baudRate: {
        type: Number,
        default: 9600
      },
      dataBits: {
        type: Number,
        default: 8
      },
      parityBit: {
        type: String,
        default: 'none',
        enum: ['none', 'odd', 'even', 'mark', 'space']
      },
      stopBit: {
        type: Number,
        default: 1
      },
      flowControl: {
        type: String,
        default: 'none',
        enum: ['none', 'software', 'hardware']
      }
});

const fileSchema = new mongoose.Schema({
    filename: String,
    filepath: String,
    mimetype: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now }
});

const digitalOutputSchema = new mongoose.Schema({
    pin: { type: String, required: true, unique: true },
    state: { type: Boolean, required: true, default: false }
}, { timestamps: true });

const ioreport = new mongoose.Schema({
    enableReport: { type: Boolean, required: true },
    dataChannel: { type: String, required: function() { return this.enableReport; }, },
    reportTopic: { type: String, required: function() { return this.enableReport;  }, },
    reportQOS: { type: Number, required: function() { return this.enableReport; }, },
    enableInterval: { type: Boolean, required: function() { return this.enableReport; }, },
    reportInterval: { type: Number, required: function() { return this.enableInterval;  }, },
    reportTemplate: { type: Object, required: function() { return this.enableReport; }, },
}, { timestamps: true });

const dowrite = new mongoose.Schema({
    enablewrite: {
        type: Boolean,
        required: true,
        default: false
    },
    datachannel: {
        type: String,
        required: function () { return this.enableset; } // required if enableset is true
    },
    subtopic: {
        type: String,
        required: function () { return this.enableset; } // required if enableset is true
    },
    subQOS: {
        type: Number,
        enum: [0, 1, 2],
        required: function () { return this.enableset; } // required if enableset is true
    },
    restopic: {
        type: String,
        required: function () { return this.enableset; } // required if enableset is true
    },
    resQOS: {
        type: Number,
        enum: [0, 1, 2],
        required: function () { return this.enableset; } // required if enableset is true
    }
}, { timestamps: true });

const ioevent = new mongoose.Schema({
    eventName: { type: String, required: true },
    triggerCondition: { type: String, required: true },
    triggerPoint: { type: String, required: true },
    scanningCycle: { type: Number, required: true },
    upperThreshold: { type: Number },
    lowerThreshold: { type: Number },
    triggerExecution: { type: String, required: true },
    triggerAction: { type: String },
    eventDescribe: { type: String },
    isEnabled:{type:Boolean, default: false}
});

const deviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true // Ensures no leading or trailing whitespace
    },
    selection: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: function() { return this.selection !== 'IO'; },
        trim: true
    },
    interval: {
        type: Number,
        required: true,
        min: [1, 'Polling interval must be at least 1 second'],
        default: 10 // Default polling interval if not provided
    },
    timeout: { type: Number, required: true }

}, { timestamps: true });

const deviceNodeSchema = new mongoose.Schema({
    Name: { type: String, required: true },
    functionCode: { type: String, required: true },
    deviceName: { type: String, required: true },
    registerAddress: { type: String, required: true },
    dataType: { 
        type: Number, 
        enum: [1, 4, 5, 6, 7, 8], 
        required: true 
    }
});

const dataAcquisition = new mongoose.Schema({
    enableDataAct: { type: Boolean, required: true },
    enableReport: { type: Boolean, required: true },
    dataChannel: { type: String, required: function() { return this.enableReport; }, },
    reportTopic: { type: String, required: function() { return this.enableReport;  }, },
    reportQOS: { type: Number, required: function() { return this.enableReport; }, },
    enableInterval: { type: Boolean, required: function() { return this.enableReport; }, },
    reportInterval: { type: Number, required: function() { return this.enableInterval;  }, },
    reportTemplate: { type: Object, required: function() { return this.enableReport; }, }, // Store as JSON string or object as needed
}, { timestamps: true });

const mqttPublishTopicSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true
    },
    enableExtract: {
        type: Boolean,
        required: true
    },
    topicExtract: {
        type: String,
        required: function() { return this.enableExtract; }
    },
    bindingport: {
        type: String,
        required: true
    },
    qos: {
        type: Number,
        required: true
    },
    interval:{
        type: Number,
        required: true
    },
    retainFlag: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const mqttSubscripbeTopicSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true
    },
    enableExtract: {
        type: Boolean,
        required: true
    },
    topicExtract: {
        type: String,
        required: function() { return this.enableExtract; }
    },
    bindingport: {
        type: String,
        required: true
    },
    qos: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const dataSetSchema = new mongoose.Schema({
    enableset: {
        type: Boolean,
        required: true,
        default: false
    },
    datachannel: {
        type: String,
        required: function () { return this.enableset; } // required if enableset is true
    },
    subtopic: {
        type: String,
        required: function () { return this.enableset; } // required if enableset is true
    },
    subQOS: {
        type: Number,
        enum: [0, 1, 2],
        required: function () { return this.enableset; } // required if enableset is true
    },
    restopic: {
        type: String,
        required: function () { return this.enableset; } // required if enableset is true
    },
    resQOS: {
        type: Number,
        enum: [0, 1, 2],
        required: function () { return this.enableset; } // required if enableset is true
    }
}, { timestamps: true });

const EventSchema = new mongoose.Schema({
    eventName: { type: String, required: true },
    triggerCondition: { type: String, required: true },
    triggerPoint: { type: String, required: true },
    scanningCycle: { type: Number, required: true },
    upperThreshold: { type: Number },
    lowerThreshold: { type: Number },
    triggerExecution: { type: String, required: true },
    triggerAction: { type: String },
    eventDescribe: { type: String },
    isEnabled:{type:Boolean, default: false}
});

const awsIoTConfigSchema = new mongoose.Schema({
    internalId: {
        type: String,
        default: 'defaultConfig',
        unique: true,
        required: true,
        index: true // Ensure quick look-up for the default configuration
    },
    enableService: { type: Boolean, default: false },
    clientID: { type: String, required: true },
    serverAddress: { type: String, required: true },
    serverPort: { type: Number, default: 8883 },
    keepAlive: { type: Number, default: 60 },
    reconnectTimeout: { type: Number, default: 0 },
    reconnectInterval: { type: Number, default: 5 },
    cleanSession: { type: Boolean, default: true },
    sslProtocol: { type: String, enum: ['TLS1.2', 'TLS1.3'], default: 'TLS1.2' }
});

const awsiotPublishTopicSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true
    },
    enableExtract: {
        type: Boolean,
        required: true
    },
    topicExtract: {
        type: String,
        required: function() { return this.enableExtract; }
    },
    bindingport: {
        type: String,
        required: true
    },
    qos: {
        type: Number,
        required: true
    },
    interval:{
        type: Number,
        required: true
    },
    retainFlag: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // Automatically create createdAt and updatedAt fields

const awsiotSubscripbeTopicSchema = new mongoose.Schema({
    topic: {
        type: String,
        required: true
    },
    enableExtract: {
        type: Boolean,
        required: true
    },
    topicExtract: {
        type: String,
        required: function() { return this.enableExtract; }
    },
    bindingport: {
        type: String,
        required: true
    },
    qos: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const networkConfigSchema = new mongoose.Schema({
    interface: {
        type: String,
        enum: ['eth0', 'eth1'] // Only allow 'eth0' for Ethernet or 'wlan0' for Wi-Fi
    },
    staticIP: {
      type: String,
      
    },
    gateway: {
      type: String,
      
    },
    dns: {
      type: String,  // Array of DNS server IPs
      
    },
    subnetMask: {
      type: String,
    },
    dhcpEnabled: {
      type: Boolean,
      default: false
    }
  });

const wifi = new mongoose.Schema({
    ssidName: { type: String, required: true },
    dhcpEnabled: { type: Boolean, default: true },
    staticIP: { type: String, default: '' },
    gateway: { type: String, default: '' },
    dns: { type: String, default: '' },
    subnetMask: { type: String, default: '' },
});

const MQTTConfig = mongoose.model('MQTTConfig', mqttConfigSchema);
const SerialPortConfig = mongoose.model('SerialPortConfig',serialPortSchema);
const File = mongoose.model('File', fileSchema);
const DigitalOutput = mongoose.model('DigitalOutput', digitalOutputSchema);
const Device = mongoose.model('Device', deviceSchema);
const DeviceNode = mongoose.model('DeviceNode', deviceNodeSchema);
const DataAcquisition = mongoose.model('DataAcquisition', dataAcquisition);
const MQTTPublishTopic = mongoose.model('MQTTPublishTopic', mqttPublishTopicSchema);
const MQTTSubscribeTopic = mongoose.model('MQTTSubscribeTopic', mqttSubscripbeTopicSchema);
const DataSet = mongoose.model('DataSet', dataSetSchema);
const Event = mongoose.model('Event', EventSchema);
const AWSIoTConfig = mongoose.model('AWSIoTConfig', awsIoTConfigSchema);
const AWSIoTPublishTopic = mongoose.model('AWSIoTPublishTopic', awsiotPublishTopicSchema);
const AWSIoTSubscribeTopic = mongoose.model('AWSIoTSubscribeTopic', awsiotSubscripbeTopicSchema);
const NetworkConfigSchema = mongoose.model('NetworkConfigSchema', networkConfigSchema);
const IOReport = mongoose.model('IOReport',ioreport);
const DOWrite = mongoose.model('DOWrite',dowrite);
const IOEvent = mongoose.model('IOEvent',ioevent);
const WiFiSchema = mongoose.model('WiFiSchema',wifi);

module.exports = { MQTTConfig, SerialPortConfig, File, DigitalOutput, Device, DeviceNode, 
    DataAcquisition, MQTTPublishTopic, MQTTSubscribeTopic, DataSet, Event, AWSIoTConfig, AWSIoTPublishTopic, AWSIoTSubscribeTopic, NetworkConfigSchema, 
    IOReport, DOWrite, IOEvent, WiFiSchema};
