// Checkbox.js
import React from 'react';
import { Controller } from 'react-hook-form';
import { Form, Row, Col, Container } from 'react-bootstrap';

const Checkbox = ({ control, name, label, sm, disabled, checkstat }) => (
    <Form.Group as={Row} controlId={name} className="mb-4 mt-3">
        <Col sm="2"></Col>
        <Form.Label column sm="3">
            {label}
        </Form.Label>
        <Col sm={sm || 5}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <Form.Check
                        type="checkbox"
                        label=""
                        {...field}
                        checked={field.value || checkstat}
                        disabled={disabled}
                    />
                )}
            />
        </Col>
        <Col sm="2"></Col>
    </Form.Group>
);

export default Checkbox;
