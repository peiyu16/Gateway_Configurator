import React, { useState } from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';

const FileInput = ({ register, name, label, disabled }) => {
    const [file, setFile] = useState(""); // State to hold the file name for display

    // Handle file selection
    const handleFileChange = (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            setFile(files[0].name); // Set local state to the selected file name
        } else {
            setFile(""); // Clear file name from state when no file is selected
        }
    };

    // Clear the selected file
    const clearFile = () => {
        setFile("");
        document.getElementById(name).value = ""; // Reset the file input
    };

    return (
        <Form.Group as={Row} className="mb-3">
            <Col sm="2"></Col>
            <Form.Label column sm={3}>{label}</Form.Label>
            <Col sm={3}>
                <Form.Control
                    type="file"
                    {...register(name)}
                    id={name} // Add an id to reference the input for clearing
                    onChange={handleFileChange} // Handle file selection
                    disabled={disabled}
                />
            </Col>
            <Col sm={2}>
                <Button variant="outline-secondary" onClick={clearFile} disabled={!file}>
                    Remove
                </Button>
            </Col>
            <Col sm="2"></Col>
        </Form.Group>
    );
};

export default FileInput;
