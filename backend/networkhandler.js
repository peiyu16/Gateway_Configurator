const express = require('express');
const router = express.Router();
const { execa } = import('execa');
const {NetworkConfigSchema,WiFiSchema} = require('./database');   

function dottedToCIDR(dotted) {
  return dotted.split('.').reduce((cidr, octet) => 
    cidr + (parseInt(octet, 10).toString(2).match(/1/g) || []).length, 0
  );
}

async function runExecaCommand(command, args) {
    const { execa } = await import('execa'); // Dynamically import execa
    return execa(command, args);
}

async function runExecaCommand2(command, args) {
    const { execa } = await import('execa');  // Dynamically import execa
    try {
        const result = await execa(command, args);
        return result.stdout;  // Return the stdout, which should be a string
    } catch (error) {
        console.error('Error executing command:', error);
        throw new Error('Failed to execute execa command');
    }
}

router.post('/api/network/ethernet-config', async (req, res) => {
    const { enabledhcp, staticip, subnet, gateway, dns } = req.body;
    
    const cidrNotation = dottedToCIDR(subnet);
    console.log(cidrNotation);
    
    try {
        let config = await NetworkConfigSchema.findOne({ interface: 'eth0' });
        
        if (!config) {
            config = new NetworkConfigSchema({ interface: 'eth0' });
        }

        // Update fields based on request body
        config.dhcpEnabled = enabledhcp;
        config.staticIP = staticip;
        config.subnetMask = subnet;
        config.gateway = gateway;
        config.dns = dns;
        config.updatedAt = Date.now();

        // Save the configuration
        await config.save();
         if (dhcpEnabled) {
            // Enable DHCP
            await runExecaCommand('nmcli', [
                'connection', 'modify', 'Wired connection 2',
                'ipv4.gateway', '',
                'ipv4.addresses', '', // Apply user-specified subnet mask
                'ipv4.dns', '',
                'ipv4.method', 'auto'
            ]);
        } else {
            // Set Static IP with Subnet Mask
            await runExecaCommand('nmcli', [
                'connection', 'modify', 'Wired connection 1',
                'ipv4.addresses', `${staticip}/${cidrNotation}`, // Apply user-specified subnet mask
                'ipv4.gateway', gateway,
                'ipv4.dns', dns,
                'ipv4.method', 'manual'
            ]);
        }

        // Restart the connection to apply changes
        await runExecaCommand('nmcli', ['connection', 'up', 'Wired connection 1']);
        res.json({ message: 'Ethernet configuration updated successfully' });
        
    } catch (error) {
        console.error('Error configuring Ethernet:', error);
        res.status(500).json({ error: 'Failed to configure Ethernet' });
    }
});

/* GET - Get current ethernet - ETH0 ONLY*/
router.get('/api/network/ethernet-config', async (req, res) => { 
    try {
        // First, check if eth0 configuration exists in the database
        
        const connection = await runExecaCommand('nmcli', ['-f', 'GENERAL.STATE', 'device', 'show', "eth0"]);
        let conn = connection.stdout.split(':')[1]?.trim();
        let connStat = {};
        if (conn !== "100 (connected)") {
            connStat['status'] = false;
        } else {
            connStat['status'] = true;
        }

        const config = await NetworkConfigSchema.findOne({ interface: 'eth0' });

        if (config) {
            // If configuration exists, return it
            return res.json({
                config: config,
                connectionStatus: connStat
            });
        } else {
            // If not found, run nmcli to check DHCP status
            const {stdout} = await runExecaCommand('nmcli', ['connection', 'show', 'Wired connection 1']);
            
            const regex = /ipv4\.method:\s*(auto|manual)/;
            let match = regex.exec(stdout);
            if (match && match[1] === 'auto') {
                console.log('DHCP is enabled');
                ipv4Method = true;
            } else {
                console.log('DHCP is not enabled');
                ipv4Method = false;
            }
            // Save the configuration to the database
            const newConfig = new NetworkConfigSchema({
                interface: 'eth0',
                dhcpEnabled: ipv4Method,  // Save DHCP or static IP method
            });

            // Save the new configuration in the database
            await newConfig.save();
            
            // Return the saved configuration
            return res.json({
                config: newConfig,
                connectionStatus: connStat
            });
        }
    } catch (error) {
        console.error('Error fetching or saving Ethernet configuration:', error);
        res.status(500).json({ error: 'Failed to fetch or save Ethernet configuration' });
    }
});

