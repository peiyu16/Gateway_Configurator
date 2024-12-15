import React, {useEffect,useState} from 'react'
import axios from 'axios';
import { Form, Container, Button,Row,Col } from 'react-bootstrap'
import { useForm, Controller } from 'react-hook-form';
import Checkbox from '../formcomponents/Checkbox';
import TextInput from '../formcomponents/TextInput';
import SelectInput from '../formcomponents/SelectInput';
import { useNavigate, useLocation } from 'react-router-dom'; 


const MQTTSubscribeForm = () => {

    const [ loading, setLoading ] = useState(false);

    const { control, watch, handleSubmit, setValue } = useForm({
        defaultValues: {
            topic : "",
            enableExtract: false,
            topicExtract: "",
            bindingport:"",
            qos:""
        }
    });
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const source = queryParams.get('source');

    const endpoint =
        source === 'aws'
            ? 'http://raspberrypi.local:5000/api/awsiot/topics-subscribe-form'
            : 'http://raspberrypi.local:5000/api/mqtt/topics-subscribe-form';

   

    const onSubmit = async (data) => {
        
        setLoading(true);
        
        try {
            const response = await axios.post(endpoint, {
                topic: data.topic,
                enableExtract: data.enableExtract,
                topicExtract: data.topicExtract,
                bindingport: data.bindingport,
                qos: data.qos,
            });
            console.log('Saved Topic:', response.data);
            // Optionally redirect or show a success message
            alert('Topic added successfully!');
            navigate(-1);
        } catch (error) {
            console.error('Error saving topic:', error);
        } finally {
            setLoading(false);
        }
    };

    const [ports, setPorts] = useState([]);

    const fetchPorts = async () => {
        try {
            const response = await axios.get('http://raspberrypi.local:5000/api/serialports');
            const ports = response.data.ports.map(port => ({ label: port, value: port }));
            
            setPorts(ports);
            
        } catch (error) {
            console.error('Failed to fetch ports:', error);
        }
    };

    useEffect ( () => {
        fetchPorts();
    },[]);

    const enableExtract = watch('enableExtract');

    return (
        <div style={{ borderWidth: "2px", borderColor: "gray", borderStyle: "solid", padding: "10px", marginTop:"100px",marginLeft:"150px",marginRight:"150px" }}>
            <Row>
                <Col sm="2"></Col> 
                <Col sm="8"><h3 className='mt-4 mb-4 ms-4'>New Subscribe Topic</h3></Col>  
            </Row>
            {/* onSubmit={handleSubmit(onSubmit)} */}
            <Form className='mt-4 mb-4 ms-4 justify-content-center' onSubmit={handleSubmit(onSubmit)}> 
                <TextInput control={control} name="topic" label="Topic*" placeholder="Enter topic" disabled={false}/>
                <Checkbox control={control} name="enableExtract" label={"Enable Topic Extracting"} disabled={false}/>
                {enableExtract &&
                    <TextInput control={control} name={"topicExtract"} label={"Extracted Topic"} disabled={!enableExtract}/>
                }
                <SelectInput
                    control={control}
                    name="bindingport"
                    label="Binding Port*"
                    a_label="Select port"
                    options={ports}
                    disabled={false}
                />
                <SelectInput
                    control={control}
                    name="qos"
                    label="QOS*"
                    a_label="Select QOS"
                    options={[{ label: "QOS 0", value: 0 }, { label: "QOS 1", value: 1 },{ label: "QOS 2", value: 2 }]}
                    disabled={false}
                />
                
                <div className="d-flex justify-content-center mb-3">
                    <Button 
                        variant="primary" 
                        type="submit" 
                        className="me-2" 
                        style={{ width: '150px' }}
                    > 
                    {loading ? 
                    (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span className="sr-only">Loading...</span>
                    </>
                    ):
                    (
                      "Save" 
                    )}
                    </Button>
                    <Button variant="btn btn-outline-secondary" type="button" onClick={() => navigate(-1)} style={{ width: '150px' }}> Cancel </Button>
                </div>
            </Form>
        </div>
    )
}

export default MQTTSubscribeForm
