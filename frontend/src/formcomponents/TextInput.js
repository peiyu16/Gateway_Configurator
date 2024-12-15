// TextInput.js
import React from 'react';
import { Controller } from 'react-hook-form';
import { Form, Row, Col } from 'react-bootstrap';

const TextInput = ({ control, name, label, sm, placeholder, disabled,type }) => (
    <Form.Group as={Row} controlId={name} className="mb-4 mt-3">
        <Col sm="2"></Col>
        <Form.Label column sm = "3">
            {label}
        </Form.Label>
        <Col sm={sm || 5}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <Form.Control
                        type={type||"text"}
                        {...field}
                        placeholder={placeholder}
                        disabled={disabled}
                    />
                )}
            />
        </Col>
        <Col sm="2"></Col>
    </Form.Group>
);

export default TextInput;