/* POST - For ETH1 - Config */
router.post('/api/network/ethernet-config-eth1', async (req, res) => {
    const { enabledhcp, staticip, subnet, gateway, dns } = req.body;

    const cidrNotation = dottedToCIDR(subnet);
    console.log(cidrNotation);
    
    try {
        let config = await NetworkConfigSchema.findOne({ interface: 'eth1' });
        
        if (!config) {
            config = new NetworkConfigSchema({ interface: 'eth1' });
        }

        // Update fields based on request body
        config.dhcpEnabled = enabledhcp;
        config.staticIP = staticip;
        config.subnetMask = subnet;
        config.gateway = gateway;
        config.dns = dns;
        config.updatedAt = Date.now();

        // Save the configuration
        await config.save();
         if (enabledhcp) {
            // Enable DHCP
            // await runExecaCommand('nmcli', ['connection', 'modify', 'Wired connection 2', 'ipv4.method', 'auto']);
            await runExecaCommand('nmcli', [
                'connection', 'modify', 'Wired connection 2',
                'ipv4.gateway', '',
                'ipv4.addresses', '', // Apply user-specified subnet mask
                'ipv4.dns', '',
                'ipv4.method', 'auto'
            ]);
        } else {
            // Set Static IP with Subnet Mask
            await runExecaCommand('nmcli', [
                'connection', 'modify', 'Wired connection 2',
                'ipv4.addresses', `${staticip}/${cidrNotation}`, // Apply user-specified subnet mask
                'ipv4.gateway', gateway,
                'ipv4.dns', dns,
                'ipv4.method', 'manual'
            ]);
        }

        // Restart the connection to apply changes
        await runExecaCommand('nmcli', ['connection', 'up', 'Wired connection 2']);
        res.json({ message: 'Ethernet configuration updated successfully' });
        
    } catch (error) {
        console.error('Error configuring Ethernet:', error);
        res.status(500).json({ error: 'Failed to configure Ethernet' });
    }
});

/* GET - Get current ethernet - ETH1 ONLY*/
router.get('/api/network/ethernet-config-eth1', async (req, res) => { 
    try {
        // For demo purposes only
        // const del_test = await NetworkConfigSchema.deleteOne({ interface: 'eth1' });
        // if (!del_test) {
        //     console.log("Cannot remove eth1 configuration");
        // }

        // First, check if eth1 configuration exists in the database
        const config = await NetworkConfigSchema.findOne({ interface: 'eth1' });
        const connection = await runExecaCommand('nmcli', ['-f', 'GENERAL.STATE', 'device', 'show', "eth1"]);
        let conn = connection.stdout.split(':')[1]?.trim();
        let connStat = {};
        if (conn !== "100 (connected)") {
            connStat['status'] = false;
        } else {
            connStat['status'] = true;
        }

        if (config) {
            // If configuration exists, return it
            return res.json({
                config: config,
                connectionStatus: connStat
            });
        } else {
            
            // If not found, run nmcli to check DHCP status
            const {stdout} = await runExecaCommand('nmcli', ['connection', 'show', 'Wired connection 2']);
            
            const regex = /ipv4\.method:\s*(auto|manual)/;
            let match = regex.exec(stdout);
            if (match && match[1] === 'auto') {
                console.log('DHCP is enabled');
                ipv4Method = true;
            } else {
                console.log('DHCP is not enabled');
                ipv4Method = false;
            }
            // Save the configuration to the database
            const newConfig = new NetworkConfigSchema({
                interface: 'eth1',
                dhcpEnabled: ipv4Method,  // Save DHCP or static IP method
            });

            // Save the new configuration in the database
            await newConfig.save();
            
            // Return the saved configuration
            return res.json({
                config: newConfig,
                connectionStatus: connStat
            });
        }
    } catch (error) {
        console.error('Error fetching or saving Ethernet configuration:', error);
        res.status(500).json({ error: 'Failed to fetch or save Ethernet configuration' });
    }
});

// GET - Scan for available Wi-Fi networks
router.get('/api/network/wifi-scan', async (req, res) => {
    try {
        // Run command to scan for Wi-Fi networks
       const { stdout } = await runExecaCommand('nmcli', ['-f', 'SSID', 'device', 'wifi']);
        
        // Process each line to get SSIDs
        const ssidList = stdout.split('\n')
            .slice(1) // Skip the header row
            .map(line => line.trim())
            .filter(ssid => ssid && ssid !== '*') // Remove empty and hidden SSIDs
            .filter((ssid, index, self) => self.indexOf(ssid) === index); // Ensure uniqueness
            
        console.log(ssidList);
        res.json({ networks: ssidList.map(ssid => ({ ssid })) });
    } catch (error) {
        console.error('Error scanning Wi-Fi networks:', error);
        res.status(500).json({ error: 'Failed to scan Wi-Fi networks' });
    }
});

// POST - Connect to a Wi-Fi network
router.post('/api/network/connect-wifi', async (req, res) => {
    const { ssid, password } = req.body;

    if (!ssid) {
        return res.status(400).json({ error: 'SSID is required' });
    }

    try {
        
        await runExecaCommand('nmcli', ['device', 'wifi', 'connect', ssid, 'password', password]);
        // await runExecaCommand('sudo', ['dhclient']);

        let wifiConfig = await WiFiSchema.findOne({ ssidName: ssid });

        if (!wifiConfig) {
            // If this is the first connection to the SSID, create a new entry
            wifiConfig = new WiFiSchema({
                ssidName: ssid,
                enabledDhcp: true,  // DHCP should be enabled by default
            });
            await wifiConfig.save();
        }

        res.json({ message: 'Connected to Wi-Fi successfully' });
    } catch (error) {
        console.error('Error connecting to Wi-Fi:', error);
        res.status(500).json({ error: 'Failed to connect to Wi-Fi' });
    }
});

