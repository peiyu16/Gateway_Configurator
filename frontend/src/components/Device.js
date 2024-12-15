import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Container, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import Checkbox from '../formcomponents/Checkbox';
import TextInput from '../formcomponents/TextInput';
import SelectInput from '../formcomponents/SelectInput';

const Device = () => {
  const [devices, setDevices] = useState([]);
  const [show, setShow] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [options, setOptions] = useState([]);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [action, setAction] = useState(false);

  // Initialize useForm hook
  const { control, register, handleSubmit, reset, setValue, watch } = useForm(
    {
      defaultValues: {
        name: '',
        selection: '',
        address: '',
        interval: '',
        timeout: ''
      }
    }
  );

  // Detect the value of source selection
  const selection = watch('selection');

  // Handle modal open/close
  const handleClose = () => setShow(false);
  const handleShow = () => {
    reset(); // Reset form fields when modal is opened
    setIsEditing(false);
    setShow(true);
  };
  const fetchDevices = () => {
    setLoadingDevice(true);
    axios.get('http://raspberrypi.local:5000/api/devices')
      .then(response => setDevices(response.data))
      .catch(error => console.error('Error fetching devices:', error))
      .finally(()=>setLoadingDevice(false));
  };

  const fetchPorts = async () => {
    try {
        const response = await axios.get('http://raspberrypi.local:5000/api/serialports'); // Adjust the URL if necessary
        const ports = response.data.ports;
        
        // Map ports to the format { label: "PortName", value: "PortName" }
        const portOptions = ports.map(port => ({
            label: port,
            value: port
        }));
        
        setOptions(portOptions);
    } catch (error) {
        console.error("Error fetching serial ports:", error);
    }
  };

  // Fetch devices from backend
  useEffect(() => {
    fetchDevices();
    fetchPorts();
  }, []);
  
  useEffect(() => {
        let timer;

        if (loadingDevice) {
            // Set a timer to show the spinner after 1 second
            timer = setTimeout(() => {
                setShowLoading(true);
            }, 1000);
        } else {
            // Reset the spinner display immediately when loading is complete
            setShowLoading(false);
        }

        // Clear the timer if loadingState changes
        return () => clearTimeout(timer);
    }, [loadingDevice]);

  // Handle form submission for adding/editing devices
  const onSubmit = (data) => {
    if (isEditing) {
      // Edit device API call
      setAction(true);
      axios.put(`http://raspberrypi.local:5000/api/devices/${editingDeviceId}`, data)
        .then(response => {
          fetchDevices();  
          handleClose();
        })
        .catch(error => console.error('Error updating device:', error))
        .finally(()=>setAction(false));
        
    } else {
      // Add device API call
      setAction(true);
      axios.post('http://raspberrypi.local:5000/api/devices', data)
        .then(response => {
          fetchDevices();
          handleClose();
        })
        .catch(error => console.error('Error adding device:', error))
        .finally(()=>setAction(false));
    }
  };

  // Handle delete device
  const handleDelete = (id) => {
  
    const userConfirmed = window.confirm("Are you sure you want to delete this device?");
        
    if (userConfirmed) {
      axios.delete(`http://raspberrypi.local:5000/api/devices/${id}`)
        .then(() => {
          //setDevices(devices.filter(dev => dev.id !== id));
          fetchDevices();
      })
        .catch(error => console.error('Error deleting device:', error));
    
    }else{
      alert('Device deletion canceled.');
    }
    
  };

  // Handle editing a device (populate form fields)
  const handleEdit = (device) => {
    setIsEditing(true);
    setEditingDeviceId(device.id);
    setValue('name', device.name);
    setValue('selection', device.selection);
    setValue('address', device.address);
    setValue('interval', device.interval);
    setValue('timeout', device.timeout);
    setShow(true);
  };

  return (
    <Container>
      <h4 className='mt-4 mb-4'>Device List</h4>
      {/* Table to display devices */}
      
      {loadingDevice && showLoading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
            </Spinner>
        </div>
      ) : (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Device</th>
                <th>Device ID</th>
                <th>Source Selection</th>
                <th>Polling Interval (ms)</th>
                <th>Timeout (ms)</th>
                <th>Operation</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id}>
                  <td>{device.name}</td>
                  <td>{device.address}</td>
                  <td>{device.selection}</td>
                  <td>{device.interval}</td>
                  <td>{device.timeout}</td>
                  <td>
                    <div className="d-flex justify-content-between">
                      <Button variant="warning" style={{ width: '48%' }} onClick={() => handleEdit(device)}>
                        Edit
                      </Button>
                      <Button variant="danger" style={{ width: '48%' }} onClick={() => handleDelete(device.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
      )}

      {/* Add Device Button */}
      <div className="d-flex justify-content-center mt-3">
        <Button variant="primary" onClick={handleShow}>
          Add Device
        </Button>
      </div>

      {/* Modal for adding/editing devices */}
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Edit Device' : 'Add Device'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit(onSubmit)}>
            <TextInput control={control} name="name" label={"Device Name"} placeholder={"Enter device name"} disabled={false} />
            <SelectInput
                    control={control}
                    name="selection"
                    label="Source"
                    a_label = "Select Source"
                    options={options}
                    disabled={false}
            />
            <TextInput control={control} name = "address" label={"Device ID"} placeholder={"Enter Device ID"} disabled={selection === "IO"}/>
            <TextInput control={control} name="interval" label={"Polling Interval"} placeholder={"Enter Polling Interval"} disabled={false} type="number"/>
            <TextInput control={control} name={"timeout"} label={"Timeout"} placeholder={"Enter Timeout(ms)"} type={"number"} disabled={false}/>
            <div className="d-flex justify-content-center mt-3">
              <Button 
                  variant="primary" 
                  type="submit" 
                  className="align-items-center"
              >
                   {action ? (
                        <>
                            <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2" // Adds margin to the right of the spinner
                            />
                            {isEditing ? 'Updating...' : 'Adding...'}
                        </>
                    ) : (
                        isEditing ? 'Update Device' : 'Add Device'
                    )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Device;
