import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Table } from 'react-bootstrap';

const DigitalInput = () => {
    const [inputStates, setInputStates] = useState({});

    const fetchInputStates = async () => {
        try {
            const response = await axios.get('http://raspberrypi.local:5000/api/digital-input-states');
            setInputStates(response.data);
            console.log(inputStates);
        } catch (error) {
            console.error('Error fetching digital input states:', error);
        }
    };

    useEffect(() => {
        // Fetch input states initially
        fetchInputStates();

        // Set interval to fetch input states every 2 seconds
        const intervalId = setInterval(() => {
            fetchInputStates();
        }, 5000);

        // Clear interval on component unmount
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div>
            <h4>Digital Input States</h4>
            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th className="fs-4">DI0</th>
                        <th className="fs-4">DI1</th>
                        <th className="fs-4">DI2</th>
                        <th className="fs-4">DI3</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        
                        {Object.values(inputStates).map((value, index) => (
                            <td key={index}>{value === 1 ? 'HIGH' : 'LOW'}</td>
                        ))}
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};

export default DigitalInput;