router.get('/api/network/wlan', async (req, res) => { 
    try {

        // For demo purposes only
        // const wifiConfig = await WiFiSchema.deleteMany({});
        // if (!wifiConfig) {
        //     console.log("Cannot remove wifi db configuration");
        // }

        // First, check if wlan0 configuration exists in the database
        const ssid_ret = await runExecaCommand('nmcli',['-f','GENERAL.CONNECTION','device','show','wlan0']);
        const ssid_split = ssid_ret.stdout.split(':')[1]?.trim()
        console.log(ssid_split);

        const config = await WiFiSchema.findOne({ ssidName: `${ssid_split}` });
        
        if (config) {
            
            // If configuration exists, return it
            return res.json(config);
        } else {
            
            return res.json({message: 'No Wi-Fi connection'});
        }
    } catch (error) {
        console.error('Error fetching or saving Ethernet configuration:', error);
        res.status(500).json({ error: 'Failed to fetch or save Ethernet configuration' });
    }
});

// GET - Network status for eth0, eth1, and wlan0
router.get('/api/network/status', async (req, res) => {
    try {
        // Fetch information for each network interface
        const interfaces = ['eth0', 'eth1', 'wlan0'];
        const results = await Promise.all(interfaces.map(async (iface) => {
            const connection = await runExecaCommand('nmcli', ['-f', 'GENERAL.STATE', 'device', 'show', iface]);
            const ipAddress = await runExecaCommand('nmcli', ['-f', 'IP4.ADDRESS', 'device', 'show', iface]);
            const gateway = await runExecaCommand('nmcli', ['-f', 'IP4.GATEWAY', 'device', 'show', iface]);
            const dns = await runExecaCommand('nmcli', ['-f', 'IP4.DNS', 'device', 'show', iface]);
            const conn = await runExecaCommand('nmcli', ['-f', 'GENERAL.CONNECTION', 'device', 'show', iface]);
            
            return {
                interface: iface,
                state: connection.stdout.split(':')[1]?.trim(),
                ipAddress: ipAddress.stdout.split(':')[1]?.trim(),
                gateway: gateway.stdout.split(':')[1]?.trim(),
                dns: dns.stdout.split(':')[1]?.trim(),
                conn: conn.stdout.split(':')[1]?.trim(),
            };
        }));

        res.json(results);
    } catch (error) {
        console.error('Error fetching network status:', error);
        res.status(500).json({ error: 'Failed to fetch network status' });
    }
});

router.post('/api/network/wifiConnect', async (req, res) => {
    const { enabledhcp, staticip, subnet, gateway, dns } = req.body;
    
    const cidrNotation = dottedToCIDR(subnet);
    console.log(cidrNotation);
    
    try {
        const ssid_ret = await runExecaCommand('nmcli',['-f','GENERAL.CONNECTION','device','show','wlan0']);
        const ssid_split = ssid_ret.stdout.split(':')[1]?.trim()
        console.log(ssid_split);
        
        const config = await WiFiSchema.findOne({ ssidName: `${ssid_split}` });

        // Update fields based on request body
        config.dhcpEnabled = enabledhcp;
        config.staticIP = staticip;
        config.subnetMask = subnet;
        config.gateway = gateway;
        config.dns = dns;
        config.updatedAt = Date.now();

        // Save the configuration
        await config.save();
         if (enabledhcp) {
            // Enable DHCP
            // await runExecaCommand('nmcli', ['connection', 'modify', 'Wired connection 2', 'ipv4.method', 'auto']);
            await runExecaCommand('nmcli', [
                'connection', 'modify', `${ssid_split}`,
                'ipv4.gateway', '',
                'ipv4.addresses', '', // Apply user-specified subnet mask
                'ipv4.dns', '',
                'ipv4.method', 'auto'
            ]);
        } else {
            // Set Static IP with Subnet Mask
            await runExecaCommand('nmcli', [
                'connection', 'modify', `${ssid_split}`,
                'ipv4.addresses', `${staticip}/${cidrNotation}`, // Apply user-specified subnet mask
                'ipv4.gateway', gateway,
                'ipv4.dns', dns,
                'ipv4.method', 'manual'
            ]);
        }

        // Restart the connection to apply changes
        await runExecaCommand('nmcli', ['connection', 'up', `${ssid_split}`]);
        res.json({ message: 'Ethernet configuration updated successfully' });
        
    } catch (error) {
        console.error('Error configuring Ethernet:', error);
        res.status(500).json({ error: 'Failed to configure Ethernet' });
    }
});

module.exports = { router };