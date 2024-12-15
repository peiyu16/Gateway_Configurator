import React, {useEffect,useState} from 'react'
import { Container, Button, Table, Spinner, Modal, Alert, Form } from 'react-bootstrap'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Checkbox from '../formcomponents/Checkbox';
import TextInput from '../formcomponents/TextInput';
import SelectInput from '../formcomponents/SelectInput';

const MQTTPublish = () => {
    
    const [ports, setPorts] = useState([]);
    const [mqttTopics, setMqttTopics] = useState([]);
    // Loading state
    const [loadingState, setLoadingState] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const [publishing, setPublishing] = useState(false);
    // For editing topic
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentTopic, setCurrentTopic] = useState(null);
    const [editError, setEditError] = useState(null);
    const [editSuccess, setEditSuccess] = useState(null);
    // For enabling publish
    const [enablePub, setEnablePub] = useState(false);
    
    // useForm hook
    const { control, register, handleSubmit, reset, setValue, watch } = useForm(
    {
      defaultValues: {
            topic : "",
            enableExtract: false,
            topicExtract: "",
            bindingport:"",
            qos:"",
            interval:0,
            pubretainflag:false
      }
    }
    );
    
    const enableExtract = watch('enableExtract');
  
    const navigate = useNavigate();
    const gotoForm = () => {
        navigate('/mqttpublishform?source=mqtt');
    };
    
    const fetchPorts = async () => {
        try {
            const response = await axios.get('http://raspberrypi.local:5000/api/serialports');
            const ports = response.data.ports.map(port => ({ label: port, value: port }));
            
            setPorts(ports);
            
        } catch (error) {
            console.error('Failed to fetch ports:', error);
        }
    };
    
    const fetchTopics = async () => {
        setLoadingState(true);
        try {
            const response = await axios.get('http://raspberrypi.local:5000/api/mqtt/topics-publish');
            setMqttTopics(response.data); // Assuming response.data is an array of topics
        } catch (error) {
            console.error('Failed to fetch topics:', error);
        } finally {
            setLoadingState(false);
        }
    };
    
    const getMqttStatus = async () => {
        try {
            const response = await axios.get('http://raspberrypi.local:5000/api/mqtt/status');
            console.log('MQTT Status:', response.data);
            // response.data contains { mqttpublish, mqttsubscribe }
            setEnablePub(response.data.mqttpublish);
            
        } catch (error) {
            console.error('Error fetching MQTT status:', error);
        }
    };
    
    useEffect ( () => {
        fetchTopics();
        fetchPorts();
        getMqttStatus();
    },[]);
    
    useEffect(() => {
        let timer;

        if (loadingState) {
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
    }, [loadingState]);

    const publishAction = async () => {
        
        setPublishing(true);
        
        try {
            if (enablePub){
                const response = await axios.post('http://raspberrypi.local:5000/api/mqtt/stop-all-publishing');
                console.log('Stop Publish:', response.data);
                alert(response.data.message);
                setEnablePub(false); // Set the state to false to stop publishing
            
            } else {
                const response = await axios.post('http://raspberrypi.local:5000/api/mqtt/topics-publish');
                console.log('Publish response:', response.data);
                alert(`Topic published successfully: ${response.data.message}`);
                setEnablePub(true); // Set the state to true to enable publishing
              
            }
            
        } catch (error) {
            console.error('Failed to publish topic:', error);
            
            const errorMessage = error.response && error.response.data && error.response.data.message
                ? error.response.data.message
                : 'Failed to publish topic';
    
            alert(errorMessage);
        } finally {
            setPublishing(false);
        }
    };

    const deleteAction = async (id) => {
        // Show a confirmation alert box
        const userConfirmed = window.confirm("Are you sure you want to delete this topic?");
        
        if (userConfirmed) {
            try {
                // Call the API to delete the publish topic
                const response = await axios.delete(`http://raspberrypi.local:5000/api/mqtt/topics-publish/${id}`);
                alert('Topic deleted successfully');
                
                // Optionally refresh the list of topics here
                setMqttTopics((prevTopics) => prevTopics.filter(topic => topic._id !== id));
            } catch (error) {
                console.error('Failed to delete topic:', error);
                alert('Failed to delete topic.');
            }
        } else {
            // User canceled the deletion
            alert('Topic deletion canceled.');
        }
    };
    
     const handleEditClick = (topic) => {
        setCurrentTopic(topic);
        
        setValue('topic',topic.topic);
        setValue('enableExtract',topic.enableExtract);
        setValue('topicExtract', topic.topicExtract);
        setValue('bindingport', topic.bindingport);
        setValue('qos', topic.qos);
        setValue('interval', topic.interval);
        setValue('retainflag', topic.pubretainflag);
        
        setEditError(null);
        setEditSuccess(null);
        setShowEditModal(true);
    };

    const handleEditFormSubmit = async (data) => {
        setEditError(null);
        setEditSuccess(null);
        try {
            const response = await axios.put(`http://raspberrypi.local:5000/api/mqtt/topics-publish/${currentTopic._id}`, data);
            setEditSuccess('Topic updated successfully.');
    
            // Ensure the response contains the updated data and update the state
            setMqttTopics((prevTopics) =>
                prevTopics.map((topic) =>
                    topic._id === currentTopic.topicID ? { ...topic, ...response.data } : topic
                )
            );
    
            // Close the modal after a short delay
            setTimeout(() => {
                setShowEditModal(false);
            }, 3000);
            
            fetchTopics();
        } catch (error) {
            console.error('Failed to update topic:', error);
            const errorMessage =
                error.response && error.response.data && error.response.data.message
                    ? error.response.data.message
                    : 'Failed to update topic.';
            setEditError(errorMessage);
        }
    };

    return (
        <Container>
            { loadingState && showLoading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </div>
            
            ) : (
                <Table striped bordered hover className='mt-4'>
                    <thead>
                    <tr>
                        <th>NO</th>
                        <th>Publish Topic</th>
                        <th>Enable Topic Extract</th>
                        <th>Extracted Topic</th>
                        <th>Binding Port</th>
                        <th>QOS</th>
                        <th>Time Interval</th>
                        <th>Operation</th>      
                    </tr>
                    </thead>        
                    <tbody>
                    {mqttTopics.map((topic, index) => (
                        <tr key={topic._id}>
                            <td>{index + 1}</td>
                            <td>{topic.topic}</td>
                            <td>{topic.enableExtract? 'Yes':'No'}</td>
                            <td>{topic.topicExtract}</td>
                            <td>{topic.bindingport}</td>
                            <td>{topic.qos}</td>
                            <td>{topic.interval}</td>
                            <td>
                                <Button variant="outline-primary" className="me-2" onClick={() => handleEditClick(topic)}>
                                    Edit
                                </Button>
                                <Button variant="btn btn-outline-danger" onClick={() => deleteAction(topic._id)}>Delete</Button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
                )}
                
                <div className="d-flex justify-content-center" style={{marginTop:"50px"}}>
                    <Button variant="primary" onClick={gotoForm} style={{width: "130px", marginRight:"40px"}}>
                        Add Topic
                    </Button>
                    <Button 
                        variant= {enablePub ? "btn btn-success" : "btn btn-outline-success" }
                        onClick={() => publishAction()} 
                        style={{width: "130px",marginLeft:"40px"}}
                    >
                    { publishing ? (
                        <>
                            <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
                            <span className="ms-2">Loading...</span>
                        </>
                    ) : (
                                
                            enablePub ? "Published" : "Publish"
                    )} 
                    </Button>
                </div>
                
                <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Form onSubmit={handleSubmit(handleEditFormSubmit)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Edit MQTT Topic</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {editError && <Alert variant="danger">{editError}</Alert>}
                        {editSuccess && <Alert variant="success">{editSuccess}</Alert>}
                        <TextInput control={control} name="topic" label="Topic" placeholder="Enter topic" disabled={false}/>
                        <Checkbox control={control} name="enableExtract" label={"Enable Topic Extracting"} disabled={false}/>
                        {enableExtract &&
                            <TextInput control={control} name={"topicExtract"} label={"Extracted Topic"} disabled={!enableExtract}/>
                        }
                        <SelectInput
                            control={control}
                            name="bindingport"
                            label="Binding Port"
                            a_label="Select port"
                            options={ports}
                            disabled={false}
                        />
                        <SelectInput
                            control={control}
                            name="qos"
                            label="QOS"
                            a_label="Select QOS"
                            options={[{ label: "QOS 0", value: 0 }, { label: "QOS 1", value: 1 },{ label: "QOS 2", value: 2 }]}
                            disabled={false}
                        />
                        <TextInput control={control} name={"interval"} label={"Time Interval"} placeholder={"Enter time interval in second"} type={"number"} disabled={false}/>
                        <Checkbox control={control} name="pubretainflag" label="Retain Flag" disabled={false}/>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={editSuccess}>
                            {editSuccess ? 'Updated' : 'Save Changes'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    )
}

export default MQTTPublish

