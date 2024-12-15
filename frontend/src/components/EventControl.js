import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Container, Row, Col, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import TextInput from '../formcomponents/TextInput';
import SelectInput from '../formcomponents/SelectInput';

const EventControl = () => {
    const [events, setEvents] = useState([]);
    const [show, setShow] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [deviceNodes, setDeviceNodes] = useState([]);
    const [digitalOutputs, setDigitalOutputs] = useState([]);
    // For loading state
    const [loadingEvent, setloadingEvent] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [action, setAction] = useState(false);
    
    const [eventEnabledState, setEventEnabledState] = useState({}); // Track the "enabled" state per event


    // Initialize useForm hook
    const { control, register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            eventName: '',
            triggerCondition: '',
            triggerPoint: '',
            scanningCycle: '',
            upperThreshold: '',
            lowerThreshold: '',
            triggerExecution: '',
            triggerAction: '',
            eventDescribe: '',
        },
    });

    const fetchDeviceNodes = async () => {
        try {
		const response = await axios.get('http://raspberrypi.local:5000/api/nodes');
		setDeviceNodes(response.data.map(node => ({ label: node.Name, value: node.Name })));
	    } catch (error) {
		console.warn('Backend is unreachable. Skipping fetchDeviceNodes.');
	    }
    };

    const fetchDigitalOutputs = async () => {
         try {
		const response = await axios.get('http://raspberrypi.local:5000/api/digital-output');
		setDigitalOutputs(response.data.map(output => ({ label: output.pin, value: output.pin })));
	    } catch (error) {
		console.warn('Backend is unreachable. Skipping fetchDigitalOutputs.');
	    }
    };

    const fetchEvents = async () => {

        try {
            setloadingEvent(true);
            const response = await axios.get('http://raspberrypi.local:5000/api/events');
            setEvents(response.data);
            
            const initialState = {};
            response.data.forEach(event => {
                initialState[event._id] =  event.isEnabled || false; // Use the `enabled` property from backend event.enabled ||
            });
            setEventEnabledState(initialState);
  	    } catch (error) {
  		      console.warn('Backend is unreachable. Skipping fetchEvents.');
  	    } finally {
            setloadingEvent(false);
        }
    };

    const handleEnable = async (event) => {
        try {

            const isCurrentlyEnabled = eventEnabledState[event._id];
            const newEnabledState = !isCurrentlyEnabled; // Toggle the state

            const response = await axios.patch(`http://raspberrypi.local:5000/api/events/${event._id}/enable`,
                { isEnabled : newEnabledState }
            );
            console.log(response.data.message);
            setEventEnabledState(prevState => ({
                ...prevState,
                [event._id]: newEnabledState, // Toggle the current state
            }));
            //fetchEvents(); // Refresh the events list to reflect the updated state
        } catch (error) {
            console.error('Error toggling event enabled state:', error);
        }
    };

    useEffect(() => {
        fetchEvents();
    },[]);

    useEffect(() => {
        fetchDeviceNodes();
        fetchDigitalOutputs();
    }, []);
    
    useEffect(() => {
        let timer;

        if (loadingEvent) {
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
    }, [loadingEvent]);

    // Handle modal open/close
    const handleClose = () => setShow(false);
    const handleShow = () => {
        reset(); // Reset form fields when modal is opened
        setIsEditing(false);
        setShow(true);
    };

    // Handle form submission for adding/editing events
    const onSubmit = (data) => {
        if (isEditing) {
            setAction(true);
            // Edit event API call
            axios.put(`http://raspberrypi.local:5000/api/events/${editingEventId}`, data)
                .then(response => {
                    fetchEvents();
                    handleClose();
                })
                .catch(error => console.error('Error updating event:', error))
                .finally(()=>setAction(false));
        } else {
            setAction(true);
            // Add event API call
            axios.post('http://raspberrypi.local:5000/api/events', data)
                .then(response => {
                    fetchEvents();
                    handleClose();
                })
                .catch(error => console.error('Error adding event:', error))
                .finally(()=>setAction(false));
        }
    };

    // Handle delete event
    const handleDelete = (id) => {
    
        const userConfirmed = window.confirm("Are you sure you want to delete this event?");
        
        if (userConfirmed) {
            axios.delete(`http://raspberrypi.local:5000/api/events/${id}`)
                .then(() => {
                    fetchEvents();
                })
                .catch(error => console.error('Error deleting event:', error));
        } else {
            alert("Event delection canceled.");
        }
    };

    // Handle editing an event (populate form fields)
    const handleEdit = (event) => {
        setIsEditing(true);
        setEditingEventId(event._id);
        setValue('eventName', event.eventName);
        setValue('triggerCondition', event.triggerCondition);
        setValue('triggerPoint', event.triggerPoint);
        setValue('scanningCycle', event.scanningCycle);
        setValue('upperThreshold', event.upperThreshold);
        setValue('lowerThreshold', event.lowerThreshold);
        setValue('triggerExecution', event.triggerExecution);
        setValue('triggerAction', event.triggerAction);
        setValue('eventDescribe', event.eventDescribe);
        setShow(true);
    };

    const triggerCondition = watch('triggerCondition');

    // Conditions for enabling lower and upper thresholds
    const enableLower = ['larger', 'larger equal', 'within threshold', 'outof threshold'].includes(triggerCondition);
    const enableUpper = ['smaller', 'smaller equal', 'within threshold', 'outof threshold'].includes(triggerCondition);
    
    return (
        <Container>
            <Row className='mt-4 mb-4'>
                <Col xs={6}>
                    <h4>Event Control List</h4>
                </Col>
                <Col xs={6} className="text-end">
                    {/* Add Event Button */}
                    <Button variant="primary" onClick={handleShow}>
                        Add Event
                    </Button>
                </Col>
            </Row>
            {loadingEvent && showLoading ? (
              <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                  <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                  </Spinner>
              </div>
            ) : (
                
                <Table striped bordered hover>
                    <thead>
                        <tr>
                            <th>Event Name</th>
                            <th>Trigger Point</th>
                            <th>Trigger Condition</th>
                            <th>Scanning Cycle</th>
                            <th>Upper Threshold</th>
                            <th>Lower Threshold</th>
                            <th>Trigger Execution</th>
                            <th>Trigger Action</th>
                            <th>Event Describe</th>
                            <th>Operation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((event) => (
                            <tr key={event._id}>
                                <td>{event.eventName}</td>
                                <td>{event.triggerPoint}</td>
                                <td>{event.triggerCondition}</td>
                                <td>{event.scanningCycle}</td>
                                <td>{event.upperThreshold}</td>
                                <td>{event.lowerThreshold}</td>
                                <td>{event.triggerExecution}</td>
                                <td>{event.triggerAction}</td>
                                <td>{event.eventDescribe}</td>
                                <td>
                                   <div className="d-flex flex-column justify-content-between">
    				{/* Row for Enable/Disable Button */}
    				<div className="mb-2">
    				    <Button 
    					      variant={eventEnabledState[event._id] ? "success" : "outline-success"} 
    					      style={{ width: '100%' }} 
    					      onClick={() => handleEnable(event)}
    				    >
    					    {eventEnabledState[event._id] ? 'Enabled' : 'Enable'}
    				    </Button>
    				</div>
    				
    				{/* Row for Edit and Delete Buttons */}
    				<div className="d-flex justify-content-between">
    				    <Button 
    					      variant="warning" 
    					      style={{ width: '48%' }} 
    					      onClick={() => handleEdit(event)}
    				    >
    					      Edit
    				    </Button>
    				    <Button 
    					      variant="outline-danger" 
    					      style={{ width: '48%' }} 
    					      onClick={() => handleDelete(event._id)}
    				    >
    					      Delete
    				    </Button>
    				</div>
    			    </div>
    
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {/* Modal for adding/editing events */}
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Edit Event' : 'Add Event'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit(onSubmit)}>
                        <TextInput control={control} name="eventName" label="Event Name" placeholder="Enter Event Name" />
                        <SelectInput 
                            control={control} 
                            name="triggerPoint" 
                            label="Trigger Point" 
                            a_label="Select Trigger Point" 
                            options={deviceNodes} 
                        />
                        <SelectInput 
                            control={control} 
                            name="triggerCondition" 
                            label="Trigger Condition" 
                            a_label="Select Trigger Condition" 
                            options={[
                                {label:"Larger & Equal", value:"larger equal"},
                                {label:"Smaller & Equal", value:"smaller equal"},
                                {label:"Larger", value:"larger"},
                                {label:"Smaller", value:"smaller"},
                                {label:"Within Threshold", value:"within threshold"},
                                {label:"Out of Threshold", value:"outof threshold"}
                            ]} 
                        />
                        <TextInput control={control} name="scanningCycle" label="Scanning Cycle" placeholder="Enter Scanning Cycle(ms)" />
                        <TextInput control={control} name="upperThreshold" label="Upper Threshold" placeholder="Enter Upper Threshold" disabled={!enableUpper}/>
                        <TextInput control={control} name="lowerThreshold" label="Lower Threshold" placeholder="Enter Lower Threshold" disabled={!enableLower}/>
                        <SelectInput 
                            control={control} 
                            name="triggerExecution" 
                            label="Trigger Execution" 
                            a_label="Select Trigger Execution" 
                            options={digitalOutputs} 
                        />
                        <SelectInput   
                            control={control} 
                            name="triggerAction" 
                            label="Trigger Action" 
                            a_label="Select Trigger Action" 
                            options={[
                                {label:"Normal Close",value:"close"},
                                {label:"Normal Open",value:"open"},
                            ]} 
                            disabled={false}
                        />
                        <TextInput control={control} name="eventDescribe" label="Event Describe" placeholder="Describe the Event" />
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
                                        isEditing ? 'Update Event' : 'Add Event'
                                  )}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default EventControl;
