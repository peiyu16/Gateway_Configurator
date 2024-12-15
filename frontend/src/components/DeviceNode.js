import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Container, Row, Col, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import TextInput from '../formcomponents/TextInput';
import SelectInput from '../formcomponents/SelectInput';

const DeviceNode = () => {
    const [nodes, setNodes] = useState([]);
    const [devices, setDevices] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [loadingNode, setloadingNode] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [action, setAction] = useState(false);

    // Initialize useForm hook
    const { control, register, handleSubmit, reset, setValue } = useForm({
        defaultValues: {
        Name: '',
        functionCode: '',
        deviceName: '',
        registerAddress: '',
        dataType: '',
        timeout: '',
        },
    });
    
    // Fetch Device Nodes
    const fetchNodes = () => {
        setloadingNode(true);
        axios.get('http://raspberrypi.local:5000/api/nodes')
        .then(response =>{
            const sortedData = response.data.sort((a, b) => {
                if (a.deviceName < b.deviceName) return -1;
                if (a.deviceName > b.deviceName) return 1;
                return 0;
            });
            setNodes(sortedData);
        })
        .catch(error => console.error('Error fetching nodes:', error))
        .finally(()=>setloadingNode(false));
    };

    // Fetch devices from backend - to fill the deviceName field
    const fetchDevices = () => {
        axios.get('http://raspberrypi.local:5000/api/devices')
        .then(response => setDevices(response.data))
        .catch(error => console.error('Error fetching devices:', error));
    };

    useEffect(() => {
        fetchDevices();
        fetchNodes(); // Fetch nodes on component mount
    }, []);
    
    useEffect(() => {
        let timer;

        if (loadingNode) {
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
    }, [loadingNode]);

    // Handle modal open/close
    const handleClose = () => setShow(false);
    const handleShow = () => {
        reset(); // Reset form fields when modal is opened
        setIsEditing(false);
        setShow(true);
    };

    // Handle form submission for adding/editing nodes
    const onSubmit = (data) => {
        if (isEditing) {
        setAction(true);
        // Edit node API call
        axios.put(`http://raspberrypi.local:5000/api/nodes/${editingNodeId}`, data)
            .then(response => {
            fetchNodes();
            handleClose();
            })
            .catch(error => console.error('Error updating node:', error))
            .finally(()=>setAction(false));
        } else {
        // Add node API call
        setAction(true);
        axios.post('http://raspberrypi.local:5000/api/nodes', data)
            .then(response => {
            fetchNodes();
            handleClose();
            })
            .catch(error => console.error('Error adding node:', error))
            .finally(()=>setAction(false));
        }
    };

    // Handle delete node
    const handleDelete = (id) => {
      const userConfirmed = window.confirm("Are you sure you want to delete this device node?");
      if (userConfirmed) {
        axios.delete(`http://raspberrypi.local:5000/api/nodes/${id}`)
        .then(() => {
            fetchNodes();
        })
        .catch(error => console.error('Error deleting node:', error));
      } else {
        alert('Node deletion canceled.');
      }
    };

    // Handle editing a node (populate form fields)
    const handleEdit = (node) => {
        setIsEditing(true);
        setEditingNodeId(node.id);
        setValue('Name', node.Name);
        setValue('functionCode', node.functionCode);
        setValue('deviceName', node.deviceName);
        setValue('registerAddress', node.registerAddress);
        setValue('dataType', node.dataType);
        setShow(true);
    };

    const filteredNodes = selectedDevice
        ? nodes.filter(node => node.deviceName === selectedDevice)
        : nodes;


    const deviceOptions = devices
    .filter(device => device.selection !== "IO")
    .map(device => ({
        value: device.address,
        label: device.name,
    }));

    return (
        <Container>
            <Row className='mt-4 mb-4'>
                <Col xs={6}>
                <h4>Device Nodes List</h4>
                </Col>
                <Col xs={6}>
                {/* Device Filter */}
                <Form.Group controlId="deviceFilter" className="mb-3">
                    <Form.Select onChange={(e) => setSelectedDevice(e.target.value)} value={selectedDevice}>
                    <option value="">All</option>
                    {devices.map(device => (
                        <option key={device.id} value={device.address}>{device.name}</option>
                    ))}
                    </Form.Select>
                </Form.Group>
                </Col>
            </Row>
            {loadingNode && showLoading ? (
              <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                  <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                  </Spinner>
              </div>
            ) : (
              
                <Table striped bordered hover>
                    <thead>
                    <tr>
                        <th>Node</th>
                        <th>Function Code</th>
                        <th>Device</th>
                        <th>Device ID</th>
                        <th>Register Address</th>
                        <th>Operation</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredNodes.map((node) => (
                        <tr key={node._id}>
                        <td>{node.Name}</td>
                        <td>{node.functionCode}</td>
                        <td>
                            {devices
                                .filter(device => device.address === node.deviceName)
                                .map(device => device.name)
                            }
                        </td>
                        <td>{node.deviceName}</td>
                        <td>{node.registerAddress}</td>
                        <td>
                            <div className="d-flex justify-content-between">
                            <Button variant="warning" style={{ width: '48%' }} onClick={() => handleEdit(node)}>
                                Edit
                            </Button>
                            <Button variant="danger" style={{ width: '48%' }} onClick={() => handleDelete(node.id)}>
                                Delete
                            </Button>
                            </div>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            )}

        {/* Add Node Button */}
        <div className="d-flex justify-content-center mt-3">
            <Button variant="primary" onClick={handleShow}>
            Add Node
            </Button>
        </div>

        {/* Modal for adding/editing nodes */}
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>{isEditing ? 'Edit Device Node' : 'Add Device Node'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit(onSubmit)}>
                    
                    <TextInput control={control} name="Name" label="Node Name" placeholder="Enter Node Name" disabled={false}/>
                    <SelectInput 
                        control={control} 
                        name="functionCode" 
                        label={"Function Code"} 
                        a_label={"Enter Function Code"} 
                        disabled={false}
                        options={[{ label: "01", value: "01" }, { label: "02", value: "02" },{ label: "03", value: "03" },{ label: "04", value: "04" }]}
                    />
                    <SelectInput 
                        control={control}
                        name="deviceName"
                        label={"Device Name"}
                        a_label={"Select Device"}
                        disabled={false}
                        options={deviceOptions}
                    />
                    <TextInput control={control} name="registerAddress" label={"Register Address"} placeholder={"0 - 65534"} disabled={false} type="number"/>
                    <SelectInput 
                        control={control} 
                        name="dataType" 
                        label={"Data Type"} 
                        a_label={"Select Data Type"}
                        disabled={false}
                        options ={[
                            {label:"Bit", value:1}, {label:"Int16", value:4},
                            {label:"UInt16", value:5}, {label:"Int32", value:6},
                            {label:"UInt32", value:7}, {label:"Float", value:7},
                        ]}
                    />
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
                                  isEditing ? 'Update Node' : 'Add Node'
                              )}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
        </Container>
    );
};

export default DeviceNode;
