import React, { useState, useEffect } from 'react';
import { Table, Form } from 'react-bootstrap';
import axios from 'axios';

const DigitalOutput = () => {
  const [toggleState, setToggleState] = useState({
    DO0: false,
    DO1: false,
    DO2: false,
    DO3: false,
  });

  // Fetch the current state of the pins when the component mounts
  useEffect(() => {
    axios.get('http://raspberrypi.local:5000/api/digital-output')
      .then(response => {
        const pinStates = response.data.reduce((acc, pin) => {
          acc[pin.pin] = pin.state;
          return acc;
        }, {
          DO0: toggleState.DO0, 
          DO1: toggleState.DO1, 
          DO2: toggleState.DO2, 
          DO3: toggleState.DO3
        });
        setToggleState(pinStates);
      })
      .catch(error => {
        console.error('Error fetching pin states:', error);
      });
  }, []);

  // Handle toggle changes
  const handleToggle = (output) => {
    const newState = !toggleState[output];
    setToggleState({ ...toggleState, [output]: newState });

    // Send the new state to the backend
    axios.post('http://raspberrypi.local:5000/api/digital-output', {
      output: output,
      value: newState ? 1 : 0
    })
    .then(response => {
      console.log(`${output} set to ${newState ? 'ON' : 'OFF'}`);
    })
    .catch(error => {
      console.error('There was an error sending the state!', error);
    });
  };

  return (
    <div>
      <h4>Digital Output Control</h4> {/* Large title */}
      <Table bordered>
        <thead>
          <tr>
            <th className="fs-4">DO0</th>
            <th className="fs-4">DO1</th>
            <th className="fs-4">DO2</th>
            <th className="fs-4">DO3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
                <br/>
                <Form.Check 
                    type="switch"
                    id="DO0-switch"
                    label={toggleState.DO0 ? 'ON' : 'OFF'}
                    className="fs-3" // Larger Font for switches
                    checked={toggleState.DO0}
                    onChange={() => handleToggle('DO0')}
                />
                <br/>
            </td>
            <td>
                <br/>
                <Form.Check 
                    type="switch"
                    id="DO1-switch"
                    label={toggleState.DO1 ? 'ON' : 'OFF'}
                    className="fs-3"
                    checked={toggleState.DO1}
                    onChange={() => handleToggle('DO1')}
                />
                <br/>
            </td>
            <td>
                <br/>
                <Form.Check 
                    type="switch"
                    id="DO2-switch"
                    label={toggleState.DO2 ? 'ON' : 'OFF'}
                    className="fs-3"
                    checked={toggleState.DO2}
                    onChange={() => handleToggle('DO2')}
                />
                <br/>
            </td>
            <td>
                <br/>
                <Form.Check 
                    type="switch"
                    id="DO3-switch"
                    label={toggleState.DO3 ? 'ON' : 'OFF'}
                    className="fs-3"
                    checked={toggleState.DO3}
                    onChange={() => handleToggle('DO3')}
                />
                <br/>
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
};

export default DigitalOutput;
