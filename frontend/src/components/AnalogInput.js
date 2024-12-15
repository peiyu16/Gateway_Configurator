import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table } from 'react-bootstrap';

const AnalogInput = () => {
    const [inputStates, setInputStates] = useState({});
    
    // Fetch analog input states from the backend
    const fetchInputStates = async () => {
        try {
            const response = await axios.get('http://raspberrypi.local:5000/api/read-all-channels');
            setInputStates(response.data.data);
        } catch (error) {
            console.error('Error fetching analog input states:', error);
        }
    };
    
    // Fetch analog input states from the backend
    useEffect(() => {
        // Fetch data initially
        fetchInputStates();
        // Set an interval to fetch data every 5 seconds (5000 milliseconds)
        const interval = setInterval(fetchInputStates, 5000);

        // Cleanup the interval on component unmount
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <h4>Analog Input States</h4>
            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th className="fs-4">AI0</th>
                        <th className="fs-4">AI1</th>
                        <th className="fs-4">AI2</th>
                        <th className="fs-4">AI3</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{inputStates.AI0}</td>
                        <td>{inputStates.AI1 || 0}</td>
                        <td>{inputStates.AI2 || 0}</td>
                        <td>{inputStates.AI3 || 0}</td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};

export default AnalogInput;
